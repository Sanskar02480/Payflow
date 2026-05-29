package com.payflow.transaction;

import com.payflow.transaction.dto.TransactionView;
import com.payflow.user.User;
import com.payflow.user.UserRepository;
import com.payflow.wallet.Wallet;
import com.payflow.wallet.WalletRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;

    /** Returns transactions where the caller is either sender or receiver. */
    @Transactional(readOnly = true)
    public Page<TransactionView> getOwnHistory(String email, int page, int size) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        Wallet wallet = walletRepository.findByUserId(user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Wallet not found"));

        return transactionRepository
                .findByWalletId(wallet.getId(), PageRequest.of(page, size))
                .map(t -> {
                    boolean sent = t.getSenderWallet().getId().equals(wallet.getId());
                    return new TransactionView(
                            t.getId(),
                            t.getSenderWallet().getUser().getEmail(),
                            t.getReceiverWallet().getUser().getEmail(),
                            t.getAmount(),
                            t.getStatus(),
                            sent ? "SENT" : "RECEIVED",
                            t.getCreatedAt()
                    );
                });
    }

    /** Admin view: every transaction in the system, newest first. */
    @Transactional(readOnly = true)
    public Page<TransactionView> getAllTransactions(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return transactionRepository.findAll(pageable)
                .map(t -> new TransactionView(
                        t.getId(),
                        t.getSenderWallet().getUser().getEmail(),
                        t.getReceiverWallet().getUser().getEmail(),
                        t.getAmount(),
                        t.getStatus(),
                        null,
                        t.getCreatedAt()
                ));
    }
}
