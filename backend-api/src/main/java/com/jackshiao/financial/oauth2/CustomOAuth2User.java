package com.jackshiao.financial.oauth2;

import java.util.Collection;
import java.util.Map;
import java.util.Set;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

import lombok.Getter;

/**
 * 自訂 OAuth2 Principal，攜帶本地 Member 資料，
 * 讓 OAuth2SuccessHandler 直接取用，不需再查資料庫。
 */
@Getter
public class CustomOAuth2User implements OAuth2User, JFinancialPrincipal {

    private final String email;
    private final String displayName;
    private final Set<String> roles;
    private final Map<String, Object> attributes;
    private final Collection<? extends GrantedAuthority> authorities;

    public CustomOAuth2User(String email, String displayName,
                            Set<String> roles, Map<String, Object> attributes) {
        this.email = email;
        this.displayName = displayName;
        this.roles = roles;
        this.attributes = attributes;
        this.authorities = roles.stream()
                .map(SimpleGrantedAuthority::new)
                .toList();
    }

    @Override
    public String getName() {
        return email;
    }
}
