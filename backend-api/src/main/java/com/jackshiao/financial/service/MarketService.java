package com.jackshiao.financial.service;

import com.jackshiao.financial.dto.MarketPriceHistoryDto;
import com.jackshiao.financial.entity.MarketIndex;
import com.jackshiao.financial.entity.MarketPriceHistory;
import com.jackshiao.financial.entity.enums.SubscriptionStatus;
import com.jackshiao.financial.repository.MarketIndexRepository;
import com.jackshiao.financial.repository.MarketPriceHistoryRepository;
import com.jackshiao.financial.repository.MemberSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MarketService {

    private static final Logger log = LoggerFactory.getLogger(MarketService.class);
    private static final int MIN_HISTORY_DAYS = 1;
    private static final int MAX_HISTORY_DAYS = 90; // 約 3 個月，防止單次查詢過多歷史資料
    private static final DateTimeFormatter HISTORY_DATE_FMT = DateTimeFormatter.ofPattern("MM/dd");

    @Value("${fred.api.key}")
    private String fredApiKey;

    @Value("${fugle.api.key:}")
    private String fugleApiKey;

    private final MarketIndexRepository marketIndexRepository;
    private final MarketPriceHistoryRepository marketPriceHistoryRepository;
    private final MemberSubscriptionRepository memberSubscriptionRepository;
    private final RestClient restClient = RestClient.create();

    public List<MarketIndex> getAllMarketIndices() {
        return marketIndexRepository.findAll();
    }

    public List<MarketIndex> searchMarketIndices(String keyword) {
        return marketIndexRepository.searchByKeyword(keyword);
    }

    // ---------------------------------------------------------------
    // 定時任務：每隔一段時間從 Frankfurter API 取得 USD、JPY、CNY 對 TWD 匯率並更新到資料庫。
    // ---------------------------------------------------------------
    @Scheduled(fixedRateString = "${scheduler.forex.fixed-rate}", initialDelayString = "${scheduler.forex.initial-delay}")
    public void updateForexRates() {
        updateFrankfurterRate("USD", "TWD", "USDTWD", "USD/TWD");
        updateFrankfurterRate("JPY", "TWD", "JPYTWD", "JPY/TWD");
        updateFrankfurterRate("CNY", "TWD", "CNYTWD", "CNY/TWD");
    }

    // ---------------------------------------------------------------
    // 共用輔助方法：呼叫 Frankfurter API 並更新單一匯率到資料庫
    // ---------------------------------------------------------------
    private void updateFrankfurterRate(String baseCurrency, String quoteCurrency, String symbol, String name) {
        try {
            List<Map<String, Object>> response = restClient.get()
                    .uri("https://api.frankfurter.dev/v2/rates?base=" + baseCurrency + "&quotes=" + quoteCurrency)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});

            if (response == null || response.isEmpty()) {
                log.warn("Frankfurter [{}] 回應格式不符合預期: {}", symbol, response);
                return;
            }

            Object rateObj = response.getFirst().get("rate");
            if (rateObj == null) {
                log.warn("Frankfurter [{}] 回應缺少匯率欄位", symbol);
                return;
            }

            BigDecimal newRate = new BigDecimal(rateObj.toString());
            LocalDateTime now = LocalDateTime.now();

            MarketIndex forex = marketIndexRepository.findBySymbol(symbol)
                    .orElseGet(() -> MarketIndex.builder()
                            .symbol(symbol)
                            .name(name)
                            .changePoint(BigDecimal.ZERO)
                            .currentPrice(newRate)
                            .updatedAt(now)
                            .build());

            BigDecimal previousPrice = forex.getCurrentPrice();
            forex.setCurrentPrice(newRate);
            forex.setUpdatedAt(now);
            forex.setChangePoint(previousPrice == null ? BigDecimal.ZERO : newRate.subtract(previousPrice));

            marketIndexRepository.save(forex);
            saveHistory(symbol, newRate);
            log.info("已更新 {} 匯率: {}", symbol, newRate);
        } catch (Exception ex) {
            log.error("更新 {} 匯率失敗", symbol, ex);
        }
    }

    // ---------------------------------------------------------------
    // 定時任務：每隔一段時間從 FRED API 取得最新的公債殖利率並更新到資料庫。
    // ---------------------------------------------------------------
    @Scheduled(fixedRateString = "${scheduler.bond.fixed-rate}", initialDelayString = "${scheduler.bond.initial-delay}")
    public void updateBondYields() {
        fetchAndUpdateFredIndicator("DGS20", "US20Y", "US 20-Year");
        fetchAndUpdateFredIndicator("DGS10", "US10Y", "US 10-Year");
        fetchAndUpdateFredIndicator("DGS2", "US2Y", "US 2-Year");
        fetchAndUpdateFredIndicator("IRLTLT01JPM156N", "JP10Y", "JP 10-Year");
    }

    @Scheduled(fixedRateString = "${scheduler.stock.fixed-rate}", initialDelayString = "${scheduler.stock.initial-delay}")
    public void updateStockIndices() {
        fetchAndUpdateFredIndicator("SP500", "SPX", "S&P 500");
        fetchAndUpdateFredIndicator("NASDAQCOM", "IXIC", "NASDAQ Composite");
        fetchAndUpdateFredIndicator("DJIA", "DJI", "Dow Jones");
        fetchAndUpdateFredIndicator("NIKKEI225", "N225", "Nikkei 225");
        fetchAndUpdateYahooIndicator("^STOXX50E", "EUR", "Euro Stoxx 50");  // FRED 無此系列，改用 Yahoo Finance
    }

    // ---------------------------------------------------------------
    // 共用輔助方法：呼叫 FRED API 並更新單一指標到資料庫
    // ---------------------------------------------------------------
    private void fetchAndUpdateFredIndicator(String seriesId, String symbol, String name) {
        try {
            Map<String, Object> response = restClient.get()
                    .uri("https://api.stlouisfed.org/fred/series/observations"
                            + "?series_id=" + seriesId
                            + "&api_key=" + fredApiKey
                    + "&file_type=json&sort_order=desc&limit=5")
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (response == null || !(response.get("observations") instanceof List<?> observations)
                    || observations.isEmpty()) {
                log.warn("FRED [{}] 回應格式不符合預期: {}", seriesId, response);
                return;
            }

            BigDecimal latestValue = null;
            BigDecimal previousValue = null;

            for (Object observation : observations) {
                if (!(observation instanceof Map<?, ?> obsMap)) {
                    continue;
                }

                Object valueObj = obsMap.get("value");
                if (valueObj == null) {
                    continue;
                }

                String valueText = valueObj.toString();
                // FRED 在假日或資料缺漏時會回 "."
                if (".".equals(valueText)) {
                    continue;
                }

                BigDecimal value = new BigDecimal(valueText);
                if (latestValue == null) {
                    latestValue = value;
                } else {
                    previousValue = value;
                    break;
                }
            }

            if (latestValue == null) {
                log.warn("FRED [{}] 找不到可用觀測值（全為空值或 '.'）", seriesId);
                return;
            }

            BigDecimal changePoint = previousValue == null
                    ? BigDecimal.ZERO
                    : latestValue.subtract(previousValue);
            LocalDateTime now = LocalDateTime.now();
            final BigDecimal finalLatestValue = latestValue;
            final BigDecimal finalChangePoint = changePoint;
            final LocalDateTime finalNow = now;

            MarketIndex indicator = marketIndexRepository.findBySymbol(symbol)
                    .orElseGet(() -> MarketIndex.builder()
                            .symbol(symbol)
                            .name(name)
                            .changePoint(BigDecimal.ZERO)
                            .currentPrice(finalLatestValue)
                            .updatedAt(finalNow)
                            .build());

            indicator.setCurrentPrice(finalLatestValue);
            indicator.setUpdatedAt(finalNow);
            indicator.setChangePoint(finalChangePoint);

            marketIndexRepository.save(indicator);
            saveHistory(symbol, finalLatestValue);
            log.info("已更新 {} [{}]: {} (漲跌: {})", name, symbol, finalLatestValue, finalChangePoint);
        } catch (Exception ex) {
            log.error("更新 FRED [{}] 指標失敗", seriesId, ex);
        }
    }

    // ---------------------------------------------------------------
    // 定時任務：每隔一段時間從 Fugle API 取得最新的台灣加權指數，並更新到資料庫。
    // ---------------------------------------------------------------
    @Scheduled(fixedRateString = "${scheduler.twse.fixed-rate}", initialDelayString = "${scheduler.twse.initial-delay}")
    public void updateTwseIndex() {
        fetchAndUpdateFugleIndicator("IX0001", "TWII", "台灣加權指數");
    }

    // ---------------------------------------------------------------
    // 共用輔助方法：呼叫 Fugle API 並更新單一台股指標到資料庫
    // ---------------------------------------------------------------
    private void fetchAndUpdateFugleIndicator(String symbolCode, String symbol, String name) {
        // 確保 API Key 有設定，避免噴 401 錯誤
        if (fugleApiKey == null || fugleApiKey.trim().isEmpty()) {
            log.warn("Fugle API Key 尚未設定，略過 {} [{}] 更新", name, symbolCode);
            return;
        }

        try {
            Map<String, Object> response = restClient.get()
                    .uri("https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/" + symbolCode)
                    .header("X-API-KEY", fugleApiKey)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (response == null) {
                log.warn("Fugle [{}] 回應為空", symbolCode);
                return;
            }

            // 價格優先順序：lastPrice（盤中即時）→ closePrice（收盤）→ previousClose（前一交易日收盤，休市時使用）
            Object priceObj = response.get("lastPrice");
            if (priceObj == null) {
                priceObj = response.get("closePrice");
            }
            if (priceObj == null) {
                priceObj = response.get("previousClose");
            }
            if (priceObj == null) {
                log.warn("Fugle [{}] 回應缺少價格欄位: {}", symbolCode, response);
                return;
            }

            BigDecimal newPrice = new BigDecimal(priceObj.toString());
            // 直接使用 Fugle 提供的漲跌點數（相對前一交易日收盤，比自算更準確）
            Object changeObj = response.get("change");
            BigDecimal changePoint = (changeObj != null)
                    ? new BigDecimal(changeObj.toString())
                    : BigDecimal.ZERO;

            LocalDateTime now = LocalDateTime.now();

            MarketIndex indicator = marketIndexRepository.findBySymbol(symbol)
                    .orElseGet(() -> MarketIndex.builder()
                            .symbol(symbol)
                            .name(name)
                            .changePoint(BigDecimal.ZERO)
                            .currentPrice(newPrice)
                            .updatedAt(now)
                            .build());

            indicator.setCurrentPrice(newPrice);
            indicator.setUpdatedAt(now);
            indicator.setChangePoint(changePoint);

            marketIndexRepository.save(indicator);
            saveHistory(symbol, newPrice);
            log.info("已更新 {} [{}]: {} (漲跌: {})", name, symbol, newPrice, changePoint);
        } catch (Exception ex) {
            log.error("更新 Fugle [{}] 指標失敗", symbolCode, ex);
        }
    }

    // ---------------------------------------------------------------
    // Seeder 公開方法：從 FRED API 補齊指定 symbol 近 N 天歷史資料（冪等）
    // ---------------------------------------------------------------
    public void seedFredHistoryIfEmpty(String seriesId, String symbol, int days) {
        if (marketPriceHistoryRepository.countBySymbol(symbol) >= 10) {
            log.info("Seeder: {} 已有足夠歷史資料（{}筆），略過", symbol,
                    marketPriceHistoryRepository.countBySymbol(symbol));
            return;
        }
        String startDate = LocalDate.now().minusDays(days).toString(); // yyyy-MM-dd
        try {
            Map<String, Object> response = restClient.get()
                    .uri("https://api.stlouisfed.org/fred/series/observations"
                            + "?series_id=" + seriesId
                            + "&api_key=" + fredApiKey
                            + "&file_type=json&sort_order=asc"
                            + "&observation_start=" + startDate)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (response == null || !(response.get("observations") instanceof List<?> observations)) {
                log.warn("Seeder FRED [{}] 回應格式不符合預期", seriesId);
                return;
            }

            int saved = 0;
            for (Object obs : observations) {
                if (!(obs instanceof Map<?, ?> obsMap)) continue;
                String valueText = String.valueOf(obsMap.get("value"));
                String dateText  = String.valueOf(obsMap.get("date"));
                if (".".equals(valueText) || "null".equals(valueText)) continue;
                MarketPriceHistory h = MarketPriceHistory.builder()
                        .symbol(symbol)
                        .price(new BigDecimal(valueText))
                        .recordedAt(LocalDate.parse(dateText).atTime(16, 0))
                        .build();
                marketPriceHistoryRepository.save(h);
                saved++;
            }
            log.info("Seeder FRED [{}] {} 筆歷史資料寫入完成", symbol, saved);
        } catch (Exception ex) {
            log.error("Seeder FRED [{}] 歷史資料寫入失敗", symbol, ex);
        }
    }

    // ---------------------------------------------------------------
    // Seeder 公開方法：從 Frankfurter API 補齊匯率 symbol 近 N 天歷史資料（冪等）
    // ---------------------------------------------------------------
    public void seedFrankfurterHistoryIfEmpty(String base, String quote, String symbol, int days) {
        if (marketPriceHistoryRepository.countBySymbol(symbol) >= 10) {
            log.info("Seeder: {} 已有足夠歷史資料（{}筆），略過", symbol,
                    marketPriceHistoryRepository.countBySymbol(symbol));
            return;
        }
        String from = LocalDate.now().minusDays(days).toString();
        String to   = LocalDate.now().toString();
        try {
            List<Map<String, Object>> response = restClient.get()
                    .uri("https://api.frankfurter.dev/v2/rates"
                            + "?from=" + from + "&to=" + to
                            + "&base=" + base + "&quotes=" + quote)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});

            if (response == null || response.isEmpty()) {
                log.warn("Seeder Frankfurter [{}] 回應格式不符合預期", symbol);
                return;
            }

            int saved = 0;
            for (Map<String, Object> entry : response) {
                Object rateObj = entry.get("rate");
                Object dateObj = entry.get("date");
                if (rateObj == null || dateObj == null) continue;
                MarketPriceHistory h = MarketPriceHistory.builder()
                        .symbol(symbol)
                        .price(new BigDecimal(rateObj.toString()))
                        .recordedAt(LocalDate.parse(dateObj.toString()).atTime(16, 0))
                        .build();
                marketPriceHistoryRepository.save(h);
                saved++;
            }
            log.info("Seeder Frankfurter [{}] {} 筆歷史資料寫入完成", symbol, saved);
        } catch (Exception ex) {
            log.error("Seeder Frankfurter [{}] 歷史資料寫入失敗", symbol, ex);
        }
    }

    // ---------------------------------------------------------------
    // Yahoo Finance （非官方）輔助方法：用於 FRED 未提供的指數（如 Euro Stoxx 50）
    // ---------------------------------------------------------------
    @SuppressWarnings("unchecked")
    private void fetchAndUpdateYahooIndicator(String yahooSymbol, String symbol, String name) {
        try {
            // 使用 URI.create() 透過已 encode 的字串建構 URI，
            // 避免 RestClient .uri(String) 對已經 encode 的 '%' 再次 encode（雙重 encode 問題）
            String encodedSymbol = yahooSymbol.replace("^", "%5E");
            java.net.URI uri = java.net.URI.create(
                    "https://query1.finance.yahoo.com/v8/finance/chart/"
                    + encodedSymbol + "?interval=1d&range=2d");
            Map<String, Object> response = restClient.get()
                    .uri(uri)
                    .header("User-Agent", "Mozilla/5.0")
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (response == null) {
                log.warn("Yahoo [{}] 回應為空", yahooSymbol);
                return;
            }
            Map<String, Object> chart = (Map<String, Object>) response.get("chart");
            List<Map<String, Object>> results = (List<Map<String, Object>>) chart.get("result");
            if (results == null || results.isEmpty()) {
                log.warn("Yahoo [{}] chart.result 為空", yahooSymbol);
                return;
            }
            Map<String, Object> meta = (Map<String, Object>) results.get(0).get("meta");
            Object priceObj  = meta.get("regularMarketPrice");
            Object changeObj = meta.get("regularMarketChange");
            if (priceObj == null) {
                log.warn("Yahoo [{}] 回應缺少 regularMarketPrice: {}", yahooSymbol, meta);
                return;
            }
            BigDecimal newPrice   = new BigDecimal(priceObj.toString());
            BigDecimal changePoint = changeObj != null ? new BigDecimal(changeObj.toString()) : BigDecimal.ZERO;
            LocalDateTime now = LocalDateTime.now();

            MarketIndex indicator = marketIndexRepository.findBySymbol(symbol)
                    .orElseGet(() -> MarketIndex.builder()
                            .symbol(symbol)
                            .name(name)
                            .changePoint(BigDecimal.ZERO)
                            .currentPrice(newPrice)
                            .updatedAt(now)
                            .build());
            indicator.setCurrentPrice(newPrice);
            indicator.setUpdatedAt(now);
            indicator.setChangePoint(changePoint);
            marketIndexRepository.save(indicator);
            saveHistory(symbol, newPrice);
            log.info("已更新 {} [{}]: {} (漲跌: {})", name, symbol, newPrice, changePoint);
        } catch (Exception ex) {
            log.error("更新 Yahoo [{}] 指標失敗", yahooSymbol, ex);
        }
    }

    // ---------------------------------------------------------------
    // Seeder 公開方法：從 Yahoo Finance 補齊指定 symbol 近 N 天歷史資料（冪等）
    // ---------------------------------------------------------------
    @SuppressWarnings("unchecked")
    public void seedYahooHistoryIfEmpty(String yahooSymbol, String symbol, int days) {
        if (marketPriceHistoryRepository.countBySymbol(symbol) >= 10) {
            log.info("Seeder: {} 已有足夠歷史資料（{}筆），略過", symbol,
                    marketPriceHistoryRepository.countBySymbol(symbol));
            return;
        }
        try {
            String encodedSymbol = yahooSymbol.replace("^", "%5E");
            java.net.URI uri = java.net.URI.create(
                    "https://query1.finance.yahoo.com/v8/finance/chart/"
                    + encodedSymbol + "?interval=1d&range=" + days + "d");
            Map<String, Object> response = restClient.get()
                    .uri(uri)
                    .header("User-Agent", "Mozilla/5.0")
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (response == null) {
                log.warn("Seeder Yahoo [{}] 回應為空", yahooSymbol);
                return;
            }
            Map<String, Object> chart = (Map<String, Object>) response.get("chart");
            List<Map<String, Object>> results = (List<Map<String, Object>>) chart.get("result");
            if (results == null || results.isEmpty()) {
                log.warn("Seeder Yahoo [{}] chart.result 為空", yahooSymbol);
                return;
            }
            List<Object> timestamps = (List<Object>) results.get(0).get("timestamp");
            Map<String, Object> indicators = (Map<String, Object>) results.get(0).get("indicators");
            List<Map<String, Object>> quoteList = (List<Map<String, Object>>) indicators.get("quote");
            List<Object> closes = (List<Object>) quoteList.get(0).get("close");

            if (timestamps == null || closes == null || timestamps.size() != closes.size()) {
                log.warn("Seeder Yahoo [{}] 資料格式不符合預期", yahooSymbol);
                return;
            }
            int saved = 0;
            for (int i = 0; i < timestamps.size(); i++) {
                Object closeObj = closes.get(i);
                if (closeObj == null) continue;
                long epochSec = Long.parseLong(timestamps.get(i).toString());
                LocalDateTime recordedAt = LocalDateTime.ofEpochSecond(epochSec, 0, ZoneOffset.UTC);
                MarketPriceHistory h = MarketPriceHistory.builder()
                        .symbol(symbol)
                        .price(new BigDecimal(closeObj.toString()))
                        .recordedAt(recordedAt)
                        .build();
                marketPriceHistoryRepository.save(h);
                saved++;
            }
            log.info("Seeder Yahoo [{}] {} 筆歷史資料寫入完成", symbol, saved);
        } catch (Exception ex) {
            log.error("Seeder Yahoo [{}] 歷史資料寫入失敗", yahooSymbol, ex);
        }
    }

    // ---------------------------------------------------------------
    // Seeder 公開方法：從 TWSE 免費 API 補齊 TWII 近 N 天歷史資料（冪等）
    // TWSE API：https://www.twse.com.tw/rwd/zh/TAIEX/MI_5MINS_HIST?date=YYYYMM&type=Daily&response=json
    // 每次回傳一個月的日資料，欄位：[日期(ROC), 開盤, 最高, 最低, 收盤]
    // ---------------------------------------------------------------
    @SuppressWarnings("unchecked")
    public void seedTwseHistoryIfEmpty(String symbol, int days) {
        if (marketPriceHistoryRepository.countBySymbol(symbol) >= 10) {
            log.info("Seeder: {} 已有足夠歷史資料（{}筆），略過", symbol,
                    marketPriceHistoryRepository.countBySymbol(symbol));
            return;
        }
        // 需要的月份數（60 交易天約 3 個月）
        int monthsNeeded = (days / 20) + 2;
        LocalDate today = LocalDate.now();
        int totalSaved = 0;

        for (int m = monthsNeeded - 1; m >= 0; m--) {
            LocalDate targetMonth = today.minusMonths(m);
            String dateParam = String.format("%d%02d",
                    targetMonth.getYear(), targetMonth.getMonthValue());
            try {
                String url = "https://www.twse.com.tw/rwd/zh/TAIEX/MI_5MINS_HIST"
                        + "?date=" + dateParam + "&type=Daily&response=json";
                Map<String, Object> response = restClient.get()
                        .uri(java.net.URI.create(url))
                        .header("User-Agent", "Mozilla/5.0")
                        .retrieve()
                        .body(new ParameterizedTypeReference<Map<String, Object>>() {});

                if (response == null || !"OK".equals(response.get("stat"))) {
                    log.warn("Seeder TWSE [{}] 月份 {} 回應異常: stat={}",
                            symbol, dateParam,
                            response != null ? response.get("stat") : "null");
                    continue;
                }

                List<List<Object>> data = (List<List<Object>>) response.get("data");
                if (data == null || data.isEmpty()) continue;

                for (List<Object> row : data) {
                    if (row.size() < 5) continue;
                    try {
                        // 日期格式：民國年/月/日，如 "113/04/01"
                        String rocDate = row.get(0).toString().trim();
                        String[] parts = rocDate.split("/");
                        int year = Integer.parseInt(parts[0]) + 1911;
                        int month = Integer.parseInt(parts[1]);
                        int day   = Integer.parseInt(parts[2]);
                        LocalDateTime recordedAt = LocalDate.of(year, month, day).atStartOfDay();

                        // 收盤指數（第 5 欄，去除千分位逗號）
                        String closeStr = row.get(4).toString().replaceAll(",", "").trim();
                        BigDecimal closePrice = new BigDecimal(closeStr);

                        MarketPriceHistory h = MarketPriceHistory.builder()
                                .symbol(symbol)
                                .price(closePrice)
                                .recordedAt(recordedAt)
                                .build();
                        marketPriceHistoryRepository.save(h);
                        totalSaved++;
                    } catch (Exception ex) {
                        log.debug("Seeder TWSE [{}] 解析資料列失敗: {}", symbol, row, ex);
                    }
                }
                // 避免對 TWSE 請求過快
                Thread.sleep(500);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                log.warn("Seeder TWSE [{}] 被中斷", symbol);
                return;
            } catch (Exception ex) {
                log.error("Seeder TWSE [{}] 月份 {} 寫入失敗", symbol, dateParam, ex);
            }
        }
        log.info("Seeder TWSE [{}] {} 筆歷史資料寫入完成", symbol, totalSaved);
    }

    // ---------------------------------------------------------------
    // 工具方法：每次 Scheduler 更新後儲存一筆歷史快照
    // 歷史快照為輔助數據（僅供折線圖使用），儲存失敗不應中斷主指數更新，故吞掉例外僅記錄 log。
    // ---------------------------------------------------------------
    private void saveHistory(String symbol, BigDecimal price) {
        try {
            MarketPriceHistory history = MarketPriceHistory.builder()
                    .symbol(symbol)
                    .price(price)
                    .recordedAt(LocalDateTime.now())
                    .build();
            marketPriceHistoryRepository.save(history);
        } catch (Exception ex) {
            log.error("儲存 {} 歷史快照失敗", symbol, ex);
        }
    }

    // ---------------------------------------------------------------
    // 查詢方法：判斷指定 email 的會員是否有尚未到期的 ACTIVE 訂閱
    // ---------------------------------------------------------------
    public boolean isActivePremium(String email) {
        if (email == null) return false;
        return memberSubscriptionRepository.existsByMemberEmailAndStatusAndExpireAtAfter(
                email, SubscriptionStatus.ACTIVE, LocalDateTime.now());
    }

    // 查詢方法：取得指定 symbol 的每日最新快照（最近 N 天，由舊到新）
    // ---------------------------------------------------------------
    public List<MarketPriceHistoryDto> getMarketHistory(String symbol, int limit) {
        int safeLimit = Math.min(Math.max(limit, MIN_HISTORY_DAYS), MAX_HISTORY_DAYS);
        Pageable pageable = PageRequest.of(0, safeLimit);
        List<MarketPriceHistory> rows = marketPriceHistoryRepository
                .findLatestPerDayBySymbol(symbol.toUpperCase(), pageable);
        List<MarketPriceHistoryDto> result = rows.stream()
                .map(h -> new MarketPriceHistoryDto(h.getPrice(), h.getRecordedAt().format(HISTORY_DATE_FMT)))
                .collect(Collectors.toCollection(ArrayList::new));
        Collections.reverse(result);
        return result;
    }
}
