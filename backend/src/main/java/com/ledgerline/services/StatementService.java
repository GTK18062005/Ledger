package com.ledgerline.services;

import com.ledgerline.dto.StatementItemResponse;
import com.ledgerline.exceptions.AccountNotFoundException;
import com.ledgerline.exceptions.UnauthorizedAccessException;
import com.ledgerline.models.Account;
import com.ledgerline.models.AuditLog;
import com.ledgerline.models.EntryType;
import com.ledgerline.models.LedgerEntry;
import com.ledgerline.models.Role;
import com.ledgerline.models.TransactionStatus;
import com.ledgerline.models.User;
import com.ledgerline.repositories.AccountRepository;
import com.ledgerline.repositories.AuditLogRepository;
import com.ledgerline.repositories.LedgerEntryRepository;
import com.ledgerline.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class StatementService {

    private final AccountRepository accountRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public StatementService(AccountRepository accountRepository,
                            LedgerEntryRepository ledgerEntryRepository,
                            AuditLogRepository auditLogRepository,
                            UserRepository userRepository,
                            AuditService auditService) {
        this.accountRepository = accountRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<StatementItemResponse> getStatement(UUID accountId, UUID currentUserId, Role currentRole) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found: " + accountId));

        // Enforce RBAC & IDOR for statement access
        if (currentRole == Role.ACCOUNT_HOLDER && !account.getOwner().getId().equals(currentUserId)) {
            auditService.recordAudit(
                    currentUserId,
                    currentRole.name(),
                    "STATEMENT_IDOR_ATTEMPT",
                    accountId.toString(),
                    "FORBIDDEN",
                    "Unauthorized statement inspection attempt for account: " + account.getAccountNumber()
            );
            throw new UnauthorizedAccessException("Access denied: You do not own this account.");
        }

        List<LedgerEntry> entries = ledgerEntryRepository.findStatementEntriesByAccountId(accountId);
        List<StatementItemResponse> items = new ArrayList<>();

        for (LedgerEntry entry : entries) {
            items.add(new StatementItemResponse(
                    entry.getId(),
                    entry.getTransaction().getId(),
                    entry.getCreatedAt(),
                    entry.getTransaction().getInitiatedBy().getId(),
                    entry.getTransaction().getInitiatedBy().getEmail(),
                    entry.getTransaction().getInitiatedBy().getRole().name(),
                    entry.getEntryType(),
                    entry.getAmount(),
                    entry.getTransaction().getStatus(),
                    entry.getTransaction().getFailureReason(),
                    entry.getRunningBalanceAfter()
            ));
        }

        // Fetch refusal audit logs so statement view shows rejected attempts without bogus ledger entries
        List<AuditLog> refusedLogs = auditLogRepository.findByAccountIdAndStatusOrderByCreatedAtDesc(accountId, "REFUSED");
        for (AuditLog audit : refusedLogs) {
            String email = "N/A";
            if (audit.getUserId() != null) {
                email = userRepository.findById(audit.getUserId())
                        .map(User::getEmail)
                        .orElse("User " + audit.getUserId());
            }

            items.add(new StatementItemResponse(
                    audit.getId(),
                    null,
                    audit.getCreatedAt(),
                    audit.getUserId(),
                    email,
                    audit.getUserRole() != null ? audit.getUserRole() : "UNKNOWN",
                    EntryType.DEBIT,
                    audit.getAmount() != null ? audit.getAmount() : BigDecimal.ZERO,
                    TransactionStatus.REFUSED,
                    audit.getFailureReason() != null ? audit.getFailureReason() : audit.getDetails(),
                    account.getBalance()
            ));
        }

        items.sort(Comparator.comparing(StatementItemResponse::getTimestamp).reversed());
        return items;
    }
}

