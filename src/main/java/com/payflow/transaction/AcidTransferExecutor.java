package com.payflow.transaction;

import com.payflow.kafka.PaymentEventProducer;
import com.payflow.kafka.event.PaymentCompletedEvent;
import com.payflow.transaction.dto.TransferRequest;
import com.payflow.transaction.dto.TransferResponse;
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
        Long firstId = Math.min(senderWalletId, receiverWalletId);
        Long secondId = Math.max(senderWalletId, receiverWalletId);
        Wallet first = walletRepository.findByIdForUpdate(firstId)
                .orElseThrow(() -> new EntityNotFoundException("Wallet vanished mid-flight"));
        Wallet second = walletRepository.findByIdForUpdate(secondId)
                .orElseThrow(() -> new EntityNotFoundException("Wallet vanished mid-flight"));

        Wallet senderWallet = first.getId().equals(senderWalletId) ? first : second;
        Wallet receiverWallet = first.getId().equals(senderWalletId) ? second : first;

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
        // Otherwise downstream sees a payment that may still roll back.
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
}
