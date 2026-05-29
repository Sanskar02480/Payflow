package com.payflow.wallet;

import com.payflow.user.User;
import com.payflow.user.UserRepository;
import com.payflow.wallet.dto.WalletBalanceResponse;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public WalletBalanceResponse getBalanceForEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        Wallet wallet = walletRepository.findByUserId(user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Wallet not found for user"));
        return new WalletBalanceResponse(wallet.getId(), user.getEmail(), wallet.getBalance());
    }
}
