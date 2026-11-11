package com.ledgerline.controllers;

import com.ledgerline.dto.PlatformTransactionResponse;
import com.ledgerline.dto.ReverseTransactionRequest;
import com.ledgerline.services.PlatformGovernanceService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
public class PlatformTransactionController {

    private final PlatformGovernanceService governanceService;

    public PlatformTransactionController(PlatformGovernanceService governanceService) {
        this.governanceService = governanceService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public ResponseEntity<List<PlatformTransactionResponse>> getAllTransactions() {
        return ResponseEntity.ok(governanceService.getAllPlatformTransactions());
    }

    @PostMapping("/{id}/reverse")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PlatformTransactionResponse> reverseTransaction(
            @PathVariable("id") UUID id,
            @Valid @RequestBody(required = false) ReverseTransactionRequest request,
            Authentication authentication) {
        UUID adminId = (UUID) authentication.getPrincipal();
        String reason = request != null ? request.getReason() : null;
        return ResponseEntity.ok(governanceService.reverseTransaction(id, adminId, reason));
    }
}

