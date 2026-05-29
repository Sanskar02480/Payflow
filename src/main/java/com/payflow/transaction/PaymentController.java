package com.payflow.transaction;

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
}
