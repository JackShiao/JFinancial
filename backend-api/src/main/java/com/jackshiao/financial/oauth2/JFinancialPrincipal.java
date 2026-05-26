package com.jackshiao.financial.oauth2;

import java.util.Set;

/**
 * 共用介面，讓 OAuth2SuccessHandler 統一處理
 * Google (OIDC / CustomOidcUser) 和 GitHub (OAuth2 / CustomOAuth2User)，
 * 不需要個別判斷 Principal 型別。
 */
public interface JFinancialPrincipal {
    String getEmail();
    String getDisplayName();
    Set<String> getRoles();
}
