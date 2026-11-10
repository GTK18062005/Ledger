package com.ledgerline.services;

import com.ledgerline.dto.TransactionResponse;
import com.ledgerline.dto.TransferRequest;
import com.ledgerline.exceptions.AccountNotFoundException;
import com.ledgerline.exceptions.InsufficientFundsException;
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
public class TransferService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public TransferService(
            AccountRepository accountRepository,
            TransactionRepository transactionRepository,
            LedgerEntryRepository ledgerEntryRepository,
            UserRepository userRepository,
            AuditService auditService) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    /**
     * Executes atomic double-entry peer-to-peer transfer.
     * In accordance with strict double-entry principles:
     * - DEBIT: Source Customer Account
     * - CREDIT: Destination Customer Account
     * Mathematical Invariant: SUM(DEBITS) == SUM(CREDITS).
     * Refused attempts are recorded strictly as audit events and never pollute the financial ledger.
     */
    @Transactional
    public TransactionResponse transfer(TransferRequest request, String idempotencyKey, UUID initiatorId) {
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidTransactionException("Transfer amount must be strictly greater than zero.");
        }

        UUID sourceId = request.getSourceAccountId();
        if (sourceId == null && request.getSourceAccountIdentifier() != null) {
            String s = request.getSourceAccountIdentifier().trim();
            try {
                sourceId = UUID.fromString(s);
            } catch (IllegalArgumentException e) {
                Account acc = accountRepository.findByAccountNumber(s)
                        .orElseThrow(() -> new AccountNotFoundException("Source account not found: " + s));
                sourceId = acc.getId();
            }
        }

        UUID destId = request.getDestinationAccountId();
        if (destId == null && request.getDestinationAccountIdentifier() != null) {
            String d = request.getDestinationAccountIdentifier().trim();
            try {
                destId = UUID.fromString(d);
            } catch (IllegalArgumentException e) {
                Account acc = accountRepository.findByAccountNumber(d)
                        .orElseThrow(() -> new AccountNotFoundException("Destination account not found: " + d));
                destId = acc.getId();
            }
        }

        if (sourceId == null || destId == null) {
            throw new InvalidTransactionException("Source and destination accounts must be specified.");
        }

        if (sourceId.equals(destId)) {
            throw new InvalidTransactionException("Source and destination accounts must be different.");
        }

        final UUID finalSourceId = sourceId;
        final UUID finalDestId = destId;

        User initiator = userRepository.findById(initiatorId)
                .orElseThrow(() -> new UnauthorizedAccessException("Initiator user not found"));

        // Deterministic Lock Ordering: sort UUIDs lexicographically to eliminate deadlocks
        Account sourceAccount;
        Account destAccount;

        if (finalSourceId.compareTo(finalDestId) < 0) {
            sourceAccount = accountRepository.findByIdWithLock(finalSourceId)
                    .orElseThrow(() -> new AccountNotFoundException("Source account not found: " + finalSourceId));
            destAccount = accountRepository.findByIdWithLock(finalDestId)
                    .orElseThrow(() -> new AccountNotFoundException("Destination account not found: " + finalDestId));
        } else {
            destAccount = accountRepository.findByIdWithLock(finalDestId)
                    .orElseThrow(() -> new AccountNotFoundException("Destination account not found: " + finalDestId));
            sourceAccount = accountRepository.findByIdWithLock(finalSourceId)
                    .orElseThrow(() -> new AccountNotFoundException("Source account not found: " + finalSourceId));
        }

        // Guard: System accounts cannot be used as source or destination by API callers
        if (sourceAccount.isSystem()) {
            auditService.recordRefusal(initiatorId, initiator.getRole().name(), finalSourceId,
                    "TRANSFER", sourceAccount.getAccountNumber() + " -> " + destAccount.getAccountNumber(),
                    request.getAmount(), "SYSTEM_ACCOUNT_ACCESS",
                    idempotencyKey, "Caller attempted to transfer FROM a system clearing account");
            throw new UnauthorizedAccessException("Access denied: System accounts cannot be used as a transfer source.");
        }
        if (destAccount.isSystem()) {
            auditService.recordRefusal(initiatorId, initiator.getRole().name(), finalDestId,
                    "TRANSFER", sourceAccount.getAccountNumber() + " -> " + destAccount.getAccountNumber(),
                    request.getAmount(), "SYSTEM_ACCOUNT_ACCESS",
                    idempotencyKey, "Caller attempted to transfer INTO a system clearing account");
            throw new UnauthorizedAccessException("Access denied: System accounts cannot be used as a transfer destination.");
        }

        // Guard: Account status must be ACTIVE for financial operations
        if (sourceAccount.getStatus() != AccountStatus.ACTIVE) {
            auditService.recordRefusal(initiatorId, initiator.getRole().name(), finalSourceId,
                    "TRANSFER", sourceAccount.getAccountNumber() + " -> " + destAccount.getAccountNumber(),
                    request.getAmount(), "ACCOUNT_NOT_ACTIVE",
                    idempotencyKey, "Source account status is " + sourceAccount.getStatus() + "; transfers are blocked");
            throw new InvalidTransactionException("Source account is " + sourceAccount.getStatus() + ". Financial operations are not permitted.");
        }
        if (destAccount.getStatus() != AccountStatus.ACTIVE) {
            auditService.recordRefusal(initiatorId, initiator.getRole().name(), destId,
                    "TRANSFER", sourceAccount.getAccountNumber() + " -> " + destAccount.getAccountNumber(),
                    request.getAmount(), "ACCOUNT_NOT_ACTIVE",
                    idempotencyKey, "Destination account status is " + destAccount.getStatus() + "; transfers are blocked");
            throw new InvalidTransactionException("Destination account is " + destAccount.getStatus() + ". Financial operations are not permitted.");
        }

        // Guard: Cross-currency transfers are not supported
        if (!sourceAccount.getCurrency().equals(destAccount.getCurrency())) {
            auditService.recordRefusal(initiatorId, initiator.getRole().name(), sourceId,
                    "TRANSFER", sourceAccount.getAccountNumber() + " -> " + destAccount.getAccountNumber(),
                    request.getAmount(), "CURRENCY_MISMATCH",
                    idempotencyKey, "Cross-currency transfer rejected: " + sourceAccount.getCurrency() + " -> " + destAccount.getCurrency());
            throw new InvalidTransactionException("Cross-currency transfers are not supported: "
                    + sourceAccount.getCurrency() + " -> " + destAccount.getCurrency());
        }

        // Enforce RBAC & IDOR: Auditors cannot write; users (including Admins) can only transfer from accounts they own
        if (initiator.getRole() == Role.AUDITOR) {
            auditService.recordRefusal(
                    initiatorId,
                    initiator.getRole().name(),
                    sourceId,
                    "TRANSFER",
                    sourceAccount.getAccountNumber() + " -> " + destAccount.getAccountNumber(),
                    request.getAmount(),
                    "UNAUTHORIZED_ACCESS",
                    idempotencyKey,
                    "Auditor role is strictly read-only and cannot initiate transfers"
            );
            throw new UnauthorizedAccessException("Access denied: Auditor role is strictly read-only and cannot initiate transfers.");
        }

        if (!sourceAccount.getOwner().getId().equals(initiatorId)) {
            auditService.recordRefusal(
                    initiatorId,
                    initiator.getRole().name(),
                    sourceId,
                    "TRANSFER",
                    sourceAccount.getAccountNumber() + " -> " + destAccount.getAccountNumber(),
                    request.getAmount(),
                    "UNAUTHORIZED_ACCESS",
                    idempotencyKey,
                    "Unauthorized transfer attempt from unowned account: " + sourceAccount.getAccountNumber()
            );
            throw new UnauthorizedAccessException("Access denied: You are not authorized to transfer from this account.");
        }

        // Validate available balance strictly after holding exclusive row lock
        BigDecimal amount = request.getAmount();
        if (sourceAccount.getBalance().compareTo(amount) < 0) {
            auditService.recordRefusal(
                    initiatorId,
                    initiator.getRole().name(),
                    sourceId,
                    "TRANSFER",
                    sourceAccount.getAccountNumber() + " -> " + destAccount.getAccountNumber(),
                    amount,
                    "INSUFFICIENT_FUNDS",
                    idempotencyKey,
                    "Insufficient funds: Balance " + sourceAccount.getBalance() + " < Amount " + amount
            );
            throw new InsufficientFundsException("Insufficient available funds in source account.");
        }

        // Atomic balance mutation
        sourceAccount.setBalance(sourceAccount.getBalance().subtract(amount));
        destAccount.setBalance(destAccount.getBalance().add(amount));

        accountRepository.save(sourceAccount);
        accountRepository.save(destAccount);

        // Record completed transaction
        Transaction tx = new Transaction(
                TransactionType.TRANSFER,
                idempotencyKey,
                initiator,
                TransactionStatus.COMPLETED,
                null,
                amount
        );
        Transaction savedTx = transactionRepository.save(tx);

        // Strict Double-Entry: One DEBIT, One CREDIT, Net Sum = 0
        LedgerEntry debitEntry = new LedgerEntry(
                savedTx,
                sourceAccount,
                EntryType.DEBIT,
                amount,
                sourceAccount.getBalance()
        );
        LedgerEntry creditEntry = new LedgerEntry(
                savedTx,
                destAccount,
                EntryType.CREDIT,
                amount,
                destAccount.getBalance()
        );

        ledgerEntryRepository.save(debitEntry);
        ledgerEntryRepository.save(creditEntry);

        auditService.recordAudit(
                initiatorId,
                initiator.getRole().name(),
                "TRANSFER_COMPLETED",
                sourceAccount.getAccountNumber() + " -> " + destAccount.getAccountNumber(),
                "SUCCESS",
                "Transferred " + amount + " " + sourceAccount.getCurrency()
        );

        return new TransactionResponse(
                savedTx.getId(),
                savedTx.getTransactionType(),
                savedTx.getStatus(),
                savedTx.getAmount(),
                savedTx.getFailureReason(),
                sourceAccount.getId(),
                destAccount.getId(),
                idempotencyKey,
                savedTx.getCreatedAt()
        );
    }
}
