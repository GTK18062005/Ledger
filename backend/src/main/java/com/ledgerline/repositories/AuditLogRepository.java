package com.ledgerline.repositories;

import com.ledgerline.models.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findAllByOrderByCreatedAtDesc();
    List<AuditLog> findByOperationTypeOrderByCreatedAtDesc(String operationType);
    List<AuditLog> findByAccountIdAndStatusOrderByCreatedAtDesc(UUID accountId, String status);
    List<AuditLog> findByAccountIdOrderByCreatedAtDesc(UUID accountId);
}

