package com.ledgerline.services;

import com.ledgerline.dto.CreateDepositApprovalDto;
import com.ledgerline.dto.DepositApprovalResponse;
import com.ledgerline.dto.DepositRequest;
import com.ledgerline.dto.ReviewDepositApprovalDto;
import com.ledgerline.dto.TransactionResponse;
import com.ledgerline.exceptions.AccountNotFoundException;
import com.ledgerline.exceptions.InvalidTransactionException;
import com.ledgerline.exceptions.UnauthorizedAccessException;
import com.ledgerline.models.Account;
import com.ledgerline.models.AccountStatus;
import com.ledgerline.models.DepositApprovalRequest;
import com.ledgerline.models.DepositApprovalStatus;
import com.ledgerline.models.Role;
import com.ledgerline.models.Transaction;
import com.ledgerline.models.User;
import com.ledgerline.repositories.AccountRepository;
import com.ledgerline.repositories.DepositApprovalRequestRepository;
import com.ledgerline.repositories.TransactionRepository;
import com.ledgerline.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DepositApprovalService {

    private final DepositApprovalRequestRepository depositApprovalRequestRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final DepositService depositService;
    private final AuditService auditService;
    private final TransactionRepository transactionRepository;

    public DepositApprovalService(
            DepositApprovalRequestRepository depositApprovalRequestRepository,
            AccountRepository accountRepository,
            UserRepository userRepository,
            DepositService depositService,
            AuditService auditService,
            TransactionRepository transactionRepository) {
        this.depositApprovalRequestRepository = depositApprovalRequestRepository;
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.depositService = depositService;
        this.auditService = auditService;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public DepositApprovalResponse createRequest(UUID userId, CreateDepositApprovalDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedAccessException("User not found: " + userId));

        if (dto.getAmount() == null || dto.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidTransactionException("Deposit amount must be strictly greater than zero.");
        }

        Account account;
        if (dto.getAccountId() != null) {
            account = accountRepository.findById(dto.getAccountId())
                    .orElseThrow(() -> new AccountNotFoundException("Account not found: " + dto.getAccountId()));
        } else if (dto.getAccountIdentifier() != null) {
            String query = dto.getAccountIdentifier().trim();
            try {
                account = accountRepository.findById(UUID.fromString(query))
                        .orElseThrow(() -> new AccountNotFoundException("Account not found: " + query));
            } catch (IllegalArgumentException e) {
                account = accountRepository.findByAccountNumber(query)
                        .orElseThrow(() -> new AccountNotFoundException("Account not found with number: " + query));
            }
        } else {
            throw new InvalidTransactionException("Target account ID or Account Number is required.");
        }

        // Ownership enforcement (unless ADMIN proposing)
        if (user.getRole() != Role.ADMIN && !account.getOwner().getId().equals(userId)) {
            throw new UnauthorizedAccessException("Cannot request deposits for accounts you do not own.");
        }

        if (account.isSystem()) {
            throw new UnauthorizedAccessException("Direct deposit into system clearing accounts is strictly forbidden.");
        }

        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new InvalidTransactionException("Target account is " + account.getStatus() + ". Only ACTIVE accounts can receive deposits.");
        }

        DepositApprovalRequest request = new DepositApprovalRequest(
                account,
                user,
                dto.getAmount(),
                account.getCurrency(),
                dto.getReferenceMemo() != null ? dto.getReferenceMemo().trim() : "External Inward Remittance"
        );

        DepositApprovalRequest saved = depositApprovalRequestRepository.save(request);

        auditService.recordAudit(
                userId,
                user.getRole().name(),
                "CREATE_DEPOSIT_REQUEST",
                "DEPOSIT_APPROVAL",
                "PENDING",
                "Proposed deposit of " + dto.getAmount() + " " + account.getCurrency() + " for account " + account.getAccountNumber()
        );

        return DepositApprovalResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<DepositApprovalResponse> getUserRequests(UUID userId) {
        return depositApprovalRequestRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(DepositApprovalResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DepositApprovalResponse> getAllRequests(DepositApprovalStatus status) {
        List<DepositApprovalRequest> list = (status != null)
                ? depositApprovalRequestRepository.findByStatusOrderByCreatedAtDesc(status)
                : depositApprovalRequestRepository.findAllByOrderByCreatedAtDesc();

        return list.stream()
                .map(DepositApprovalResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public DepositApprovalResponse approveRequest(UUID requestId, UUID adminId, ReviewDepositApprovalDto reviewDto) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new UnauthorizedAccessException("Admin user not found: " + adminId));

        if (admin.getRole() != Role.ADMIN) {
            throw new UnauthorizedAccessException("Only administrators are authorized to approve deposit requests.");
        }

        DepositApprovalRequest request = depositApprovalRequestRepository.findById(requestId)
                .orElseThrow(() -> new InvalidTransactionException("Deposit approval request not found: " + requestId));

        if (request.getStatus() != DepositApprovalStatus.PENDING) {
            throw new InvalidTransactionException("Cannot approve request in status: " + request.getStatus());
        }

        UUID targetAccountId = request.getAccount().getId();
        String accountNumber = request.getAccount().getAccountNumber();
        BigDecimal amount = request.getAmount();

        String idempotencyKey = "DEP-APPROVAL-" + request.getId();
        DepositRequest execReq = new DepositRequest(
                targetAccountId,
                amount,
                "Admin Approved Deposit: " + (request.getReferenceMemo() != null ? request.getReferenceMemo() : "Treasury Remittance")
        );

        // Execute atomic double-entry: DEBIT SYSTEM_FUNDING, CREDIT Target Account
        TransactionResponse txResp = depositService.deposit(execReq, idempotencyKey, adminId);

        Transaction tx = transactionRepository.findById(txResp.getTransactionId()).orElse(null);

        request.setStatus(DepositApprovalStatus.APPROVED);
        request.setReviewedBy(admin);
        request.setTransaction(tx);
        request.setAdminNotes(reviewDto != null && reviewDto.getAdminNotes() != null && !reviewDto.getAdminNotes().trim().isEmpty()
                ? reviewDto.getAdminNotes().trim()
                : "Approved and settled by treasury administrator");

        DepositApprovalRequest saved = depositApprovalRequestRepository.save(request);

        auditService.recordAudit(
                adminId,
                "ADMIN",
                "APPROVE_DEPOSIT_REQUEST",
                "DEPOSIT_APPROVAL",
                "APPROVED",
                "Approved deposit of " + amount + " for account " + accountNumber + ". TX: " + txResp.getTransactionId()
        );

        return DepositApprovalResponse.fromEntity(saved);
    }

    @Transactional
    public DepositApprovalResponse rejectRequest(UUID requestId, UUID adminId, ReviewDepositApprovalDto reviewDto) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new UnauthorizedAccessException("Admin user not found: " + adminId));

        if (admin.getRole() != Role.ADMIN) {
            throw new UnauthorizedAccessException("Only administrators are authorized to reject deposit requests.");
        }

        DepositApprovalRequest request = depositApprovalRequestRepository.findById(requestId)
                .orElseThrow(() -> new InvalidTransactionException("Deposit approval request not found: " + requestId));

        if (request.getStatus() != DepositApprovalStatus.PENDING) {
            throw new InvalidTransactionException("Cannot reject request in status: " + request.getStatus());
        }

        request.setStatus(DepositApprovalStatus.REJECTED);
        request.setReviewedBy(admin);
        request.setAdminNotes(reviewDto != null && reviewDto.getAdminNotes() != null && !reviewDto.getAdminNotes().trim().isEmpty()
                ? reviewDto.getAdminNotes().trim()
                : "Rejected by administrator review");

        DepositApprovalRequest saved = depositApprovalRequestRepository.save(request);

        auditService.recordAudit(
                adminId,
                "ADMIN",
                "REJECT_DEPOSIT_REQUEST",
                "DEPOSIT_APPROVAL",
                "REJECTED",
                "Rejected deposit request of " + request.getAmount() + " for account " + request.getAccount().getAccountNumber()
        );

        return DepositApprovalResponse.fromEntity(saved);
    }
}
