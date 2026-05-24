package com.jackshiao.financial.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionPlanDto {

    private Integer id;
    private String code;
    private String name;
    private Integer priceTwd;
    private Integer durationDays;
}
