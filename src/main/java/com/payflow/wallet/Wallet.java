package com.payflow.wallet;

import com.payflow.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Wallet holds a user's balance. @Version drives optimistic locking:
 * Hibernate adds " AND version = ?" to every UPDATE and bumps version by 1.
 * If two concurrent transactions read version=5 and both try to write version=6,
 * the second UPDATE returns 0 rows affected -> ObjectOptimisticLockingFailureException.
 */
@Entity
@Table(name = "wallets", indexes = {
        @Index(name = "ux_wallets_user_id", columnList = "user_id", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // DECIMAL(15,2): up to 13 digits before decimal + 2 after. Safe for fintech.
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal balance;

    @Version
    @Column(nullable = false)
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (balance == null) balance = BigDecimal.ZERO;
        if (createdAt == null) createdAt = Instant.now();
    }
}
