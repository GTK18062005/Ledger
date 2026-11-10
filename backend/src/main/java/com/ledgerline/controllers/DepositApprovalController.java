package com.ledgerline.controllers;

import com.ledgerline.dto.CreateDepositApprovalDto;
import com.ledgerline.dto.DepositApprovalResponse;
import com.ledgerline.dto.ReviewDepositApprovalDto;
import com.ledgerline.models.DepositApprovalStatus;
import com.ledgerline.models.Role;
import com.ledgerline.services.DepositApprovalService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/deposit-requests")
public class DepositApprovalController {

    private final DepositApprovalService depositApprovalService;

    public DepositApprovalController(DepositApprovalService depositApprovalService) {
        this.depositApprovalService = depositApprovalService;
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
    public ResponseEntity<DepositApprovalResponse> createDepositRequest(
            @Valid @RequestBody CreateDepositApprovalDto dto,
            Authentication authentication) {
        DepositApprovalResponse response = depositApprovalService.createRequest(getUserId(authentication), dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ACCOUNT_HOLDER', 'ADMIN', 'AUDITOR')")
    public ResponseEntity<List<DepositApprovalResponse>> getDepositRequests(
            @RequestParam(required = false) DepositApprovalStatus status,
            Authentication authentication) {
        Role role = getUserRole(authentication);
        UUID userId = getUserId(authentication);

        List<DepositApprovalResponse> responses;
        if (role == Role.ADMIN || role == Role.AUDITOR) {
            responses = depositApprovalService.getAllRequests(status);
        } else {
            responses = depositApprovalService.getUserRequests(userId);
        }
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DepositApprovalResponse> approveDepositRequest(
            @PathVariable UUID id,
            @RequestBody(required = false) ReviewDepositApprovalDto reviewDto,
            Authentication authentication) {
        DepositApprovalResponse response = depositApprovalService.approveRequest(id, getUserId(authentication), reviewDto);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DepositApprovalResponse> rejectDepositRequest(
            @PathVariable UUID id,
            @RequestBody(required = false) ReviewDepositApprovalDto reviewDto,
            Authentication authentication) {
        DepositApprovalResponse response = depositApprovalService.rejectRequest(id, getUserId(authentication), reviewDto);
        return ResponseEntity.ok(response);
    }
}

