package com.jackshiao.financial.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 結帳回應 DTO
 * <p>
 * {@code formHtml} 為完整的 HTML {@code <form>} 標籤，前端收到後
 * 直接插入 DOM 並呼叫 {@code form.submit()} 即可自動跳轉至 ECPay 付款頁。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutResponseDto {

    private String merchantTradeNo;
    private String formHtml;
}
