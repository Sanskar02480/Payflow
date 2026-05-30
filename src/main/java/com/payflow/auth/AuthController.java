package com.payflow.auth;

import com.payflow.auth.dto.AuthResponse;
import com.payflow.auth.dto.ForgotPasswordRequest;
import com.payflow.auth.dto.LoginRequest;
import com.payflow.auth.dto.RegisterRequest;
import com.payflow.auth.dto.ResetPasswordRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    /**
     * Step 1 of forgot-password. Returns the same generic message regardless of
     * whether the email exists, so we don't leak account existence to attackers.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        authService.forgotPassword(req.email());
        return ResponseEntity.ok(Map.of(
                "message",
                "If an account exists with that email, a reset link has been sent. " +
                "(Demo: check the backend console for the reset URL.)"
        ));
    }

    /**
     * Step 2 of forgot-password. Consumes the one-time token.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req.token(), req.newPassword());
        return ResponseEntity.ok(Map.of("message", "Password updated. You can now sign in."));
    }
}
