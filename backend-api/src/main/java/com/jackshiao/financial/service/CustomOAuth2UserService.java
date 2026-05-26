package com.jackshiao.financial.service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.jackshiao.financial.entity.Member;
import com.jackshiao.financial.entity.Role;
import com.jackshiao.financial.oauth2.CustomOAuth2User;
import com.jackshiao.financial.repository.MemberRepository;
import com.jackshiao.financial.repository.RoleRepository;

import lombok.RequiredArgsConstructor;

/**
 * OAuth2 登入時由 Spring Security 呼叫此 Service，負責：
 * 1. 向 Provider 取得使用者資料（由父類完成）
 * 2. 根據 provider + providerId 找/建立本地 Member
 * 3. 若已有相同 email 的本地帳號，自動綁定 OAuth 資訊
 */
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final MemberRepository memberRepository;
    private final RoleRepository roleRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String provider = userRequest.getClientRegistration().getRegistrationId(); // "google" or "github"
        Map<String, Object> attributes = oAuth2User.getAttributes();

        String oauthId   = extractOauthId(provider, attributes);
        String email     = extractEmail(provider, attributes);
        String name      = extractName(provider, attributes);

        // 1. 先用 provider + oauthId 找現有 OAuth 帳號
        Member member = memberRepository
                .findByOauthProviderAndOauthId(provider, oauthId)
                .orElseGet(() -> {
                    // 2. 找看看有沒有同 email 的本地帳號（自動綁定）
                    return memberRepository.findByEmail(email)
                            .map(existing -> {
                                existing.setOauthProvider(provider);
                                existing.setOauthId(oauthId);
                                return memberRepository.save(existing);
                            })
                            // 3. 全新帳號，建立 Member
                            .orElseGet(() -> createNewMember(email, name, provider, oauthId));
                });

        // 將 member 資訊包進自訂 Principal，Success Handler 直接取用，不需再查 DB
        Set<String> roles = member.getRoles().stream()
                .map(Role::getRoleName)
                .collect(Collectors.toSet());

        return new CustomOAuth2User(member.getEmail(), member.getDisplayName(), roles, attributes);
    }

    private Member createNewMember(String email, String name, String provider, String oauthId) {
        Role role = roleRepository.findByRoleName("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("找不到預設角色 ROLE_USER"));

        Member member = Member.builder()
                .email(email)
                .passwordHash(null)          // OAuth 用戶不需要密碼
                .displayName(name)
                .oauthProvider(provider)
                .oauthId(oauthId)
                .createdAt(LocalDateTime.now())
                .build();

        member.getRoles().add(role);
        return memberRepository.save(member);
    }

    // ── Provider 差異抹平 ─────────────────────────────────────────

    private String extractOauthId(String provider, Map<String, Object> attrs) {
        return switch (provider) {
            case "google" -> String.valueOf(attrs.get("sub"));
            case "github" -> String.valueOf(attrs.get("id"));
            default -> throw new OAuth2AuthenticationException(
                    new OAuth2Error("unsupported_provider", "不支援的登入來源：" + provider, null));
        };
    }

    private String extractEmail(String provider, Map<String, Object> attrs) {
        return switch (provider) {
            case "google" -> (String) attrs.get("email");
            case "github" -> {
                // GitHub 用戶可能未公開 email，此時 email 為 null
                Object raw = attrs.get("email");
                yield raw != null ? (String) raw : extractGithubFallbackEmail(attrs);
            }
            default -> throw new OAuth2AuthenticationException(
                    new OAuth2Error("unsupported_provider", "不支援的登入來源：" + provider, null));
        };
    }

    private String extractName(String provider, Map<String, Object> attrs) {
        return switch (provider) {
            case "google" -> (String) attrs.get("name");
            case "github" -> {
                Object name = attrs.get("name");
                Object login = attrs.get("login");
                yield name != null ? (String) name : (String) login;
            }
            default -> "";
        };
    }

    /** GitHub 用戶未公開 email 時，用 noreply 格式作為備援（不會重複） */
    private String extractGithubFallbackEmail(Map<String, Object> attrs) {
        Object id    = attrs.get("id");
        Object login = attrs.get("login");
        return id + "+" + login + "@users.noreply.github.com";
    }
}
