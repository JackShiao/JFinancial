package com.jackshiao.financial.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {

    @NotBlank(message = "請輸入目前的密碼")
    private String currentPassword;

    @NotBlank(message = "新密碼不可為空")
    @Size(min = 8, max = 100, message = "新密碼長度須介於 8～100 個字元")
    private String newPassword;
}
