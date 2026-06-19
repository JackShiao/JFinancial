package com.jackshiao.financial.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.jackshiao.financial.entity.MarketIndex;

public interface MarketIndexRepository extends JpaRepository<MarketIndex, Integer> {

    Optional<MarketIndex> findBySymbol(String symbol);

    // 依 symbol 或 name 模糊搜尋（參數化查詢，防 SQL Injection）
    @Query("SELECT m FROM MarketIndex m WHERE LOWER(m.symbol) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<MarketIndex> searchByKeyword(@Param("keyword") String keyword);
}
