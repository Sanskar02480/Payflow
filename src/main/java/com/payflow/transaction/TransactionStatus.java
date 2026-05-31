package com.payflow.transaction;

public enum TransactionStatus {
    PENDING,
    COMPLETED,
    FAILED,
    /** Original transaction that has been refunded. Linked to a REFUND row. */
    REVERSED,
    /** Compensating transaction created by a refund. Money moves recipient -> sender. */
    REFUND
}
