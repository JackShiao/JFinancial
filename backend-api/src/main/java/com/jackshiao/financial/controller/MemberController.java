package com.jackshiao.financial.controller;

import com.jackshiao.financial.common.ApiResponse;
import com.jackshiao.financial.dto.ChangePasswordRequest;
import com.jackshiao.financial.dto.UpdateDisplayNameRequest;
import com.jackshiao.financial.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/member")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    // [需要驗證] 更新目前登入者的顯示名稱
    @PreAuthorize("isAuthenticated()")
    @PutMapping("/profile")
    public ApiResponse<Map<String, String>> updateDisplayName(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody UpdateDisplayNameRequest request) {

        Map<String, String> result = memberService.updateDisplayName(email, request);
        return ApiResponse.success(result, "顯示名稱已更新");
    }

    // [需要驗證] 刪除目前登入者的帳號
    @PreAuthorize("isAuthenticated()")
    @DeleteMapping("/profile")
    public ApiResponse<Void> deleteAccount(@AuthenticationPrincipal String email) {
        memberService.deleteAccount(email);
        return ApiResponse.success(null, "帳號已成功刪除");
    }

    // [需要驗證] 修改密碼
    @PreAuthorize("isAuthenticated()")
    @PutMapping("/password")
    public ApiResponse<Void> changePassword(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody ChangePasswordRequest request) {

        memberService.changePassword(email, request);
        return ApiResponse.success(null, "密碼已成功更新");
    }
}
