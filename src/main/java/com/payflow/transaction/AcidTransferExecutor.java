package com.payflow.transaction;

import com.payflow.kafka.PaymentEventProducer;
import com.payflow.kafka.event.PaymentCompletedEvent;
import com.payflow.kafka.event.PaymentRefundedEvent;
import com.payflow.transaction.dto.RefundResponse;
import com.payflow.transaction.dto.TransferRequest;
import com.payflow.transaction.dto.TransferResponse;
import com.payflow.user.Role;
import com.payflow.user.User;
import com.payflow.user.UserRepository;
import com.payflow.wallet.Wallet;
import com.payflow.wallet.WalletRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Separated from PaymentService because Spring's @Retryable + @Transactional are
 * proxy-based -- an internal "this.method()" call bypasses the proxy and skips
 * both retry and transaction advice. Living in a different bean fixes that.
 *
 * Houses TWO atomic operations:
 *  - execute(...)       : the original Alice -> Bob transfer
 *  - executeRefund(...) : the compensating Bob -> Alice movement, plus
 *                         flipping the original tx to REVERSED in the same DB tx
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AcidTransferExecutor {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final PaymentEventProducer paymentEventProducer;

    @Retryable(
            retryFor = ObjectOptimisticLockingFailureException.class,
            maxAttempts = 3,
            backoff = @Backoff(delay = 50, multiplier = 2)
    )
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public TransferResponse execute(String senderEmail, String idempotencyKey, TransferRequest req) {

        // DB-level idempotency safety net (unique constraint on idempotency_key).
        var existing = transactionRepository.findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            Transaction t = existing.get();
            return new TransferResponse(
                    t.getId(),
                    t.getSenderWallet().getUser().getEmail(),
                    t.getReceiverWallet().getUser().getEmail(),
                    t.getAmount(),
                    t.getStatus(),
                    t.getSenderWallet().getBalance(),
                    t.getCreatedAt(),
                    true
            );
        }

        User sender = userRepository.findByEmail(senderEmail)
                .orElseThrow(() -> new EntityNotFoundException("Sender not found"));
        User receiver = userRepository.findByEmail(req.recipientEmail())
                .orElseThrow(() -> new EntityNotFoundException("Recipient not found"));

        if (sender.getId().equals(receiver.getId())) {
            throw new IllegalArgumentException("Cannot transfer to yourself");
        }

        Long senderWalletId = walletRepository.findByUserId(sender.getId())
                .orElseThrow(() -> new EntityNotFoundException("Sender wallet not found"))
                .getId();
        Long receiverWalletId = walletRepository.findByUserId(receiver.getId())
                .orElseThrow(() -> new EntityNotFoundException("Recipient wallet not found"))
                .getId();

        // Lock in ID order to avoid deadlock (A->B and B->A scenarios).
        Wallet[] locked = lockBoth(senderWalletId, receiverWalletId);
        Wallet senderWallet = locked[0];
        Wallet receiverWallet = locked[1];

        if (senderWallet.getBalance().compareTo(req.amount()) < 0) {
            throw new IllegalArgumentException("Insufficient balance");
        }

        BigDecimal newSenderBalance = senderWallet.getBalance().subtract(req.amount());
        BigDecimal newReceiverBalance = receiverWallet.getBalance().add(req.amount());
        senderWallet.setBalance(newSenderBalance);
        receiverWallet.setBalance(newReceiverBalance);
        walletRepository.save(senderWallet);
        walletRepository.save(receiverWallet);

        Transaction tx = Transaction.builder()
                .senderWallet(senderWallet)
                .receiverWallet(receiverWallet)
                .amount(req.amount())
                .status(TransactionStatus.COMPLETED)
                .idempotencyKey(idempotencyKey)
                .build();
        tx = transactionRepository.saveAndFlush(tx);

        final Long txId = tx.getId();
        final Instant createdAt = tx.getCreatedAt();
        final PaymentCompletedEvent event = new PaymentCompletedEvent(
                txId,
                senderWallet.getId(),
                receiverWallet.getId(),
                sender.getEmail(),
                receiver.getEmail(),
                req.amount(),
                idempotencyKey,
                Instant.now()
        );

        // Publish to Kafka ONLY after the DB transaction commits.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                paymentEventProducer.publishPaymentCompleted(event);
            }
        });

        return new TransferResponse(
                txId,
                sender.getEmail(),
                receiver.getEmail(),
                req.amount(),
                TransactionStatus.COMPLETED,
                newSenderBalance,
                createdAt,
                false
        );
    }

    /**
     * Atomic refund:
     *   1) Verify caller is sender of the original OR has ADMIN role.
     *   2) Verify the original is COMPLETED and not already REVERSED.
     *   3) Lock both wallets in id order.
     *   4) Verify the original recipient still has enough balance to refund.
     *   5) Move money recipient -> sender (debit, credit).
     *   6) Insert a REFUND transaction with refundOfTransactionId set.
     *   7) Flip the original's status to REVERSED.
     *   8) Publish payment_refunded after commit.
     */
    @Retryable(
            retryFor = ObjectOptimisticLockingFailureException.class,
            maxAttempts = 3,
            backoff = @Backoff(delay = 50, multiplier = 2)
    )
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public RefundResponse executeRefund(String callerEmail, Long originalTxId, String idempotencyKey) {

        // Idempotency safety net: if a row with this refund key exists, return it.
        var existingRefund = transactionRepository.findByIdempotencyKey(idempotencyKey);
        if (existingRefund.isPresent()) {
            Transaction r = existingRefund.get();
            // Re-resolve the original to surface the right sender/recipient labels.
            Transaction orig = transactionRepository.findById(r.getRefundOfTransactionId())
                    .orElseThrow(() -> new EntityNotFoundException("Original transaction not found"));
            return new RefundResponse(
                    r.getId(), orig.getId(),
                    orig.getSenderWallet().getUser().getEmail(),
                    orig.getReceiverWallet().getUser().getEmail(),
                    r.getAmount(),
                    r.getStatus(),
                    r.getReceiverWallet().getBalance(),
                    r.getCreatedAt(),
                    true
            );
        }

        Transaction original = transactionRepository.findById(originalTxId)
                .orElseThrow(() -> new EntityNotFoundException("Transaction not found"));

        User caller = userRepository.findByEmail(callerEmail)
                .orElseThrow(() -> new EntityNotFoundException("Caller not found"));

        // Auth: only the original sender or an ADMIN can refund.
        boolean isAdmin = caller.getRole() == Role.ADMIN;
        boolean isOriginalSender = original.getSenderWallet().getUser().getId().equals(caller.getId());
        if (!isAdmin && !isOriginalSender) {
            throw new AccessDeniedException("Only the sender or an admin can refund this transaction");
        }

        if (original.getStatus() != TransactionStatus.COMPLETED) {
            throw new IllegalStateException(
                    "Only COMPLETED transactions can be refunded (current status: " + original.getStatus() + ")");
        }

        Long origSenderWalletId = original.getSenderWallet().getId();
        Long origReceiverWalletId = original.getReceiverWallet().getId();

        // Lock both wallets in id order to avoid deadlocks with concurrent transfers.
        Wallet[] locked = lockBoth(origReceiverWalletId, origSenderWalletId);
        // Resolve which is which after the sort.
        Wallet refundSender   = locked[0].getId().equals(origReceiverWalletId) ? locked[0] : locked[1]; // recipient pays back
        Wallet refundReceiver = locked[0].getId().equals(origSenderWalletId)   ? locked[0] : locked[1]; // original sender gets money back

        BigDecimal amount = original.getAmount();
        if (refundSender.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException(
                    "Refund failed: original recipient no longer has enough balance to return the funds");
        }

        refundSender.setBalance(refundSender.getBalance().subtract(amount));
        refundReceiver.setBalance(refundReceiver.getBalance().add(amount));
        walletRepository.save(refundSender);
        walletRepository.save(refundReceiver);

        // Insert the compensating REFUND row.
        Transaction refundTx = Transaction.builder()
                .senderWallet(refundSender)
                .receiverWallet(refundReceiver)
                .amount(amount)
                .status(TransactionStatus.REFUND)
                .idempotencyKey(idempotencyKey)
                .refundOfTransactionId(original.getId())
                .build();
        refundTx = transactionRepository.saveAndFlush(refundTx);

        // Flip the original to REVERSED so it can't be refunded again.
        original.setStatus(TransactionStatus.REVERSED);
        transactionRepository.saveAndFlush(original);

        final Long refundId = refundTx.getId();
        final Instant refundedAt = refundTx.getCreatedAt();
        final BigDecimal refundReceiverNewBalance = refundReceiver.getBalance();
        final PaymentRefundedEvent event = new PaymentRefundedEvent(
                refundId,
                original.getId(),
                refundSender.getId(),
                refundReceiver.getId(),
                original.getSenderWallet().getUser().getEmail(),
                original.getReceiverWallet().getUser().getEmail(),
                amount,
                idempotencyKey,
                Instant.now()
        );

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                paymentEventProducer.publishPaymentRefunded(event);
            }
        });

        return new RefundResponse(
                refundId,
                original.getId(),
                original.getSenderWallet().getUser().getEmail(),
                original.getReceiverWallet().getUser().getEmail(),
                amount,
                TransactionStatus.REFUND,
                refundReceiverNewBalance,
                refundedAt,
                false
        );
    }

    /**
     * Pessimistically locks both wallets, sorted by id, to avoid the classic
     * A->B vs B->A deadlock pattern.
     * Returns the pair in **input order** (locked[0] = first arg, locked[1] = second arg).
     */
    private Wallet[] lockBoth(Long aId, Long bId) {
        Long firstId = Math.min(aId, bId);
        Long secondId = Math.max(aId, bId);
        Wallet first = walletRepository.findByIdForUpdate(firstId)
                .orElseThrow(() -> new EntityNotFoundException("Wallet vanished mid-flight"));
        Wallet second = walletRepository.findByIdForUpdate(secondId)
                .orElseThrow(() -> new EntityNotFoundException("Wallet vanished mid-flight"));
        // Return in the caller's argument order.
        Wallet a = first.getId().equals(aId) ? first : second;
        Wallet b = first.getId().equals(bId) ? first : second;
        return new Wallet[]{a, b};
    }
}
