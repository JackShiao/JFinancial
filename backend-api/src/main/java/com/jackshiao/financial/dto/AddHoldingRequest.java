package com.jackshiao.financial.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class AddHoldingRequest {

    @NotBlank(message = "指數代號不可為空")
    @Size(max = 20, message = "指數代號最多 20 個字元")
    private String symbol;

    @NotNull(message = "持股數量不可為空")
    @DecimalMin(value = "0.0001", message = "持股數量須大於 0")
    @Digits(integer = 11, fraction = 4, message = "持股數量格式不正確")
    private BigDecimal quantity;

    @NotNull(message = "買入價格不可為空")
    @DecimalMin(value = "0.0001", message = "買入價格須大於 0")
    @Digits(integer = 11, fraction = 4, message = "買入價格格式不正確")
    private BigDecimal buyPrice;

    @NotNull(message = "買入日期不可為空")
    @PastOrPresent(message = "買入日期不可為未來日期")
    private LocalDate buyDate;

    @Size(max = 200, message = "備註最多 200 個字元")
    private String note;
}
