package com.jackshiao.financial.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.jackshiao.financial.entity.MemberSubscription;
import com.jackshiao.financial.entity.enums.SubscriptionStatus;

public interface MemberSubscriptionRepository extends JpaRepository<MemberSubscription, Integer> {

    /**
     * 查詢特定會員、特定狀態的最新訂閱（expire_at 最晚）
     */
    Optional<MemberSubscription> findTopByMemberIdAndStatusOrderByExpireAtDesc(
            Integer memberId, SubscriptionStatus status);

    /**
     * 查詢特定會員最新的一筆訂閱（不限狀態）
     */
    Optional<MemberSubscription> findTopByMemberIdOrderByExpireAtDesc(Integer memberId);

    /**
     * 判斷指定 email 的會員是否有尚未到期的 ACTIVE 訂閱
     */
    boolean existsByMemberEmailAndStatusAndExpireAtAfter(
            String email, SubscriptionStatus status, LocalDateTime now);
}
