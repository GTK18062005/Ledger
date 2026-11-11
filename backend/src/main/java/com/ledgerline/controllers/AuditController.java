package com.ledgerline.controllers;

import com.ledgerline.dto.IntegrityVerificationResponse;
import com.ledgerline.models.AuditLog;
import com.ledgerline.services.AuditService;
import com.ledgerline.services.PlatformGovernanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditController {

    private final AuditService auditService;
    private final PlatformGovernanceService governanceService;

    public AuditController(AuditService auditService, PlatformGovernanceService governanceService) {
        this.auditService = auditService;
        this.governanceService = governanceService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        return ResponseEntity.ok(auditService.getAuditLogs());
    }

    @GetMapping("/integrity")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public ResponseEntity<IntegrityVerificationResponse> getIntegrityVerification() {
        return ResponseEntity.ok(governanceService.computeIntegrityReport());
    }
}

