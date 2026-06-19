package com.jackshiao.financial.service;

import com.jackshiao.financial.common.ResourceNotFoundException;
import com.jackshiao.financial.dto.ChangePasswordRequest;
import com.jackshiao.financial.dto.UpdateDisplayNameRequest;
import com.jackshiao.financial.entity.Member;
import com.jackshiao.financial.entity.enums.SubscriptionStatus;
import com.jackshiao.financial.repository.MemberRepository;
import com.jackshiao.financial.repository.MemberSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final MemberSubscriptionRepository memberSubscriptionRepository;

    @Transactional
    public Map<String, String> updateDisplayName(String email, UpdateDisplayNameRequest request) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("找不到對應的會員帳號"));

        member.setDisplayName(request.getDisplayName());
        memberRepository.save(member);

        Set<String> roleNames = member.getRoles().stream()
                .map(role -> role.getRoleName())
                .collect(Collectors.toSet());
        String newToken = jwtService.generateToken(email, member.getDisplayName(), roleNames);

        return Map.of("displayName", member.getDisplayName(), "token", newToken);
    }

    @Transactional
    public void deleteAccount(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("找不到對應的會員帳號"));

        memberRepository.delete(member);
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("找不到對應的會員帳號"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), member.getPasswordHash())) {
            throw new IllegalArgumentException("目前密碼輸入錯誤");
        }

        member.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        memberRepository.save(member);
    }

    public String getDisplayName(String email) {
        return memberRepository.findByEmail(email)
                .map(Member::getDisplayName)
                .orElse(email);
    }

    public boolean isActivePremium(String email) {
        if (email == null) return false;
        return memberSubscriptionRepository.existsByMemberEmailAndStatusAndExpireAtAfter(
                email, SubscriptionStatus.ACTIVE, LocalDateTime.now());
    }
}
