package com.jackshiao.financial.service.impl;

import java.security.SecureRandom;
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

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

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

        // 產生唯一 MerchantTradeNo
        String tradeNo = generateTradeNo();

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

        log.info("[ECPay Checkout] tradeNo={}, ReturnURL={}, OrderResultURL={}",
                tradeNo, params.get("ReturnURL"), params.get("OrderResultURL"));

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
            String tradeNo = params.get("MerchantTradeNo");
            if (!"1".equals(rtnCode)) {
                log.info("[ECPay Notify] 付款未成功. RtnCode={}, RtnMsg={}", rtnCode, params.get("RtnMsg"));
                paymentOrderRepository.findByMerchantTradeNo(tradeNo).ifPresent(failedOrder -> {
                    if (failedOrder.getStatus() == PaymentStatus.PENDING) {
                        failedOrder.setStatus(PaymentStatus.FAILED);
                        paymentOrderRepository.save(failedOrder);
                    }
                });
                return "0|Payment Not Success";
            }

            // 3. 找到對應的訂單（加 PESSIMISTIC_WRITE 鎖，防止並發重複入帳）
            PaymentOrder order = paymentOrderRepository.findByMerchantTradeNoForUpdate(tradeNo)
                    .orElseThrow(() -> new IllegalStateException("找不到訂單: " + tradeNo));

            if (order.getStatus() == PaymentStatus.PAID) {
                // 重複通知，忽略
                return "1|OK";
            }

            // 3.5 核對 MerchantID 與金額，防止資料不一致或惡意偽造
            String notifyMerchantId = params.get("MerchantID");
            if (!merchantId.equals(notifyMerchantId)) {
                log.warn("[ECPay Notify] MerchantID 不符. expected={}, received={}", merchantId, notifyMerchantId);
                return "0|MerchantID Mismatch";
            }
            try {
                int notifyAmt = Integer.parseInt(params.get("TradeAmt"));
                if (notifyAmt != order.getAmount()) {
                    log.warn("[ECPay Notify] 金額不符. tradeNo={}, expected={}, received={}",
                            tradeNo, order.getAmount(), notifyAmt);
                    return "0|Amount Mismatch";
                }
            } catch (NumberFormatException e) {
                log.warn("[ECPay Notify] TradeAmt 格式錯誤: {}", params.get("TradeAmt"));
                return "0|Amount Format Error";
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

    /**
     * 產生符合 ECPay 限制（≤ 20 字元）且保證唯一的 MerchantTradeNo。
     * 格式：JF + 毫秒時間戳後 10 碼 + 8 碼隨機 hex = 共 20 碼。
     * 以毫秒精度大幅降低碰撞機率，SecureRandom 後綴處理同毫秒並發。
     */
    private String generateTradeNo() {
        String ms = String.format("%013d", System.currentTimeMillis()).substring(3); // 後 10 碼
        String rand = String.format("%08X", SECURE_RANDOM.nextInt(Integer.MAX_VALUE)); // 8 碼 hex
        return "JF" + ms + rand; // 2 + 10 + 8 = 20 碼
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
                .append("' value='").append(escapeHtmlAttr(v)).append("'/>"));
        sb.append("</form>");
        return sb.toString();
    }

    /**
     * 對 HTML attribute value 做完整跳脫，防止特殊字元破壞 HTML 結構或造成注入。
     * & 必須最先替換，避免後續替換產生的 & 再次被編碼。
     */
    private static String escapeHtmlAttr(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
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
                        boolean stillActive = existing.getExpireAt().isAfter(now);
                        LocalDateTime base = stillActive ? existing.getExpireAt() : now;
                        existing.setPlan(plan);                       // 同步更新為本次購買的方案
                        existing.setExpireAt(base.plusDays(plan.getDurationDays()));
                        if (!stillActive) {
                            existing.setStartAt(now);                 // 已過期：重置起算時間
                        }
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
