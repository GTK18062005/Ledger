package com.ledgerline.services;

import com.ledgerline.dto.DepositRequest;
import com.ledgerline.dto.TransactionResponse;
import com.ledgerline.exceptions.AccountNotFoundException;
import com.ledgerline.exceptions.InvalidTransactionException;
import com.ledgerline.exceptions.UnauthorizedAccessException;
import com.ledgerline.models.*;
import com.ledgerline.repositories.AccountRepository;
import com.ledgerline.repositories.LedgerEntryRepository;
import com.ledgerline.repositories.TransactionRepository;
import com.ledgerline.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
public class DepositService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final SystemAccountService systemAccountService;

    public DepositService(
            AccountRepository accountRepository,
            TransactionRepository transactionRepository,
            LedgerEntryRepository ledgerEntryRepository,
            UserRepository userRepository,
            AuditService auditService,
            SystemAccountService systemAccountService) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.systemAccountService = systemAccountService;
    }

    /**
     * Executes atomic double-entry external deposit.
     * In accordance with strict double-entry principles:
     * - DEBIT: SYSTEM_FUNDING clearing account
     * - CREDIT: Customer Target Account
     * Mathematical Invariant: SUM(DEBITS) == SUM(CREDITS).
     */
    @Transactional
    public TransactionResponse deposit(DepositRequest request, String idempotencyKey, UUID initiatorId) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidTransactionException("Deposit amount must be strictly greater than zero.");
        }

        User initiator = userRepository.findById(initiatorId)
                .orElseThrow(() -> new UnauthorizedAccessException("Initiator user not found"));

        Account fundingAccount = systemAccountService.getOrCreateFundingAccount();
        UUID fundingId = fundingAccount.getId();
        UUID targetId = request.getAccountId();

        // Deterministic lock acquisition to prevent deadlocks and ensure fresh entity state
        Account lockedFunding;
        Account lockedTarget;
        if (fundingId.compareTo(targetId) < 0) {
            lockedFunding = accountRepository.findByIdWithLock(fundingId)
                    .orElseThrow(() -> new AccountNotFoundException("Funding account not found: " + fundingId));
            lockedTarget = accountRepository.findByIdWithLock(targetId)
                    .orElseThrow(() -> new AccountNotFoundException("Target account not found: " + targetId));
        } else {
            lockedTarget = accountRepository.findByIdWithLock(targetId)
                    .orElseThrow(() -> new AccountNotFoundException("Target account not found: " + targetId));
            lockedFunding = accountRepository.findByIdWithLock(fundingId)
                    .orElseThrow(() -> new AccountNotFoundException("Funding account not found: " + fundingId));
        }

        // Guard: Target account must not be a system account
        if (lockedTarget.isSystem()) {
            auditService.recordRefusal(initiatorId, initiator.getRole().name(), lockedTarget.getId(),
                    "DEPOSIT", lockedTarget.getAccountNumber(), request.getAmount(),
                    "SYSTEM_ACCOUNT_ACCESS", idempotencyKey,
                    "Caller attempted to deposit directly to a system clearing account");
            throw new UnauthorizedAccessException("Access denied: System accounts cannot receive external deposits.");
        }

        // Guard: Target account must be ACTIVE for financial operations
        if (lockedTarget.getStatus() != AccountStatus.ACTIVE) {
            auditService.recordRefusal(initiatorId, initiator.getRole().name(), lockedTarget.getId(),
                    "DEPOSIT", lockedTarget.getAccountNumber(), request.getAmount(),
                    "ACCOUNT_NOT_ACTIVE", idempotencyKey,
                    "Account status is " + lockedTarget.getStatus() + "; deposits are blocked");
            throw new InvalidTransactionException("Account is " + lockedTarget.getStatus() + ". Financial operations are not permitted.");
        }

        // Enforce RBAC & IDOR strictly on the locked entity
        if (initiator.getRole() == Role.AUDITOR) {
            auditService.recordRefusal(
                    initiatorId,
                    initiator.getRole().name(),
                    lockedTarget.getId(),
                    "DEPOSIT",
                    lockedTarget.getAccountNumber(),
                    request.getAmount(),
                    "UNAUTHORIZED_ACCESS",
                    idempotencyKey,
                    "Auditor role is strictly read-only and cannot execute deposits"
            );
            throw new UnauthorizedAccessException("Access denied: Auditor role is strictly read-only and cannot execute deposits.");
        }

        if (initiator.getRole() == Role.ACCOUNT_HOLDER && !lockedTarget.getOwner().getId().equals(initiatorId)) {
            auditService.recordRefusal(
                    initiatorId,
                    initiator.getRole().name(),
                    lockedTarget.getId(),
                    "DEPOSIT",
                    lockedTarget.getAccountNumber(),
                    request.getAmount(),
                    "UNAUTHORIZED_ACCESS",
                    idempotencyKey,
                    "Unauthorized attempt to deposit to unowned account: " + lockedTarget.getAccountNumber()
            );
            throw new UnauthorizedAccessException("Access denied: You are not authorized to deposit to this account.");
        }

        BigDecimal amount = request.getAmount();

        // Mutate balances: System Funding is debited, Customer Account is credited
        lockedFunding.setBalance(lockedFunding.getBalance().subtract(amount));
        lockedTarget.setBalance(lockedTarget.getBalance().add(amount));

        accountRepository.save(lockedFunding);
        accountRepository.save(lockedTarget);

        // Record completed transaction
        Transaction tx = new Transaction(
                TransactionType.DEPOSIT,
                idempotencyKey,
                initiator,
                TransactionStatus.COMPLETED,
                null,
                amount
        );
        Transaction savedTx = transactionRepository.save(tx);

        // Strict Double-Entry Postings: One DEBIT (Funding), One CREDIT (Customer)
        LedgerEntry fundingDebit = new LedgerEntry(
                savedTx,
                lockedFunding,
                EntryType.DEBIT,
                amount,
                lockedFunding.getBalance()
        );
        LedgerEntry customerCredit = new LedgerEntry(
                savedTx,
                lockedTarget,
                EntryType.CREDIT,
                amount,
                lockedTarget.getBalance()
        );

        ledgerEntryRepository.save(fundingDebit);
        ledgerEntryRepository.save(customerCredit);

        auditService.recordAudit(
                initiatorId,
                initiator.getRole().name(),
                "DEPOSIT_COMPLETED",
                lockedTarget.getAccountNumber(),
                "SUCCESS",
                "External deposit of " + amount + " " + lockedTarget.getCurrency() + " credited via SYSTEM_FUNDING"
        );

        return new TransactionResponse(
                savedTx.getId(),
                savedTx.getTransactionType(),
                savedTx.getStatus(),
                savedTx.getAmount(),
                savedTx.getFailureReason(),
                lockedFunding.getId(),
                lockedTarget.getId(),
                idempotencyKey,
                savedTx.getCreatedAt()
        );
    }
}
