package com.payflow.auth;

import com.payflow.auth.dto.AuthResponse;
import com.payflow.auth.dto.LoginRequest;
import com.payflow.auth.dto.RegisterRequest;
import com.payflow.user.Role;
import com.payflow.user.User;
import com.payflow.user.UserRepository;
import com.payflow.wallet.Wallet;
import com.payflow.wallet.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

/**
 * Auth business logic.
 *
 *  - register: creates user + wallet atomically (Step 6).
 *  - login: validates password, mints JWT (short or long-lived).
 *  - forgotPassword: issues a single-use, time-limited reset token.
 *  - resetPassword: consumes the token and replaces the bcrypt hash.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Value("${payflow.password-reset.token-ttl-minutes}")
    private long resetTokenTtlMinutes;

    /**
     * Register: persists user with bcrypt-hashed password and auto-creates an
     * empty wallet in the same DB transaction. If wallet insert fails, the
     * user insert rolls back too -- no orphan accounts.
     */
    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = User.builder()
                .email(req.email())
                .passwordHash(passwordEncoder.encode(req.password()))
                .role(Role.USER)
                .build();
        user = userRepository.save(user);

        Wallet wallet = Wallet.builder()
                .user(user)
                .balance(BigDecimal.ZERO)
                .build();
        walletRepository.save(wallet);

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getEmail(), user.getRole().name());
    }

    /**
     * Login: delegate password check to Spring Security's AuthenticationManager,
     * then mint a JWT. If rememberMe is true, the token is long-lived (~24h).
     */
    public AuthResponse login(LoginRequest req) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.email(), req.password())
            );
        } catch (Exception e) {
            throw new BadCredentialsException("Invalid email or password");
        }

        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        String token = jwtService.generateToken(
                user.getId(), user.getEmail(), user.getRole().name(), req.isRememberMe());
        return new AuthResponse(token, user.getEmail(), user.getRole().name());
    }

    /**
     * Forgot-password step 1: create a one-time reset token tied to the user.
     *
     * Security notes:
     *  - Always behave the same regardless of whether the email exists, so we
     *    don't leak which accounts are registered.
     *  - In production, dispatch the reset URL via email (SendGrid/SES/etc.).
     *    For this demo we log it to the server console with a clear DEMO banner.
     */
    @Transactional
    public void forgotPassword(String email) {
        Optional<User> maybeUser = userRepository.findByEmail(email);
        if (maybeUser.isEmpty()) {
            log.info("forgotPassword called for unknown email='{}' -- silently no-op", email);
            return;
        }
        User user = maybeUser.get();

        String token = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plus(resetTokenTtlMinutes, ChronoUnit.MINUTES);

        PasswordResetToken prt = PasswordResetToken.builder()
                .token(token)
                .user(user)
                .expiresAt(expiresAt)
                .used(false)
                .build();
        passwordResetTokenRepository.save(prt);

        // === DEMO ONLY -- replace with email provider in production ===
        log.warn("");
        log.warn("============================================================");
        log.warn("  PASSWORD RESET (DEMO)");
        log.warn("  Account:    {}", email);
        log.warn("  Reset URL:  http://localhost:5173/reset-password?token={}", token);
        log.warn("  Expires at: {}  ({} minutes)", expiresAt, resetTokenTtlMinutes);
        log.warn("============================================================");
        log.warn("");
    }

    /**
     * Forgot-password step 2: consume the token, replace the password hash.
     */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken prt = passwordResetTokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid reset token"));

        if (prt.isUsed()) {
            throw new IllegalArgumentException("This reset link has already been used");
        }
        if (prt.isExpired()) {
            throw new IllegalArgumentException("This reset link has expired. Request a new one.");
        }

        User user = prt.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        prt.setUsed(true);
        passwordResetTokenRepository.save(prt);

        log.info("Password reset successful for user={}", user.getEmail());
    }
}
