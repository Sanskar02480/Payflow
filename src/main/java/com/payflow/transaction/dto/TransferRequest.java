package com.payflow.transaction.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record TransferRequest(
        @Email @NotBlank String recipientEmail,

        @NotNull
        @DecimalMin(value = "0.01", message = "Amount must be > 0")
        @Digits(integer = 13, fraction = 2)
        BigDecimal amount
) {}
