package com.jackshiao.financial.service;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.jackshiao.financial.dto.LoginRequest;
import com.jackshiao.financial.dto.LoginResponse;
import com.jackshiao.financial.dto.RegisterRequest;
import com.jackshiao.financial.entity.Member;
import com.jackshiao.financial.entity.Role;
import com.jackshiao.financial.repository.MemberRepository;
import com.jackshiao.financial.repository.RoleRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Pattern PASSWORD_RULE = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?]).{8,}$"
    );

    private final MemberRepository memberRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public void register(RegisterRequest request) {
        if (memberRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("註冊失敗，請稍後再試");
        }

        if (!PASSWORD_RULE.matcher(request.getPassword()).matches()) {
            throw new IllegalArgumentException("密碼需至少 8 碼，並包含大寫字母、小寫字母、數字及特殊符號");
        }

        String encodedPassword = passwordEncoder.encode(request.getPassword());

        Role role = roleRepository.findByRoleName("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("找不到預設角色 ROLE_USER，請確認資料庫初始資料"));

        Member member = Member.builder()
                .email(request.getEmail())
                .passwordHash(encodedPassword)
                .displayName(request.getUsername())
                .createdAt(LocalDateTime.now())
                .build();

        member.getRoles().add(role);
        memberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        Member member = memberRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("信箱或密碼錯誤"));

        if (!passwordEncoder.matches(request.getPassword(), member.getPasswordHash())) {
            throw new BadCredentialsException("信箱或密碼錯誤");
        }

        Set<String> roles = member.getRoles().stream()
                .map(Role::getRoleName)
                .collect(Collectors.toSet());

        String token = jwtService.generateToken(member.getEmail(), member.getDisplayName(), roles);

        return new LoginResponse(token, member.getDisplayName(), member.getEmail());
    }
}

