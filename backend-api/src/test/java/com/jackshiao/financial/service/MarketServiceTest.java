package com.jackshiao.financial.service;

import com.jackshiao.financial.entity.MarketIndex;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class MarketServiceTest {

    @Autowired
    private MarketService marketService;

    @Test
    void shouldCreateMarketServiceBean() {
        assertNotNull(marketService);
    }

    @Test
    void shouldFetchAllMarketIndicesFromDatabase() {
        List<MarketIndex> data = marketService.getAllMarketIndices();
        assertNotNull(data);
    }
}
