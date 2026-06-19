package com.jackshiao.financial.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank(message = "信箱不得為空")
    @Email(message = "信箱格式不正確")
    private String email;

    @NotBlank(message = "密碼不得為空")
    private String password;
}
