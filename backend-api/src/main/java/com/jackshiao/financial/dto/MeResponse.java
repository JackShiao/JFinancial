package com.jackshiao.financial.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MeResponse {

    private String email;
    private String displayName;
    private boolean isPremium;
}
