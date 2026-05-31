package com.payflow.transaction;

import com.payflow.redis.DailyLimitService;
import com.payflow.transaction.dto.DailySpentResponse;
import com.payflow.transaction.dto.RefundResponse;
import com.payflow.transaction.dto.TransferRequest;
import com.payflow.transaction.dto.TransferResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final DailyLimitService dailyLimitService;

    @PostMapping("/transfer")
    public ResponseEntity<TransferResponse> transfer(
            @AuthenticationPrincipal UserDetails principal,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody TransferRequest req
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("Idempotency-Key header is required");
        }
        try {
            // Validate it's a UUID -- prevents clients from passing predictable keys.
            UUID.fromString(idempotencyKey);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Idempotency-Key must be a valid UUID");
        }

        return ResponseEntity.ok(paymentService.transfer(principal.getUsername(), idempotencyKey, req));
    }

    /** How much the authenticated user has sent today, plus the cap and what's left. */
    @GetMapping("/daily-spent")
    public ResponseEntity<DailySpentResponse> dailySpent(@AuthenticationPrincipal UserDetails principal) {
        String email = principal.getUsername();
        return ResponseEntity.ok(new DailySpentResponse(
                dailyLimitService.getSpentToday(email),
                dailyLimitService.getDailyLimit(),
                dailyLimitService.getRemainingToday(email)
        ));
    }

    /**
     * Refund a completed transaction. Only the original sender or an ADMIN
     * can call this; enforced inside AcidTransferExecutor.executeRefund.
     * Requires an Idempotency-Key UUID separate from the original transfer's.
     */
    @PostMapping("/refund/{transactionId}")
    public ResponseEntity<RefundResponse> refund(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long transactionId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("Idempotency-Key header is required");
        }
        try {
            UUID.fromString(idempotencyKey);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Idempotency-Key must be a valid UUID");
        }
        return ResponseEntity.ok(
                paymentService.refund(principal.getUsername(), transactionId, idempotencyKey));
    }
}
