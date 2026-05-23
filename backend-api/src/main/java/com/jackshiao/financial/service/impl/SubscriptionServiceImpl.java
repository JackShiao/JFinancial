package com.jackshiao.financial.service.impl;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.jackshiao.financial.dto.CheckoutResponseDto;
import com.jackshiao.financial.dto.SubscriptionPlanDto;
import com.jackshiao.financial.dto.SubscriptionStatusDto;
import com.jackshiao.financial.entity.Member;
import com.jackshiao.financial.entity.MemberSubscription;
import com.jackshiao.financial.entity.PaymentOrder;
import com.jackshiao.financial.entity.Role;
import com.jackshiao.financial.entity.SubscriptionPlan;
import com.jackshiao.financial.entity.enums.PaymentStatus;
import com.jackshiao.financial.entity.enums.SubscriptionStatus;
import com.jackshiao.financial.repository.MemberRepository;
import com.jackshiao.financial.repository.MemberSubscriptionRepository;
import com.jackshiao.financial.repository.PaymentOrderRepository;
import com.jackshiao.financial.repository.RoleRepository;
import com.jackshiao.financial.repository.SubscriptionPlanRepository;
import com.jackshiao.financial.service.SubscriptionService;
import com.jackshiao.financial.util.EcpayUtil;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionServiceImpl implements SubscriptionService {

    private final SubscriptionPlanRepository planRepository;
    private final MemberSubscriptionRepository subscriptionRepository;
    private final PaymentOrderRepository paymentOrderRepository;
    private final MemberRepository memberRepository;
    private final RoleRepository roleRepository;

    @Value("${ecpay.merchant-id}")
    private String merchantId;

    @Value("${ecpay.hash-key}")
    private String hashKey;

    @Value("${ecpay.hash-iv}")
    private String hashIv;

    @Value("${ecpay.checkout-url}")
    private String checkoutUrl;

    @Value("${ecpay.return-url}")
    private String returnUrl;

    @Value("${ecpay.notify-url}")
    private String notifyUrl;


    // ─────────────────────────────────────────────
    // 公開方法
    // ─────────────────────────────────────────────

    @Override
    public List<SubscriptionPlanDto> getPlans() {
        return planRepository.findAll().stream()
                .map(p -> new SubscriptionPlanDto(
                        p.getId(), p.getCode(), p.getName(), p.getPriceTwd(), p.getDurationDays()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CheckoutResponseDto createCheckout(Integer memberId, String planCode) {
        SubscriptionPlan plan = planRepository.findByCode(planCode)
                .orElseThrow(() -> new IllegalArgumentException("找不到方案: " + planCode));

        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalStateException("找不到會員: " + memberId));

        // 產生唯一 MerchantTradeNo：JF{yyyyMMddHHmmss}{memberId}，最長 20 字元
        String tradeNo = generateTradeNo(memberId);

        // 建立 PENDING 付款訂單
        PaymentOrder order = PaymentOrder.builder()
                .member(member)
                .plan(plan)
                .merchantTradeNo(tradeNo)
                .amount(plan.getPriceTwd())
                .status(PaymentStatus.PENDING)
                .build();
        paymentOrderRepository.save(order);

        // 組裝 ECPay 表單參數
        Map<String, String> params = buildEcpayParams(tradeNo, plan);
        String checkMacValue = EcpayUtil.buildCheckMacValue(params, hashKey, hashIv);
        params.put("CheckMacValue", checkMacValue);

        // 產生自動提交的 HTML form
        String formHtml = buildFormHtml(params);
        return new CheckoutResponseDto(tradeNo, formHtml);
    }

    @Override
    @Transactional
    public String handleEcpayNotify(Map<String, String> params) {
        try {
            // 1. 取出 CheckMacValue 並從參數中移除，再重新計算驗證
            String receivedMac = params.get("CheckMacValue");
            Map<String, String> paramsWithoutMac = new HashMap<>(params);
            paramsWithoutMac.remove("CheckMacValue");

            String expectedMac = EcpayUtil.buildCheckMacValue(paramsWithoutMac, hashKey, hashIv);
            if (!expectedMac.equalsIgnoreCase(receivedMac)) {
                log.warn("[ECPay Notify] CheckMacValue 驗證失敗. received={}, expected={}", receivedMac, expectedMac);
                return "0|CheckMacValue Error";
            }

            // 2. 確認付款結果
            String rtnCode = params.get("RtnCode");
            if (!"1".equals(rtnCode)) {
                log.info("[ECPay Notify] 付款未成功. RtnCode={}, RtnMsg={}", rtnCode, params.get("RtnMsg"));
                return "0|Payment Not Success";
            }

            // 3. 找到對應的訂單
            String tradeNo = params.get("MerchantTradeNo");
            PaymentOrder order = paymentOrderRepository.findByMerchantTradeNo(tradeNo)
                    .orElseThrow(() -> new IllegalStateException("找不到訂單: " + tradeNo));

            if (order.getStatus() == PaymentStatus.PAID) {
                // 重複通知，忽略
                return "1|OK";
            }

            // 4. 更新訂單狀態
            order.setStatus(PaymentStatus.PAID);
            order.setPaidAt(LocalDateTime.now());
            paymentOrderRepository.save(order);

            // 5. 更新或延長會員訂閱
            grantOrExtendSubscription(order.getMember(), order.getPlan());

            // 6. 授予 ROLE_PREMIUM
            grantPremiumRole(order.getMember());

            log.info("[ECPay Notify] 付款成功. memberId={}, tradeNo={}", order.getMember().getId(), tradeNo);
            return "1|OK";

        } catch (Exception e) {
            log.error("[ECPay Notify] 處理異常", e);
            return "0|System Error";
        }
    }

    @Override
    public SubscriptionStatusDto getSubscriptionStatus(Integer memberId) {
        return subscriptionRepository
                .findTopByMemberIdAndStatusOrderByExpireAtDesc(memberId, SubscriptionStatus.ACTIVE)
                .map(sub -> {
                    boolean stillActive = sub.getExpireAt().isAfter(LocalDateTime.now());
                    if (stillActive) {
                        return new SubscriptionStatusDto(true, sub.getPlan().getName(), sub.getExpireAt());
                    }
                    return new SubscriptionStatusDto(false, null, null);
                })
                .orElse(new SubscriptionStatusDto(false, null, null));
    }

    // ─────────────────────────────────────────────
    // 私有輔助方法
    // ─────────────────────────────────────────────

    private String generateTradeNo(Integer memberId) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String tradeNo = "JF" + timestamp + memberId;
        // 確保不超過 20 字元（ECPay 限制）
        return tradeNo.length() > 20 ? tradeNo.substring(0, 20) : tradeNo;
    }

    private Map<String, String> buildEcpayParams(String tradeNo, SubscriptionPlan plan) {
        String tradeDate = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss"));
        Map<String, String> params = new HashMap<>();
        params.put("MerchantID", merchantId);
        params.put("MerchantTradeNo", tradeNo);
        params.put("MerchantTradeDate", tradeDate);
        params.put("PaymentType", "aio");
        params.put("TotalAmount", String.valueOf(plan.getPriceTwd()));
        params.put("TradeDesc", "JFinancial Premium 訂閱");
        params.put("ItemName", plan.getName());
        params.put("ReturnURL", notifyUrl);    // Server-to-Server 回呼
        params.put("OrderResultURL", returnUrl); // 前端同步跳轉
        params.put("ChoosePayment", "Credit");
        params.put("EncryptType", "1");
        return params;
    }

    /**
     * 組裝自動提交的 HTML form，前端插入 DOM 後直接呼叫 submit()
     */
    private String buildFormHtml(Map<String, String> params) {
        StringBuilder sb = new StringBuilder();
        sb.append("<form id='ecpay-form' method='POST' action='").append(checkoutUrl).append("'>");
        params.forEach((k, v) -> sb.append("<input type='hidden' name='").append(k)
                .append("' value='").append(v.replace("'", "&#39;")).append("'/>"));
        sb.append("</form>");
        return sb.toString();
    }

    /**
     * 新增或延長會員訂閱：
     * - 若現有 ACTIVE 訂閱尚未到期，則從 expireAt 延長
     * - 否則，從現在起開始計算
     */
    private void grantOrExtendSubscription(Member member, SubscriptionPlan plan) {
        LocalDateTime now = LocalDateTime.now();

        subscriptionRepository
                .findTopByMemberIdAndStatusOrderByExpireAtDesc(member.getId(), SubscriptionStatus.ACTIVE)
                .ifPresentOrElse(
                    existing -> {
                        LocalDateTime base = existing.getExpireAt().isAfter(now)
                                ? existing.getExpireAt() : now;
                        existing.setExpireAt(base.plusDays(plan.getDurationDays()));
                        subscriptionRepository.save(existing);
                    },
                    () -> {
                        MemberSubscription newSub = MemberSubscription.builder()
                                .member(member)
                                .plan(plan)
                                .status(SubscriptionStatus.ACTIVE)
                                .startAt(now)
                                .expireAt(now.plusDays(plan.getDurationDays()))
                                .build();
                        subscriptionRepository.save(newSub);
                    }
                );
    }

    /** 若會員尚未擁有 ROLE_PREMIUM，則授予 */
    private void grantPremiumRole(Member member) {
        boolean alreadyPremium = member.getRoles().stream()
                .anyMatch(r -> "ROLE_PREMIUM".equals(r.getRoleName()));
        if (!alreadyPremium) {
            Role premiumRole = roleRepository.findByRoleName("ROLE_PREMIUM")
                    .orElseThrow(() -> new IllegalStateException("ROLE_PREMIUM 不存在於資料庫"));
            member.getRoles().add(premiumRole);
            memberRepository.save(member);
        }
    }
}
