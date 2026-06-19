package com.jackshiao.financial.oauth2;

import java.util.Base64;
import java.util.Optional;

import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.SerializationUtils;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * 將 OAuth2 授權請求（含 state 和 PKCE code_verifier）存入 HttpOnly Cookie，
 * 取代預設的 HttpSessionOAuth2AuthorizationRequestRepository。
 *
 * 這樣 SecurityConfig 的 SessionCreationPolicy.STATELESS 才不會破壞 OAuth2 流程：
 * 授權發起與回調是兩次不同的 HTTP 請求，必須在之間持久化授權請求物件。
 */
@Component
public class CookieOAuth2AuthorizationRequestRepository
        implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    private static final String COOKIE_NAME    = "oauth2_auth_request";
    private static final int    COOKIE_MAX_AGE = 180; // 3 分鐘，授權流程應在此內完成

    // ── AuthorizationRequestRepository 介面實作 ───────────────────────

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        return getCookieValue(request, COOKIE_NAME)
                .map(this::deserialize)
                .orElse(null);
    }

    @Override
    public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest,
            HttpServletRequest request, HttpServletResponse response) {

        if (authorizationRequest == null) {
            deleteCookie(response, COOKIE_NAME);
            return;
        }

        Cookie cookie = new Cookie(COOKIE_NAME, serialize(authorizationRequest));
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(COOKIE_MAX_AGE);
        cookie.setSecure(true);              // 僅 HTTPS 傳送（Cloud Run 生產環境）
        cookie.setAttribute("SameSite", "Lax"); // Lax 允許 GitHub/Google redirect 時攜帶 cookie
        response.addCookie(cookie);
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(
            HttpServletRequest request, HttpServletResponse response) {

        OAuth2AuthorizationRequest authRequest = loadAuthorizationRequest(request);
        if (authRequest != null) {
            deleteCookie(response, COOKIE_NAME);
        }
        return authRequest;
    }

    // ── 工具方法 ─────────────────────────────────────────────────────

    @SuppressWarnings("deprecation")
    private String serialize(OAuth2AuthorizationRequest authorizationRequest) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(
                SerializationUtils.serialize(authorizationRequest));
    }

    @SuppressWarnings({"deprecation", "unchecked"})
    private OAuth2AuthorizationRequest deserialize(String value) {
        try {
            return (OAuth2AuthorizationRequest) SerializationUtils.deserialize(
                    Base64.getUrlDecoder().decode(value));
        } catch (Exception e) {
            return null;
        }
    }

    private Optional<String> getCookieValue(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return Optional.empty();
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return Optional.of(cookie.getValue());
            }
        }
        return Optional.empty();
    }

    private void deleteCookie(HttpServletResponse response, String name) {
        Cookie cookie = new Cookie(name, "");
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setHttpOnly(true);
        response.addCookie(cookie);
    }
}
