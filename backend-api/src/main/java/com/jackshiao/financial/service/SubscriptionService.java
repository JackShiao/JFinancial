package com.jackshiao.financial.service;

import java.util.List;
import java.util.Map;

import com.jackshiao.financial.dto.CheckoutResponseDto;
import com.jackshiao.financial.dto.SubscriptionPlanDto;
import com.jackshiao.financial.dto.SubscriptionStatusDto;

public interface SubscriptionService {

    /** 取得所有訂閱方案 */
    List<SubscriptionPlanDto> getPlans();

    /**
     * 建立 ECPay 付款訂單，回傳含 HTML form 的結帳資訊
     *
     * @param memberId 會員 ID
     * @param planCode 方案代碼（MONTHLY / ANNUAL）
     */
    CheckoutResponseDto createCheckout(Integer memberId, String planCode);

    /**
     * 處理 ECPay Server-to-Server 付款結果通知
     *
     * @param params ECPay 回傳的所有 form 參數
     * @return "1|OK" 或 "0|ErrorMsg"
     */
    String handleEcpayNotify(Map<String, String> params);

    /** 查詢會員當前的訂閱狀態 */
    SubscriptionStatusDto getSubscriptionStatus(Integer memberId);
}
