package com.payflow.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @Email @NotBlank String email,
        @NotBlank String password,
        // Optional; defaults to false. Clients leaving it out get the short-lived token.
        Boolean rememberMe
) {
    public boolean isRememberMe() {
        return Boolean.TRUE.equals(rememberMe);
    }
}
