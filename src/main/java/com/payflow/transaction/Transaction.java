package com.payflow.transaction;

import com.payflow.wallet.Wallet;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Immutable ledger entry. Once written, never updated except status transitions.
 * idempotency_key carries the client's UUID so we can detect retries even if
 * Redis evicted the key (DB is the durable source of truth).
 */
@Entity
@Table(name = "transactions", indexes = {
        @Index(name = "ux_transactions_idempotency_key", columnList = "idempotency_key", unique = true),
        @Index(name = "ix_transactions_sender", columnList = "sender_wallet_id"),
        @Index(name = "ix_transactions_receiver", columnList = "receiver_wallet_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_wallet_id", nullable = false)
    private Wallet senderWallet;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receiver_wallet_id", nullable = false)
    private Wallet receiverWallet;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private TransactionStatus status;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 100)
    private String idempotencyKey;

    /**
     * For status=REFUND rows: id of the original Transaction this refund undoes.
     * For all other statuses: null.
     * Allows /history to render "Refund of #42" and prevents refunding a refund.
     */
    @Column(name = "refund_of_transaction_id")
    private Long refundOfTransactionId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (status == null) status = TransactionStatus.PENDING;
    }
}
