package com.jackshiao.financial.service;

import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.jackshiao.financial.entity.MarketIndex;
import com.jackshiao.financial.entity.Member;
import com.jackshiao.financial.repository.MarketIndexRepository;
import com.jackshiao.financial.repository.MemberRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WatchlistService {

    private final MemberRepository memberRepository;
    private final MarketIndexRepository marketIndexRepository;

    @Transactional(readOnly = true)
    public Set<MarketIndex> getWatchlist(String email) {
        Member member = findMember(email);
        return member.getWatchlist();
    }

    @Transactional
    public void addToWatchlist(String email, String symbol) {
        Member member = findMember(email);
        MarketIndex index = marketIndexRepository.findBySymbol(symbol)
                .orElseThrow(() -> new IllegalArgumentException("找不到指數：" + symbol));
        member.getWatchlist().add(index);
        memberRepository.save(member);
    }

    @Transactional
    public void removeFromWatchlist(String email, String symbol) {
        Member member = findMember(email);
        MarketIndex index = marketIndexRepository.findBySymbol(symbol)
                .orElseThrow(() -> new IllegalArgumentException("找不到指數：" + symbol));
        member.getWatchlist().remove(index);
        memberRepository.save(member);
    }

    private Member findMember(String email) {
        return memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("找不到會員：" + email));
    }
}
