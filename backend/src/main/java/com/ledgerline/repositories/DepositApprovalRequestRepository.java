package com.ledgerline.repositories;

import com.ledgerline.models.DepositApprovalRequest;
import com.ledgerline.models.DepositApprovalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DepositApprovalRequestRepository extends JpaRepository<DepositApprovalRequest, UUID> {

    List<DepositApprovalRequest> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<DepositApprovalRequest> findAllByOrderByCreatedAtDesc();

    List<DepositApprovalRequest> findByStatusOrderByCreatedAtDesc(DepositApprovalStatus status);

    List<DepositApprovalRequest> findByAccountIdOrderByCreatedAtDesc(UUID accountId);

    long countByStatus(DepositApprovalStatus status);
}

