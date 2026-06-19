package com.jackshiao.financial.dto;

import java.math.BigDecimal;

public record MarketPriceHistoryDto(BigDecimal price, String priceDate) {
}
