package com.ledgerline.services;

import com.ledgerline.dto.TransactionResponse;
import com.ledgerline.dto.WithdrawalRequest;
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
public class WithdrawalService {

        private final AccountRepository accountRepository;
        private final TransactionRepository transactionRepository;
        private final LedgerEntryRepository ledgerEntryRepository;
        private final UserRepository userRepository;
        private final AuditService auditService;
        private final SystemAccountService systemAccountService;

        public WithdrawalService(
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
         * Executes atomic double-entry external withdrawal.
         * In accordance with strict double-entry principles:
         * - DEBIT: Customer Account
         * - CREDIT: SYSTEM_SETTLEMENT clearing account
         * Mathematical Invariant: SUM(DEBITS) == SUM(CREDITS).
         */
        @Transactional
        public TransactionResponse withdraw(WithdrawalRequest request, String idempotencyKey, UUID initiatorId) {
                if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                        throw new InvalidTransactionException("Withdrawal amount must be strictly greater than zero.");
                }

                User initiator = userRepository.findById(initiatorId)
                                .orElseThrow(() -> new UnauthorizedAccessException("Initiator user not found"));

                Account settlementAccount = systemAccountService.getOrCreateSettlementAccount();
                UUID sourceId = request.getAccountId();
                if (sourceId == null && request.getAccountIdentifier() != null) {
                        String query = request.getAccountIdentifier().trim();
                        try {
                                sourceId = UUID.fromString(query);
                        } catch (IllegalArgumentException e) {
                                Account source = accountRepository.findByAccountNumber(query)
                                                .orElseThrow(() -> new AccountNotFoundException("Source account not found with account number: " + query));
                                sourceId = source.getId();
                        }
                }
                if (sourceId == null) {
                        throw new InvalidTransactionException("Source account ID or Account Number is required.");
                }
                final UUID finalSourceId = sourceId;
                UUID settlementId = settlementAccount.getId();

                // Deterministic lock acquisition to prevent deadlocks and guarantee fresh
                // balance state
                Account lockedSource;
                Account lockedSettlement;
                if (finalSourceId.compareTo(settlementId) < 0) {
                        lockedSource = accountRepository.findByIdWithLock(finalSourceId)
                                        .orElseThrow(() -> new AccountNotFoundException(
                                                        "Account not found: " + finalSourceId));
                        lockedSettlement = accountRepository.findByIdWithLock(settlementId)
                                        .orElseThrow(() -> new AccountNotFoundException(
                                                        "Settlement account not found: " + settlementId));
                } else {
                        lockedSettlement = accountRepository.findByIdWithLock(settlementId)
                                        .orElseThrow(() -> new AccountNotFoundException(
                                                        "Settlement account not found: " + settlementId));
                        lockedSource = accountRepository.findByIdWithLock(finalSourceId)
                                        .orElseThrow(() -> new AccountNotFoundException(
                                                        "Account not found: " + finalSourceId));
                }

                // Guard: Source account must not be a system account
                if (lockedSource.isSystem()) {
                        auditService.recordRefusal(initiatorId, initiator.getRole().name(), lockedSource.getId(),
                                        "WITHDRAWAL", lockedSource.getAccountNumber(), request.getAmount(),
                                        "SYSTEM_ACCOUNT_ACCESS", idempotencyKey,
                                        "Caller attempted to withdraw from a system clearing account");
                        throw new UnauthorizedAccessException("Access denied: System accounts cannot be directly withdrawn from.");
                }

                // Guard: Source account must be ACTIVE for financial operations
                if (lockedSource.getStatus() != AccountStatus.ACTIVE) {
                        auditService.recordRefusal(initiatorId, initiator.getRole().name(), lockedSource.getId(),
                                        "WITHDRAWAL", lockedSource.getAccountNumber(), request.getAmount(),
                                        "ACCOUNT_NOT_ACTIVE", idempotencyKey,
                                        "Account status is " + lockedSource.getStatus() + "; withdrawals are blocked");
                        throw new InvalidTransactionException("Account is " + lockedSource.getStatus() + ". Financial operations are not permitted.");
                }

                // Enforce RBAC & IDOR strictly on the locked entity
                if (initiator.getRole() == Role.AUDITOR) {
                        auditService.recordRefusal(
                                        initiatorId,
                                        initiator.getRole().name(),
                                        lockedSource.getId(),
                                        "WITHDRAWAL",
                                        lockedSource.getAccountNumber(),
                                        request.getAmount(),
                                        "UNAUTHORIZED_ACCESS",
                                        idempotencyKey,
                                        "Auditor role is strictly read-only and cannot execute withdrawals");
                        throw new UnauthorizedAccessException(
                                        "Access denied: Auditor role is strictly read-only and cannot execute withdrawals.");
                }

                if (!lockedSource.getOwner().getId().equals(initiatorId)) {
                        auditService.recordRefusal(
                                        initiatorId,
                                        initiator.getRole().name(),
                                        lockedSource.getId(),
                                        "WITHDRAWAL",
                                        lockedSource.getAccountNumber(),
                                        request.getAmount(),
                                        "UNAUTHORIZED_ACCESS",
                                        idempotencyKey,
                                        "Unauthorized withdrawal attempt on unowned account: "
                                                        + lockedSource.getAccountNumber());
                        throw new UnauthorizedAccessException(
                                        "Access denied: You are not authorized to withdraw from this account.");
                }

                BigDecimal amount = request.getAmount();

                // Validate balance strictly after acquiring exclusive lock
                if (lockedSource.getBalance().compareTo(amount) < 0) {
                        auditService.recordRefusal(
                                        initiatorId,
                                        initiator.getRole().name(),
                                        lockedSource.getId(),
                                        "WITHDRAWAL",
                                        lockedSource.getAccountNumber(),
                                        amount,
                                        "INSUFFICIENT_FUNDS",
                                        idempotencyKey,
                                        "Insufficient funds: Balance " + lockedSource.getBalance() + " < Amount "
                                                        + amount);
                        throw new InsufficientFundsException("Insufficient available funds for withdrawal.");
                }

                // Mutate balances: Customer Account is debited, System Settlement is credited
                lockedSource.setBalance(lockedSource.getBalance().subtract(amount));
                lockedSettlement.setBalance(lockedSettlement.getBalance().add(amount));

                accountRepository.save(lockedSource);
                accountRepository.save(lockedSettlement);

                // Record completed transaction
                Transaction tx = new Transaction(
                                TransactionType.WITHDRAWAL,
                                idempotencyKey,
                                initiator,
                                TransactionStatus.COMPLETED,
                                null,
                                amount);
                Transaction savedTx = transactionRepository.save(tx);

                // Strict Double-Entry Postings: One DEBIT (Customer), One CREDIT (Settlement)
                LedgerEntry customerDebit = new LedgerEntry(
                                savedTx,
                                lockedSource,
                                EntryType.DEBIT,
                                amount,
                                lockedSource.getBalance());
                LedgerEntry settlementCredit = new LedgerEntry(
                                savedTx,
                                lockedSettlement,
                                EntryType.CREDIT,
                                amount,
                                lockedSettlement.getBalance());

                ledgerEntryRepository.save(customerDebit);
                ledgerEntryRepository.save(settlementCredit);

                auditService.recordAudit(
                                initiatorId,
                                initiator.getRole().name(),
                                "WITHDRAWAL_COMPLETED",
                                lockedSource.getAccountNumber(),
                                "SUCCESS",
                                "External withdrawal of " + amount + " " + lockedSource.getCurrency()
                                                + " settled via SYSTEM_SETTLEMENT");

                return new TransactionResponse(
                                savedTx.getId(),
                                savedTx.getTransactionType(),
                                savedTx.getStatus(),
                                savedTx.getAmount(),
                                savedTx.getFailureReason(),
                                lockedSource.getId(),
                                lockedSettlement.getId(),
                                idempotencyKey,
                                savedTx.getCreatedAt());
        }
}
