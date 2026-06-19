package com.jackshiao.financial.repository;

import com.jackshiao.financial.entity.MarketPriceHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MarketPriceHistoryRepository extends JpaRepository<MarketPriceHistory, Long> {

    // 檢查某 symbol 是否已有歷史記錄（供 MarketDataSeeder 冪等判斷用）
    boolean existsBySymbol(String symbol);

    // 計算某 symbol 的歷史記錄筆數（供 Seeder 判斷是否需要補資料）
    long countBySymbol(String symbol);

    // 取得某 symbol 每天最新一筆快照，用 Pageable 控制回傳筆數（降冪排序）
    @Query(value = """
            SELECT h.* FROM market_price_history h
            INNER JOIN (
                SELECT MAX(recorded_at) AS max_recorded_at
                FROM market_price_history
                WHERE symbol = :symbol
                GROUP BY DATE(recorded_at)
            ) latest ON h.symbol = :symbol AND h.recorded_at = latest.max_recorded_at
            ORDER BY h.recorded_at DESC
            """, nativeQuery = true)
    List<MarketPriceHistory> findLatestPerDayBySymbol(
            @Param("symbol") String symbol,
            Pageable pageable);
}
