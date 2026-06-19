package com.jackshiao.financial.runner;

import com.jackshiao.financial.service.MarketService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * 應用程式啟動後自動執行：
 * 若 market_price_history 中某 symbol 尚無任何歷史資料，
 * 則從外部 API（FRED / Frankfurter）抓取最近 60 天真實資料補入。
 * 採冪等設計，重複啟動不會重複寫入。
 */
@Component
@Order(1)
@RequiredArgsConstructor
public class MarketDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MarketDataSeeder.class);
    private static final int SEED_DAYS = 60;

    private final MarketService marketService;

    @Override
    public void run(ApplicationArguments args) {
        log.info("=== MarketDataSeeder 開始補充歷史資料 ===");

        // ── FRED 股市指數 ───────────────────────────────────────────
        marketService.seedFredHistoryIfEmpty("SP500",           "SPX",  SEED_DAYS);
        marketService.seedFredHistoryIfEmpty("NASDAQCOM",       "IXIC", SEED_DAYS);
        marketService.seedFredHistoryIfEmpty("DJIA",            "DJI",  SEED_DAYS);
        marketService.seedFredHistoryIfEmpty("NIKKEI225",       "N225", SEED_DAYS);

        // ── Yahoo Finance：FRED 無 Euro Stoxx 50 系列，改用 Yahoo Finance ──
        marketService.seedYahooHistoryIfEmpty("^STOXX50E",      "EUR",  SEED_DAYS);

        // ── FRED 公債殖利率 ─────────────────────────────────────────
        marketService.seedFredHistoryIfEmpty("DGS10",           "US10Y", SEED_DAYS);
        marketService.seedFredHistoryIfEmpty("IRLTLT01JPM156N", "JP10Y", SEED_DAYS);

        // ── Frankfurter 外匯匯率 ────────────────────────────────────
        marketService.seedFrankfurterHistoryIfEmpty("USD", "TWD", "USDTWD", SEED_DAYS);
        marketService.seedFrankfurterHistoryIfEmpty("JPY", "TWD", "JPYTWD", SEED_DAYS);
        marketService.seedFrankfurterHistoryIfEmpty("CNY", "TWD", "CNYTWD", SEED_DAYS);

        // ── TWII：使用 TWSE 免費月份 API 補充歷史資料 ─────────────────
        marketService.seedTwseHistoryIfEmpty("TWII", SEED_DAYS);

        log.info("=== MarketDataSeeder 執行完畢 ===");
    }
}
