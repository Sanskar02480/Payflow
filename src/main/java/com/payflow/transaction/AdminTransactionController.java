package com.payflow.transaction;

import com.payflow.transaction.dto.TransactionView;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin-only view of every transaction. SecurityConfig already restricts
 * /api/admin/** to ROLE_ADMIN; @PreAuthorize is a redundant method-level guard
 * so a future routing change can't accidentally expose it.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminTransactionController {

    private final TransactionService transactionService;

    @GetMapping("/transactions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<TransactionView>> allTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(transactionService.getAllTransactions(page, size));
    }
}
