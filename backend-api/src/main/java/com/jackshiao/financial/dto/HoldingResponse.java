package com.jackshiao.financial.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class HoldingResponse {

    private Integer id;
    private String symbol;
    private String name;          // 來自 MarketIndex，若無資料則為 null
    private BigDecimal quantity;
    private BigDecimal buyPrice;
    private LocalDate buyDate;
    private String note;
    private LocalDateTime createdAt;

    // 以下為計算欄位，若 currentPrice 無法取得則為 null
    private BigDecimal cost;          // buyPrice × quantity
    private BigDecimal currentPrice;
    private BigDecimal currentValue;  // currentPrice × quantity
    private BigDecimal profitLoss;    // currentValue - cost
    private BigDecimal profitLossPct; // (profitLoss / cost) × 100
}
