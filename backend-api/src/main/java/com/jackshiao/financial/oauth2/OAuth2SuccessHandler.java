package com.jackshiao.financial.oauth2;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import com.jackshiao.financial.service.JwtService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

/**
 * OAuth2 登入成功後，從 CustomOAuth2User Principal 取得會員資訊，
 * 產生 JWT 並重導回前端 /oauth2/callback 頁面。
 */
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService jwtService;

    @Value("${frontend.base-url}")
    private String frontendBaseUrl;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException {

        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;

        // 無論是 Google (CustomOidcUser) 或 GitHub (CustomOAuth2User)，
        // 兩者都實作 JFinancialPrincipal，統一從介面取值
        JFinancialPrincipal principal = (JFinancialPrincipal) oauthToken.getPrincipal();

        String token = jwtService.generateToken(
                principal.getEmail(),
                principal.getDisplayName(),
                principal.getRoles());

        // 將 JWT 存入 HttpOnly Cookie，JS 無法讀取，防止 XSS 竊取 token
        ResponseCookie cookie = ResponseCookie.from("access_token", token)
                .httpOnly(true)
                .secure(false)          // 正式環境改為 true（HTTPS）
                .sameSite("Lax")        // Lax 允許從第三方 redirect 帶入 cookie
                .path("/")
                .maxAge(86400)          // 與 JWT 有效期一致（24 小時）
                .build();
        response.addHeader("Set-Cookie", cookie.toString());

        // URL 只帶顯示用資訊（無 token），中文須 percent-encoding 避免 Tomcat 拒絕 Location header
        String redirectUrl = UriComponentsBuilder
                .fromUriString(frontendBaseUrl + "/oauth2/callback")
                .queryParam("displayName", principal.getDisplayName())
                .queryParam("email", principal.getEmail())
                .build()
                .encode()
                .toUriString();

        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}
