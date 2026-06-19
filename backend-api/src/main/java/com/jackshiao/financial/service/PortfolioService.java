package com.jackshiao.financial.service;

import com.jackshiao.financial.dto.AddHoldingRequest;
import com.jackshiao.financial.dto.HoldingResponse;
import com.jackshiao.financial.dto.UpdateHoldingRequest;
import com.jackshiao.financial.entity.MarketIndex;
import com.jackshiao.financial.entity.Member;
import com.jackshiao.financial.entity.PortfolioHolding;
import com.jackshiao.financial.repository.MarketIndexRepository;
import com.jackshiao.financial.repository.MemberRepository;
import com.jackshiao.financial.repository.PortfolioHoldingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PortfolioService {

    private final PortfolioHoldingRepository portfolioHoldingRepository;
    private final MemberRepository memberRepository;
    private final MarketIndexRepository marketIndexRepository;

    public List<HoldingResponse> getHoldings(String email) {
        return portfolioHoldingRepository.findByMemberEmailOrderByBuyDateDesc(email)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public HoldingResponse addHolding(String email, AddHoldingRequest request) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("找不到對應的會員帳號"));

        PortfolioHolding holding = PortfolioHolding.builder()
                .member(member)
                .symbol(request.getSymbol().toUpperCase())
                .quantity(request.getQuantity())
                .buyPrice(request.getBuyPrice())
                .buyDate(request.getBuyDate())
                .note(request.getNote())
                .build();

        return toResponse(portfolioHoldingRepository.save(holding));
    }

    @Transactional
    public void deleteHolding(String email, Integer holdingId) {
        PortfolioHolding holding = portfolioHoldingRepository
                .findByIdAndMemberEmail(holdingId, email)
                .orElseThrow(() -> new IllegalArgumentException("找不到對應的持倉紀錄"));
        portfolioHoldingRepository.delete(holding);
    }

    @Transactional
    public HoldingResponse updateHolding(String email, Integer holdingId, UpdateHoldingRequest request) {
        PortfolioHolding holding = portfolioHoldingRepository
                .findByIdAndMemberEmail(holdingId, email)
                .orElseThrow(() -> new IllegalArgumentException("找不到對應的持倉紀錄"));
        holding.setQuantity(request.getQuantity());
        holding.setBuyPrice(request.getBuyPrice());
        holding.setBuyDate(request.getBuyDate());
        holding.setNote(request.getNote());
        return toResponse(portfolioHoldingRepository.save(holding));
    }

    // ---- 私有輔助方法 ----

    private HoldingResponse toResponse(PortfolioHolding holding) {
        BigDecimal cost = holding.getBuyPrice().multiply(holding.getQuantity());

        // 嘗試從 market_index 取得即時價格
        MarketIndex index = marketIndexRepository.findBySymbol(holding.getSymbol()).orElse(null);
        BigDecimal currentPrice = index != null ? index.getCurrentPrice() : null;

        BigDecimal currentValue = null;
        BigDecimal profitLoss = null;
        BigDecimal profitLossPct = null;

        if (currentPrice != null) {
            currentValue = currentPrice.multiply(holding.getQuantity());
            profitLoss = currentValue.subtract(cost);
            if (cost.compareTo(BigDecimal.ZERO) != 0) {
                profitLossPct = profitLoss.divide(cost, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100));
            }
        }

        return HoldingResponse.builder()
                .id(holding.getId())
                .symbol(holding.getSymbol())
                .name(index != null ? index.getName() : null)
                .quantity(holding.getQuantity())
                .buyPrice(holding.getBuyPrice())
                .buyDate(holding.getBuyDate())
                .note(holding.getNote())
                .createdAt(holding.getCreatedAt())
                .cost(cost.setScale(2, RoundingMode.HALF_UP))
                .currentPrice(currentPrice)
                .currentValue(currentValue != null ? currentValue.setScale(2, RoundingMode.HALF_UP) : null)
                .profitLoss(profitLoss != null ? profitLoss.setScale(2, RoundingMode.HALF_UP) : null)
                .profitLossPct(profitLossPct != null ? profitLossPct.setScale(2, RoundingMode.HALF_UP) : null)
                .build();
    }
}
