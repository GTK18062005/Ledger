package com.ledgerline.controllers;

import com.ledgerline.dto.AccountOpeningResponse;
import com.ledgerline.dto.CreateAccountOpeningDto;
import com.ledgerline.dto.ReviewDepositApprovalDto;
import com.ledgerline.models.DepositApprovalStatus;
import com.ledgerline.models.Role;
import com.ledgerline.services.AccountOpeningService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/account-requests")
public class AccountOpeningController {

    private final AccountOpeningService accountOpeningService;

    public AccountOpeningController(AccountOpeningService accountOpeningService) {
        this.accountOpeningService = accountOpeningService;
    }

    private UUID getUserId(Authentication auth) {
        return (UUID) auth.getPrincipal();
    }

    private Role getUserRole(Authentication auth) {
        String authority = auth.getAuthorities().iterator().next().getAuthority();
        return Role.valueOf(authority.replace("ROLE_", ""));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ACCOUNT_HOLDER', 'ADMIN')")
    public ResponseEntity<AccountOpeningResponse> createAccountRequest(
            @Valid @RequestBody CreateAccountOpeningDto dto,
            Authentication authentication) {
        AccountOpeningResponse response = accountOpeningService.createRequest(getUserId(authentication), dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ACCOUNT_HOLDER', 'ADMIN', 'AUDITOR')")
    public ResponseEntity<List<AccountOpeningResponse>> getAccountRequests(
            @RequestParam(required = false) DepositApprovalStatus status,
            Authentication authentication) {
        Role role = getUserRole(authentication);
        UUID userId = getUserId(authentication);

        List<AccountOpeningResponse> responses;
        if (role == Role.ADMIN || role == Role.AUDITOR) {
            responses = accountOpeningService.getAllRequests(status);
        } else {
            responses = accountOpeningService.getUserRequests(userId);
        }
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AccountOpeningResponse> approveAccountRequest(
            @PathVariable UUID id,
            @RequestBody(required = false) ReviewDepositApprovalDto reviewDto,
            Authentication authentication) {
        AccountOpeningResponse response = accountOpeningService.approveRequest(id, getUserId(authentication), reviewDto);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AccountOpeningResponse> rejectAccountRequest(
            @PathVariable UUID id,
            @RequestBody(required = false) ReviewDepositApprovalDto reviewDto,
            Authentication authentication) {
        AccountOpeningResponse response = accountOpeningService.rejectRequest(id, getUserId(authentication), reviewDto);
        return ResponseEntity.ok(response);
    }
}

