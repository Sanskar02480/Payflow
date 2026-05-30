package com.payflow.auth;

import com.payflow.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * One-time token for the "forgot password" flow.
 * - Random UUID stored in `token` (unique).
 * - 15-minute expiry by default (configurable).
 * - `used` flag flips on successful reset so the same token cannot be reused.
 */
@Entity
@Table(name = "password_reset_tokens", indexes = {
        @Index(name = "ux_password_reset_token", columnList = "token", unique = true),
        @Index(name = "ix_password_reset_user", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean used;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public boolean isExpired() {
        return expiresAt.isBefore(Instant.now());
    }
}
