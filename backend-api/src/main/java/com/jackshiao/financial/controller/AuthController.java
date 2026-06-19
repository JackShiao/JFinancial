package com.jackshiao.financial.controller;

import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jackshiao.financial.common.ApiResponse;

import jakarta.servlet.http.HttpServletResponse;
import com.jackshiao.financial.dto.LoginRequest;
import com.jackshiao.financial.dto.LoginResponse;
import com.jackshiao.financial.dto.MeResponse;
import com.jackshiao.financial.dto.RegisterRequest;
import com.jackshiao.financial.service.AuthService;
import com.jackshiao.financial.service.MemberService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final MemberService memberService;

    /**
     * 給 OAuth2 Cookie 登入的使用者：頁面重整後呼叫此端點確認身份。
     * JwtAuthFilter 會從 Cookie 讀取 JWT 並設定 SecurityContext，
     * 這裡直接從 principal 取出 email 再查 DB 確認 Premium 狀態與顯示名稱。
     * 若未登入，Spring Security 會自動回傳 401。
     */
    @GetMapping("/me")
    public ApiResponse<MeResponse> me(@AuthenticationPrincipal String email) {
        boolean isPremium = memberService.isActivePremium(email);
        String displayName = memberService.getDisplayName(email);
        return ApiResponse.success(new MeResponse(email, displayName, isPremium), "success");
    }

    @PostMapping("/register")
    public ApiResponse<Void> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ApiResponse.success(null, "註冊成功");
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ApiResponse.success(response, "登入成功");
    }

    /**
     * 登出：清除 HttpOnly Cookie（針對 OAuth2 登入的使用者）。
     * 一般帳密登入的使用者前端直接清除 localStorage，無需呼叫此端點；
     * 但呼叫也無害，可統一由前端 logout() 一律呼叫。
     */
    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletResponse response) {
        ResponseCookie expiredCookie = ResponseCookie.from("access_token", "")
                .httpOnly(true)
                .secure(false)      // 正式環境改為 true
                .sameSite("Lax")
                .path("/")
                .maxAge(0)          // maxAge=0 立即使 Cookie 過期
                .build();
        response.addHeader("Set-Cookie", expiredCookie.toString());
        return ApiResponse.success(null, "已登出");
    }
}

