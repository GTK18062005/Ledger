package com.ledgerline.repositories;

import com.ledgerline.models.AccountOpeningRequest;
import com.ledgerline.models.DepositApprovalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AccountOpeningRequestRepository extends JpaRepository<AccountOpeningRequest, UUID> {

    List<AccountOpeningRequest> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<AccountOpeningRequest> findByStatusOrderByCreatedAtDesc(DepositApprovalStatus status);

    List<AccountOpeningRequest> findAllByOrderByCreatedAtDesc();

    boolean existsByUserIdAndAccountTypeIgnoreCaseAndStatus(UUID userId, String accountType, DepositApprovalStatus status);
}

