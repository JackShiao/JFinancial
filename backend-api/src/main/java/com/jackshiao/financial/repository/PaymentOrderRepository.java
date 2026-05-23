package com.jackshiao.financial.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jackshiao.financial.entity.PaymentOrder;

public interface PaymentOrderRepository extends JpaRepository<PaymentOrder, Integer> {

    Optional<PaymentOrder> findByMerchantTradeNo(String merchantTradeNo);
}
