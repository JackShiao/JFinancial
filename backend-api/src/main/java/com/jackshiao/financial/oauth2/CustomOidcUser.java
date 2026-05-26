package com.jackshiao.financial.oauth2;

import java.util.Collection;
import java.util.Set;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.OidcUserInfo;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;

import lombok.Getter;

/**
 * Google OIDC 登入用的自訂 Principal。
 * 繼承 DefaultOidcUser（滿足 Spring Security 對 OidcUser 的要求），
 * 同時實作 JFinancialPrincipal，讓 OAuth2SuccessHandler 可統一處理。
 */
@Getter
public class CustomOidcUser extends DefaultOidcUser implements JFinancialPrincipal {

    private final String email;
    private final String displayName;
    private final Set<String> roles;

    public CustomOidcUser(String email, String displayName, Set<String> roles,
                          OidcIdToken idToken, OidcUserInfo userInfo) {
        super(
            roles.stream().map(SimpleGrantedAuthority::new).toList(),
            idToken,
            userInfo
        );
        this.email = email;
        this.displayName = displayName;
        this.roles = roles;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream().map(SimpleGrantedAuthority::new).toList();
    }
}
