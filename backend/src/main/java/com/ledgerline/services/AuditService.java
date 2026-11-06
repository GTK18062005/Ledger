package com.ledgerline.services;

import com.ledgerline.models.AuditLog;
import com.ledgerline.repositories.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Persists general security audits in an isolated transaction so they survive outer rollbacks.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordAudit(UUID userId, String role, String action, String resource, String status, String details) {
        AuditLog audit = new AuditLog(userId, role, null, action, resource, status, null, null, null, details);
        auditLogRepository.saveAndFlush(audit);
    }

    /**
     * Persists refused transaction attempts with strict metadata required by Section 3:
     * Initiator ID, Account ID, Requested Amount, Attempt Timestamp, Failure Reason, Idempotency Key, Operation Type.
     * Committed independently via REQUIRES_NEW so it remains in PostgreSQL even if the caller throws an exception.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordRefusal(UUID userId, String role, UUID accountId, String operationType, String resource,
                              BigDecimal amount, String failureReason, String idempotencyKey, String details) {
        AuditLog audit = new AuditLog(
                userId,
                role,
                accountId,
                operationType,
                resource,
                "REFUSED",
                amount,
                failureReason,
                idempotencyKey,
                details
        );
        auditLogRepository.saveAndFlush(audit);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogs() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc();
    }
}
