package com.jackshiao.financial.service;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.jackshiao.financial.entity.Member;
import com.jackshiao.financial.entity.Role;
import com.jackshiao.financial.oauth2.CustomOidcUser;
import com.jackshiao.financial.repository.MemberRepository;
import com.jackshiao.financial.repository.RoleRepository;

import lombok.RequiredArgsConstructor;

/**
 * 處理 Google (OIDC) 登入流程，邏輯與 CustomOAuth2UserService 相同，
 * 但回傳的是 CustomOidcUser（繼承 DefaultOidcUser，Spring Security OIDC 流程所要求）。
 */
@Service
@RequiredArgsConstructor
public class CustomOidcUserService extends OidcUserService {

    private final MemberRepository memberRepository;
    private final RoleRepository roleRepository;

    @Override
    @Transactional
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = fetchOidcUser(userRequest);

        String provider = userRequest.getClientRegistration().getRegistrationId();
        String oauthId  = oidcUser.getSubject();              // Google 的唯一 ID (sub)
        String email    = oidcUser.getEmail();
        String name     = oidcUser.getFullName() != null ? oidcUser.getFullName() : email;

        Member member = memberRepository
                .findByOauthProviderAndOauthId(provider, oauthId)
                .orElseGet(() ->
                    memberRepository.findByEmail(email)
                        .map(existing -> {
                            existing.setOauthProvider(provider);
                            existing.setOauthId(oauthId);
                            return memberRepository.save(existing);
                        })
                        .orElseGet(() -> createNewMember(email, name, provider, oauthId))
                );

        Set<String> roles = member.getRoles().stream()
                .map(Role::getRoleName)
                .collect(Collectors.toSet());

        return new CustomOidcUser(
                member.getEmail(),
                member.getDisplayName(),
                roles,
                oidcUser.getIdToken(),
                oidcUser.getUserInfo());
    }

    /** 提取 super 呼叫，讓單元測試可透過 spy 覆寫此方法，避免真實 OIDC 網路請求 */
    protected OidcUser fetchOidcUser(OidcUserRequest userRequest) {
        return super.loadUser(userRequest);
    }

    private Member createNewMember(String email, String name, String provider, String oauthId) {
        Role role = roleRepository.findByRoleName("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("找不到預設角色 ROLE_USER"));

        Member member = Member.builder()
                .email(email)
                .passwordHash(null)
                .displayName(name)
                .oauthProvider(provider)
                .oauthId(oauthId)
                .createdAt(LocalDateTime.now())
                .build();

        member.getRoles().add(role);
        return memberRepository.save(member);
    }
}
