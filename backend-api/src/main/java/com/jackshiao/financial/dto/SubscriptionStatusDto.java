package com.jackshiao.financial.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionStatusDto {

    /** 是否有有效的 Premium 訂閱 */
    private boolean active;

    /** 訂閱方案名稱，無訂閱時為 null */
    private String planName;

    /** 訂閱到期時間，無訂閱時為 null */
    private LocalDateTime expireAt;
}
