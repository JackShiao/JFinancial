package com.jackshiao.financial.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jackshiao.financial.common.ApiResponse;
import com.jackshiao.financial.common.ResourceNotFoundException;
import com.jackshiao.financial.dto.CheckoutResponseDto;
import com.jackshiao.financial.dto.SubscriptionPlanDto;
import com.jackshiao.financial.dto.SubscriptionStatusDto;
import com.jackshiao.financial.entity.Member;
import com.jackshiao.financial.repository.MemberRepository;
import com.jackshiao.financial.service.SubscriptionService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/subscription")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final MemberRepository memberRepository;

    /** 公開端點：取得所有訂閱方案 */
    @GetMapping("/plans")
    public ApiResponse<List<SubscriptionPlanDto>> getPlans() {
        return ApiResponse.success(subscriptionService.getPlans());
    }

    // [需要驗證] 建立付款訂單，回傳 ECPay HTML form
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/checkout")
    public ApiResponse<CheckoutResponseDto> checkout(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody CheckoutRequest request) {

        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("找不到會員"));
        CheckoutResponseDto response = subscriptionService.createCheckout(member.getId(), request.getPlanCode());
        return ApiResponse.success(response, "結帳訂單已建立");
    }

    // [需要驗證] 查詢當前訂閱狀態
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/status")
    public ApiResponse<SubscriptionStatusDto> getStatus(@AuthenticationPrincipal String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("找不到會員"));
        return ApiResponse.success(subscriptionService.getSubscriptionStatus(member.getId()));
    }

    /** 內部 Request DTO（僅此 Controller 使用，不另建檔案） */
    @Data
    static class CheckoutRequest {
        @NotBlank(message = "planCode 不可為空")
        private String planCode;
    }
}
