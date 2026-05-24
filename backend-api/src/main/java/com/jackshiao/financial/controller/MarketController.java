package com.jackshiao.financial.controller;

import com.jackshiao.financial.common.ApiResponse;
import com.jackshiao.financial.dto.MarketPriceHistoryDto;
import com.jackshiao.financial.entity.MarketIndex;
import com.jackshiao.financial.service.MarketService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/market")
@RequiredArgsConstructor
public class MarketController {

    private static final int FREE_HISTORY_LIMIT    = 30;
    private static final int PREMIUM_HISTORY_LIMIT = 365;

    private final MarketService marketService;

    @GetMapping("/indices")
    public ApiResponse<List<MarketIndex>> getMarketIndices() {
        List<MarketIndex> indices = marketService.getAllMarketIndices();
        return ApiResponse.success(indices);
    }

    @GetMapping("/search")
    public ApiResponse<List<MarketIndex>> searchMarketIndices(
            @RequestParam(name = "q", defaultValue = "") String keyword) {
        if (keyword.isBlank()) {
            return ApiResponse.success(List.of());
        }
        List<MarketIndex> results = marketService.searchMarketIndices(keyword.trim());
        return ApiResponse.success(results);
    }

    /**
     * 取得市場歷史資料。
     * Premium 用戶（訂閱 ACTIVE 且未到期）最多可取得 365 筆；免費用戶上限為 30 筆。
     * 以 DB 訂閱狀態為準，付款後立即生效，到期後立即失效。
     */
    @GetMapping("/history")
    public ApiResponse<List<MarketPriceHistoryDto>> getMarketHistory(
            @AuthenticationPrincipal String email,
            @RequestParam(name = "symbol") String symbol,
            @RequestParam(name = "limit", defaultValue = "30") int limit) {

        int effectiveLimit = marketService.isActivePremium(email)
                ? Math.min(limit, PREMIUM_HISTORY_LIMIT)
                : FREE_HISTORY_LIMIT;
        List<MarketPriceHistoryDto> history = marketService.getMarketHistory(symbol, effectiveLimit);
        return ApiResponse.success(history);
    }
}

