package com.jackshiao.financial.repository;

import com.jackshiao.financial.entity.PortfolioHolding;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PortfolioHoldingRepository extends JpaRepository<PortfolioHolding, Integer> {

    List<PortfolioHolding> findByMemberEmailOrderByBuyDateDesc(String email);

    Optional<PortfolioHolding> findByIdAndMemberEmail(Integer id, String email);
}
