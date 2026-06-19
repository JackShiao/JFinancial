package com.jackshiao.financial.controller;

import java.util.Set;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jackshiao.financial.common.ApiResponse;
import com.jackshiao.financial.entity.MarketIndex;
import com.jackshiao.financial.service.WatchlistService;

import lombok.RequiredArgsConstructor;

// [需要驗證] 由 SecurityConfig 規則保護 /api/watchlist/**
@RestController
@RequestMapping("/api/watchlist")
@RequiredArgsConstructor
public class WatchlistController {

    private final WatchlistService watchlistService;

    @GetMapping
    public ApiResponse<Set<MarketIndex>> getWatchlist(
            @AuthenticationPrincipal String email) {
        Set<MarketIndex> watchlist = watchlistService.getWatchlist(email);
        return ApiResponse.success(watchlist);
    }

    @PostMapping("/{symbol}")
    public ApiResponse<Void> addToWatchlist(
            @AuthenticationPrincipal String email,
            @PathVariable String symbol) {
        watchlistService.addToWatchlist(email, symbol);
        return ApiResponse.success(null, "已加入追蹤清單");
    }

    @DeleteMapping("/{symbol}")
    public ApiResponse<Void> removeFromWatchlist(
            @AuthenticationPrincipal String email,
            @PathVariable String symbol) {
        watchlistService.removeFromWatchlist(email, symbol);
        return ApiResponse.success(null, "已移除追蹤清單");
    }
}
