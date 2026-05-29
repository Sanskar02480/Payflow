package com.payflow.wallet.dto;

import java.math.BigDecimal;

public record WalletBalanceResponse(
        Long walletId,
        String email,
        BigDecimal balance
) {}
