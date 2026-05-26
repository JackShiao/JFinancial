package com.jackshiao.financial.service;

import java.time.Instant;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.lenient;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import com.jackshiao.financial.entity.Member;
import com.jackshiao.financial.entity.Role;
import com.jackshiao.financial.oauth2.CustomOidcUser;
import com.jackshiao.financial.repository.MemberRepository;
import com.jackshiao.financial.repository.RoleRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * CustomOidcUserService 單元測試
 *
 * 覆蓋三條 loadUser 路徑：
 *   A. 已存在 OAuth 帳號（provider + oauthId 找到）
 *   B. 已存在本地 email 帳號 → 自動綁定 OAuth
 *   C. 全新使用者 → 建立新帳號
 *
 * 以及異常情境：
 *   D. 資料庫中找不到 ROLE_USER
 */
@ExtendWith(MockitoExtension.class)
class CustomOidcUserServiceTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private RoleRepository roleRepository;

    // 不使用 @InjectMocks 是因為 CustomOidcUserService 繼承 OidcUserService，
    // super.loadUser() 需要 stub，改為在 @BeforeEach 建立 spy
    private CustomOidcUserService service;

    private static final String PROVIDER   = "google";
    private static final String OAUTH_ID   = "google-sub-123";
    private static final String EMAIL      = "test@example.com";
    private static final String FULL_NAME  = "測試用戶";

    private OidcUserRequest userRequest;
    private OidcUser        oidcUser;

    @BeforeEach
    void setUp() {
        service = spy(new CustomOidcUserService(memberRepository, roleRepository));

        // 建立最小化的 ClientRegistration（避免實際 HTTP 呼叫）
        ClientRegistration clientRegistration = ClientRegistration
                .withRegistrationId(PROVIDER)
                .clientId("client-id")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .authorizationUri("https://accounts.google.com/o/oauth2/auth")
                .tokenUri("https://oauth2.googleapis.com/token")
                .build();

        OAuth2AccessToken accessToken = new OAuth2AccessToken(
                OAuth2AccessToken.TokenType.BEARER, "mock-token",
                Instant.now(), Instant.now().plusSeconds(3600));

        OidcIdToken idToken = new OidcIdToken(
                "mock-id-token",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Map.of("sub", OAUTH_ID, "email", EMAIL, "name", FULL_NAME));

        userRequest = new OidcUserRequest(clientRegistration, accessToken, idToken);

        // 只 stub fetchOidcUser()，讓 loadUser() 本體正常執行（才能真正測試三條路徑）
        oidcUser = mock(OidcUser.class);
        doReturn(oidcUser).when(service).fetchOidcUser(userRequest);
        when(oidcUser.getSubject()).thenReturn(OAUTH_ID);
        when(oidcUser.getEmail()).thenReturn(EMAIL);
        when(oidcUser.getFullName()).thenReturn(FULL_NAME);
        // getIdToken / getUserInfo 只在成功路徑才會用到，異常路徑不會到達 new CustomOidcUser(...)
        lenient().when(oidcUser.getIdToken()).thenReturn(idToken);
        lenient().when(oidcUser.getUserInfo()).thenReturn(null);
    }

    // ── 路徑 A ─────────────────────────────────────────────────────

    @Test
    @DisplayName("路徑 A：已存在 OAuth 帳號，直接回傳，不呼叫 save()")
    void loadUser_existingOAuthAccount_returnsWithoutSaving() {
        Member existing = buildMember();
        when(memberRepository.findByOauthProviderAndOauthId(PROVIDER, OAUTH_ID))
                .thenReturn(Optional.of(existing));

        OidcUser result = service.loadUser(userRequest);

        assertThat(result).isInstanceOf(CustomOidcUser.class);
        assertThat(((CustomOidcUser) result).getEmail()).isEqualTo(EMAIL);
        verify(memberRepository, never()).save(any());
    }

    // ── 路徑 B ─────────────────────────────────────────────────────

    @Test
    @DisplayName("路徑 B：email 已有本地帳號 → 綁定 oauthProvider / oauthId 並 save()")
    void loadUser_existingLocalEmail_bindsOAuthAndSaves() {
        Member localMember = buildMember();
        localMember.setOauthProvider(null);
        localMember.setOauthId(null);

        when(memberRepository.findByOauthProviderAndOauthId(PROVIDER, OAUTH_ID))
                .thenReturn(Optional.empty());
        when(memberRepository.findByEmail(EMAIL))
                .thenReturn(Optional.of(localMember));
        when(memberRepository.save(localMember)).thenReturn(localMember);

        service.loadUser(userRequest);

        assertThat(localMember.getOauthProvider()).isEqualTo(PROVIDER);
        assertThat(localMember.getOauthId()).isEqualTo(OAUTH_ID);
        verify(memberRepository).save(localMember);
    }

    // ── 路徑 C ─────────────────────────────────────────────────────

    @Test
    @DisplayName("路徑 C：全新使用者 → 建立新 Member 並 save()")
    void loadUser_brandNewUser_createsAndSavesMember() {
        Role roleUser = new Role();
        roleUser.setRoleName("ROLE_USER");

        when(memberRepository.findByOauthProviderAndOauthId(PROVIDER, OAUTH_ID))
                .thenReturn(Optional.empty());
        when(memberRepository.findByEmail(EMAIL))
                .thenReturn(Optional.empty());
        when(roleRepository.findByRoleName("ROLE_USER"))
                .thenReturn(Optional.of(roleUser));
        when(memberRepository.save(any(Member.class))).thenAnswer(inv -> inv.getArgument(0));

        OidcUser result = service.loadUser(userRequest);

        assertThat(result).isInstanceOf(CustomOidcUser.class);
        verify(memberRepository).save(argThat(m ->
                EMAIL.equals(m.getEmail()) &&
                PROVIDER.equals(m.getOauthProvider()) &&
                OAUTH_ID.equals(m.getOauthId())
        ));
    }

    // ── 異常情境 D ─────────────────────────────────────────────────

    @Test
    @DisplayName("異常 D：ROLE_USER 不存在時拋出 RuntimeException")
    void loadUser_missingRoleUser_throwsRuntimeException() {
        when(memberRepository.findByOauthProviderAndOauthId(PROVIDER, OAUTH_ID))
                .thenReturn(Optional.empty());
        when(memberRepository.findByEmail(EMAIL))
                .thenReturn(Optional.empty());
        when(roleRepository.findByRoleName("ROLE_USER"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.loadUser(userRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("ROLE_USER");
    }

    // ── 輔助方法 ───────────────────────────────────────────────────

    private Member buildMember() {
        Role role = new Role();
        role.setRoleName("ROLE_USER");

        Member member = Member.builder()
                .email(EMAIL)
                .displayName(FULL_NAME)
                .oauthProvider(PROVIDER)
                .oauthId(OAUTH_ID)
                .createdAt(java.time.LocalDateTime.now())
                .build();
        member.getRoles().add(role);
        return member;
    }
}
