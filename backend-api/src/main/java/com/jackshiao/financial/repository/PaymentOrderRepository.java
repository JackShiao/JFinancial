package com.jackshiao.financial.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.jackshiao.financial.entity.PaymentOrder;

import jakarta.persistence.LockModeType;

public interface PaymentOrderRepository extends JpaRepository<PaymentOrder, Integer> {

    Optional<PaymentOrder> findByMerchantTradeNo(String merchantTradeNo);

    /** 使用 SELECT ... FOR UPDATE 鎖定訂單行，防止並發 notify 重複入帳 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM PaymentOrder o WHERE o.merchantTradeNo = :tradeNo")
    Optional<PaymentOrder> findByMerchantTradeNoForUpdate(@Param("tradeNo") String tradeNo);
}
