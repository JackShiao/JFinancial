package com.jackshiao.financial.controller;

import java.net.URI;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import com.jackshiao.financial.service.SubscriptionService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * ECPay 付款回呼 Controller
 *
 * 兩個端點均透過 {@code WebSecurityCustomizer#web.ignoring()} 完全繞過 Spring Security
 * FilterChain（非 permitAll），不經過 CORS、CSRF、JwtAuthFilter。
 *
 * /ecpay/return  : ReturnURL，使用者瀏覽器被 ECPay POST 回來，後端 302 redirect 到前端 SPA。
 *       【注意】此端點未驗簽，任何人均可直接呼叫；請勿在此執行任何訂單狀態變更。
 * /ecpay/notify  : NotifyURL，ECPay Server-to-Server 通知，已實作 CheckMacValue 驗簽，
 *       驗簽通過後才執行訂單狀態更新，回應純文字 "1|OK"。
 */
@Slf4j
@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentCallbackController {

    private final SubscriptionService subscriptionService;

    @Value("${ecpay.frontend-result-url}")
    private String frontendResultUrl;

    /**
     * ECPay ReturnURL（使用者瀏覽器跳回）
     * ECPay 以 POST form 傳送付款結果，後端解析後 302 redirect 到前端 SPA（GET）
     */
    @PostMapping(value = "/ecpay/return",
                 consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Void> handleEcpayReturn(@RequestParam Map<String, String> params) {
        String rtnCode = params.getOrDefault("RtnCode", "");
        String rtnMsg  = params.getOrDefault("RtnMsg", "交易失敗");
        log.info("[ECPay Return] RtnCode={}, RtnMsg={}", rtnCode, rtnMsg);

        URI redirectUri = UriComponentsBuilder.fromUriString(frontendResultUrl)
                .queryParam("RtnCode", rtnCode)
                .queryParam("RtnMsg", rtnMsg)
                .encode()
                .build()
                .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(redirectUri);
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    /**
     * ECPay NotifyURL（Server-to-Server 付款結果通知）
     * Content-Type: application/x-www-form-urlencoded，回應純文字 "1|OK" 或 "0|ErrorMsg"
     */
    @PostMapping(value = "/ecpay/notify",
                 consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public String handleEcpayNotify(@RequestParam Map<String, String> params) {
        log.info("[ECPay Notify] 收到回呼, MerchantTradeNo={}, RtnCode={}, all={}",
                params.get("MerchantTradeNo"), params.get("RtnCode"), params);
        return subscriptionService.handleEcpayNotify(params);
    }
}
