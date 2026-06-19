package com.jackshiao.financial.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateDisplayNameRequest {

    @NotBlank(message = "顯示名稱不可為空白")
    @Size(min = 1, max = 50, message = "顯示名稱長度需在 1~50 個字元之間")
    private String displayName;
}
