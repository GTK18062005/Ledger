package com.ledgerline.controllers;

import com.ledgerline.dto.DepositRequest;
import com.ledgerline.dto.TransactionResponse;
import com.ledgerline.dto.TransferRequest;
import com.ledgerline.dto.WithdrawalRequest;
import com.ledgerline.services.DepositService;
import com.ledgerline.services.IdempotencyService;
import com.ledgerline.services.TransferService;
import com.ledgerline.services.WithdrawalService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class TransferController {

    private final TransferService transferService;
    private final WithdrawalService withdrawalService;
    private final DepositService depositService;
    private final IdempotencyService idempotencyService;

    public TransferController(
            TransferService transferService,
            WithdrawalService withdrawalService,
            DepositService depositService,
            IdempotencyService idempotencyService) {
        this.transferService = transferService;
        this.withdrawalService = withdrawalService;
        this.depositService = depositService;
        this.idempotencyService = idempotencyService;
    }

    private UUID getUserId(Authentication auth) {
        return (UUID) auth.getPrincipal();
    }

    @PostMapping("/transfers")
    @PreAuthorize("hasRole('ACCOUNT_HOLDER')")
    public ResponseEntity<TransactionResponse> transfer(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody TransferRequest request,
            Authentication authentication) {

        UUID userId = getUserId(authentication);
        Optional<TransactionResponse> cached = idempotencyService.coordinateExecution(
                idempotencyKey,
                userId,
                "TRANSFER",
                request,
                TransactionResponse.class
        );

        if (cached.isPresent()) {
            return ResponseEntity.ok(cached.get());
        }

        try {
            TransactionResponse response = transferService.transfer(request, idempotencyKey, userId);
            idempotencyService.markCompleted(idempotencyKey, response);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            idempotencyService.markFailed(idempotencyKey);
            throw e;
        }
    }

    @PostMapping("/withdrawals")
    @PreAuthorize("hasRole('ACCOUNT_HOLDER')")
    public ResponseEntity<TransactionResponse> withdraw(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody WithdrawalRequest request,
            Authentication authentication) {

        UUID userId = getUserId(authentication);
        Optional<TransactionResponse> cached = idempotencyService.coordinateExecution(
                idempotencyKey,
                userId,
                "WITHDRAWAL",
                request,
                TransactionResponse.class
        );

        if (cached.isPresent()) {
            return ResponseEntity.ok(cached.get());
        }

        try {
            TransactionResponse response = withdrawalService.withdraw(request, idempotencyKey, userId);
            idempotencyService.markCompleted(idempotencyKey, response);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            idempotencyService.markFailed(idempotencyKey);
            throw e;
        }
    }

    @PostMapping("/deposits")
    @PreAuthorize("hasAnyRole('ACCOUNT_HOLDER', 'ADMIN')")
    public ResponseEntity<TransactionResponse> deposit(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody DepositRequest request,
            Authentication authentication) {

        UUID userId = getUserId(authentication);
        Optional<TransactionResponse> cached = idempotencyService.coordinateExecution(
                idempotencyKey,
                userId,
                "DEPOSIT",
                request,
                TransactionResponse.class
        );

        if (cached.isPresent()) {
            return ResponseEntity.ok(cached.get());
        }

        try {
            TransactionResponse response = depositService.deposit(request, idempotencyKey, userId);
            idempotencyService.markCompleted(idempotencyKey, response);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            idempotencyService.markFailed(idempotencyKey);
            throw e;
        }
    }
}
