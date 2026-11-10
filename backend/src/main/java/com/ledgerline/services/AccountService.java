package com.ledgerline.services;

import com.ledgerline.dto.AccountResponse;
import com.ledgerline.dto.AggregateBalanceResponse;
import com.ledgerline.dto.CreateAccountRequest;
import com.ledgerline.exceptions.AccountNotFoundException;
import com.ledgerline.exceptions.InvalidTransactionException;
import com.ledgerline.exceptions.UnauthorizedAccessException;
import com.ledgerline.models.*;
import com.ledgerline.repositories.AccountRepository;
import com.ledgerline.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public AccountService(AccountRepository accountRepository, UserRepository userRepository, AuditService auditService) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional
    public AccountResponse createAccount(CreateAccountRequest request, UUID adminId) {
        if (accountRepository.existsByAccountNumber(request.getAccountNumber().trim())) {
            throw new InvalidTransactionException("Account number already exists: " + request.getAccountNumber());
        }

        User owner = userRepository.findById(request.getOwnerId())
                .orElseThrow(() -> new AccountNotFoundException("Owner user not found with ID: " + request.getOwnerId()));

        Account account = new Account(
                request.getAccountNumber().trim(),
                owner,
                request.getInitialBalance() != null ? request.getInitialBalance() : BigDecimal.ZERO,
                request.getCurrency() != null ? request.getCurrency().trim().toUpperCase() : "INR"
        );

        Account saved = accountRepository.save(account);

        auditService.recordAudit(
                adminId,
                Role.ADMIN.name(),
                "CREATE_ACCOUNT",
                saved.getId().toString(),
                "SUCCESS",
                "Created account " + saved.getAccountNumber() + " for user " + owner.getEmail() + " with balance " + saved.getBalance()
        );

        return mapToResponse(saved);
    }

    @Transactional
    public AccountResponse openAccountForUser(UUID userId, String currency) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new AccountNotFoundException("User not found: " + userId));

        String cleanCurrency = (currency != null && !currency.isBlank()) ? currency.trim().toUpperCase() : "INR";
        String randomSuffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String accountNumber = "ACC-USR-" + randomSuffix;

        Account account = new Account(accountNumber, owner, BigDecimal.ZERO, cleanCurrency);
        Account saved = accountRepository.save(account);

        auditService.recordAudit(
                userId,
                owner.getRole().name(),
                "OPEN_ADDITIONAL_ACCOUNT",
                saved.getAccountNumber(),
                "SUCCESS",
                "Opened new account: " + accountNumber + " (" + cleanCurrency + ")"
        );

        return mapToResponse(saved);
    }

    @Transactional
    public AccountResponse updateAccountStatus(UUID accountId, AccountStatus newStatus, String adminReason, UUID adminId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with ID: " + accountId));

        AccountStatus oldStatus = account.getStatus();
        account.setStatus(newStatus);
        Account saved = accountRepository.save(account);

        auditService.recordAudit(
                adminId,
                Role.ADMIN.name(),
                "ACCOUNT_STATUS_CHANGE",
                saved.getAccountNumber(),
                "SUCCESS",
                "Changed account status from " + oldStatus + " to " + newStatus + ". Reason: " + (adminReason != null ? adminReason : "None provided")
        );

        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> getAccounts(UUID currentUserId, Role currentRole) {
        if (currentRole == Role.ADMIN || currentRole == Role.AUDITOR) {
            return accountRepository.findAll().stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }

        return accountRepository.findByOwnerId(currentUserId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AccountResponse getAccountById(UUID accountId, UUID currentUserId, Role currentRole) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with ID: " + accountId));

        if (currentRole == Role.ACCOUNT_HOLDER && !account.getOwner().getId().equals(currentUserId)) {
            auditService.recordAudit(
                    currentUserId,
                    currentRole.name(),
                    "IDOR_ACCESS_ATTEMPT",
                    accountId.toString(),
                    "FORBIDDEN",
                    "Unauthorized attempt to access account " + account.getAccountNumber()
            );
            throw new UnauthorizedAccessException("Access denied: You do not own this account.");
        }

        return mapToResponse(account);
    }

    @Transactional(readOnly = true)
    public AggregateBalanceResponse getAggregateBalances() {
        long totalCount = accountRepository.count();
        long activeCount = accountRepository.countByStatus(AccountStatus.ACTIVE);
        BigDecimal totalBalance = accountRepository.sumBalanceByStatus(AccountStatus.ACTIVE);

        return new AggregateBalanceResponse(totalCount, activeCount, totalBalance, "INR");
    }

    public AccountResponse mapToResponse(Account account) {
        return new AccountResponse(
                account.getId(),
                account.getAccountNumber(),
                account.getOwner().getId(),
                account.getOwner().getEmail(),
                account.getBalance(),
                account.getCurrency(),
                account.getStatus(),
                account.getCreatedAt()
        );
    }
}
