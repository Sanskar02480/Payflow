package com.payflow.transaction.dto;

import com.payflow.transaction.TransactionStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record TransactionView(
        Long id,
        String senderEmail,
        String recipientEmail,
        BigDecimal amount,
        TransactionStatus status,
        /** "SENT" or "RECEIVED" relative to caller. Null for admin view. */
        String direction,
        /** Set on status=REFUND rows; points back to the original Transaction id. */
        Long refundOfTransactionId,
        /** Convenience flag: true if the caller is the original sender AND
         *  status is COMPLETED -- i.e. the UI should show a Refund button. */
        boolean refundable,
        Instant createdAt
) {}
