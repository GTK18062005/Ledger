package com.ledgerline.services;

import com.ledgerline.dto.IntegrityVerificationResponse;
import com.ledgerline.dto.PlatformTransactionResponse;
import com.ledgerline.exceptions.AccountNotFoundException;
import com.ledgerline.exceptions.InsufficientFundsException;
import com.ledgerline.exceptions.InvalidTransactionException;
import com.ledgerline.exceptions.UnauthorizedAccessException;
import com.ledgerline.models.*;
import com.ledgerline.repositories.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PlatformGovernanceService {

    private static final String REVERSAL_PREFIX = "REVERSAL-";

    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditService auditService;

    public PlatformGovernanceService(
            TransactionRepository transactionRepository,
            LedgerEntryRepository ledgerEntryRepository,
            AccountRepository accountRepository,
            UserRepository userRepository,
            AuditLogRepository auditLogRepository,
            AuditService auditService) {
        this.transactionRepository = transactionRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<PlatformTransactionResponse> getAllPlatformTransactions() {
        List<Transaction> transactions = transactionRepository.findAllWithUserOrderByCreatedAtDesc();
        List<LedgerEntry> allEntries = ledgerEntryRepository.findAllWithTransactionAndAccountOrderByCreatedAtAsc();

        Map<UUID, List<LedgerEntry>> entriesByTx = new HashMap<>();
        for (LedgerEntry entry : allEntries) {
            entriesByTx.computeIfAbsent(entry.getTransaction().getId(), k -> new ArrayList<>()).add(entry);
        }

        Set<UUID> reversedTxIds = new HashSet<>();
        for (Transaction tx : transactions) {
            String key = tx.getIdempotencyKey();
            if (key != null && key.startsWith(REVERSAL_PREFIX)) {
                parseUuidSafe(key.substring(REVERSAL_PREFIX.length())).ifPresent(reversedTxIds::add);
            }
        }

        return transactions.stream()
                .map(tx -> mapTransaction(tx, entriesByTx.getOrDefault(tx.getId(), Collections.emptyList()), reversedTxIds))
                .collect(Collectors.toList());
    }

    @Transactional
    public PlatformTransactionResponse reverseTransaction(UUID transactionId, UUID adminUserId, String reason) {
        User admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new AccountNotFoundException("Administrator not found: " + adminUserId));

        if (admin.getRole() != Role.ADMIN) {
            throw new UnauthorizedAccessException("Only administrators can execute compensating reversals.");
        }

        Transaction origTx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new AccountNotFoundException("Transaction not found: " + transactionId));

        if (origTx.getStatus() != TransactionStatus.COMPLETED) {
            throw new InvalidTransactionException("Only COMPLETED transactions can be reversed.");
        }

        if (origTx.getTransactionType() == TransactionType.REVERSAL) {
            throw new InvalidTransactionException("A reversal transaction cannot itself be reversed.");
        }

        String revKey = REVERSAL_PREFIX + origTx.getId();
        if (transactionRepository.existsByIdempotencyKey(revKey)) {
            throw new InvalidTransactionException("Transaction " + origTx.getId() + " has already been reversed.");
        }

        List<LedgerEntry> origEntries = ledgerEntryRepository.findByTransactionId(origTx.getId());
        if (origEntries.isEmpty()) {
            throw new InvalidTransactionException("Original transaction contains no ledger entries to reverse.");
        }

        List<UUID> sortedAccountIds = origEntries.stream()
                .map(e -> e.getAccount().getId())
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        Map<UUID, Account> lockedAccounts = new HashMap<>();
        for (UUID accId : sortedAccountIds) {
            Account locked = accountRepository.findByIdWithLock(accId)
                    .orElseThrow(() -> new AccountNotFoundException("Account not found during reversal lock: " + accId));
            lockedAccounts.put(accId, locked);
        }

        // Pre-validate net compensating deltas per account to strictly protect non-negative customer balances
        Map<UUID, BigDecimal> netDeltaByAccount = new HashMap<>();
        for (LedgerEntry entry : origEntries) {
            UUID accId = entry.getAccount().getId();
            BigDecimal delta = (entry.getEntryType() == EntryType.CREDIT)
                    ? entry.getAmount().negate()
                    : entry.getAmount();
            netDeltaByAccount.merge(accId, delta, BigDecimal::add);
        }

        for (Map.Entry<UUID, BigDecimal> d : netDeltaByAccount.entrySet()) {
            Account acc = lockedAccounts.get(d.getKey());
            BigDecimal projected = acc.getBalance().add(d.getValue());
            if (!acc.isSystem() && projected.compareTo(BigDecimal.ZERO) < 0) {
                auditService.recordRefusal(
                        adminUserId,
                        admin.getRole().name(),
                        acc.getId(),
                        "TRANSACTION_REVERSAL",
                        origTx.getId().toString(),
                        d.getValue().abs(),
                        "INSUFFICIENT_FUNDS",
                        revKey,
                        "Reversal blocked to prevent negative balance on " + acc.getAccountNumber()
                );
                throw new InsufficientFundsException(
                        "Cannot reverse transaction: recipient account " + acc.getAccountNumber() + " has insufficient funds."
                );
            }
        }

        String memoText = (reason != null && !reason.isBlank())
                ? "Reversal of " + origTx.getId().toString().substring(0, 8) + ": " + reason.trim()
                : "Compensating reversal of transaction " + origTx.getId().toString().substring(0, 8);
        if (memoText.length() > 250) {
            memoText = memoText.substring(0, 250);
        }

        Transaction reversalTx = transactionRepository.save(new Transaction(
                TransactionType.REVERSAL,
                revKey,
                admin,
                TransactionStatus.COMPLETED,
                memoText,
                origTx.getAmount()
        ));

        List<LedgerEntry> compensatingEntries = new ArrayList<>();
        for (LedgerEntry origEntry : origEntries) {
            Account acc = lockedAccounts.get(origEntry.getAccount().getId());
            EntryType swappedType = (origEntry.getEntryType() == EntryType.CREDIT) ? EntryType.DEBIT : EntryType.CREDIT;
            BigDecimal nextBalance = (swappedType == EntryType.CREDIT)
                    ? acc.getBalance().add(origEntry.getAmount())
                    : acc.getBalance().subtract(origEntry.getAmount());
            acc.setBalance(nextBalance);
            LedgerEntry compEntry = new LedgerEntry(reversalTx, acc, swappedType, origEntry.getAmount(), nextBalance);
            compensatingEntries.add(ledgerEntryRepository.save(compEntry));
        }

        for (Account acc : lockedAccounts.values()) {
            accountRepository.save(acc);
        }

        auditService.recordAudit(
                adminUserId,
                admin.getRole().name(),
                "TRANSACTION_REVERSED",
                origTx.getId().toString(),
                "SUCCESS",
                "Executed double-entry compensating reversal " + reversalTx.getId() + " (" + origTx.getAmount() + "): " + memoText
        );

        return mapTransaction(reversalTx, compensatingEntries, Collections.emptySet());
    }

    @Transactional(readOnly = true)
    public IntegrityVerificationResponse computeIntegrityReport() {
        long totalTransactions = transactionRepository.count();
        List<LedgerEntry> allEntries = ledgerEntryRepository.findAllWithTransactionAndAccountOrderByCreatedAtAsc();
        long totalLedgerEntries = allEntries.size();

        BigDecimal totalDebits = ledgerEntryRepository.sumAmountByEntryType(EntryType.DEBIT);
        BigDecimal totalCredits = ledgerEntryRepository.sumAmountByEntryType(EntryType.CREDIT);
        if (totalDebits == null) totalDebits = BigDecimal.ZERO;
        if (totalCredits == null) totalCredits = BigDecimal.ZERO;

        BigDecimal variance = totalCredits.subtract(totalDebits).abs();
        BigDecimal netSystemBalance = accountRepository.sumAllBalances();
        if (netSystemBalance == null) netSystemBalance = BigDecimal.ZERO;

        long negativeViolations = accountRepository.findAll().stream()
                .filter(a -> !a.isSystem() && a.getBalance().compareTo(BigDecimal.ZERO) < 0)
                .count();

        long securityAlerts = auditLogRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(log -> "REFUSED".equalsIgnoreCase(log.getStatus())
                        || containsIgnoreCase(log.getOperationType(), "IDOR")
                        || containsIgnoreCase(log.getOperationType(), "UNAUTHORIZED")
                        || containsIgnoreCase(log.getOperationType(), "SECURITY"))
                .count();

        boolean conserved = variance.compareTo(BigDecimal.ZERO) == 0
                && netSystemBalance.compareTo(BigDecimal.ZERO) == 0
                && negativeViolations == 0;

        String integrityIndex = conserved ? "100.000%" : "ANOMALY_DETECTED";
        String merkleRoot = computeDigest(allEntries);

        return new IntegrityVerificationResponse(
                totalTransactions,
                totalLedgerEntries,
                totalDebits,
                totalCredits,
                variance,
                totalDebits,
                securityAlerts,
                negativeViolations,
                integrityIndex,
                merkleRoot,
                netSystemBalance,
                conserved,
                Instant.now().toString()
        );
    }

    private PlatformTransactionResponse mapTransaction(Transaction tx, List<LedgerEntry> entries, Set<UUID> reversedTxIds) {
        BigDecimal debitSum = BigDecimal.ZERO;
        BigDecimal creditSum = BigDecimal.ZERO;
        List<String> debits = new ArrayList<>();
        List<String> credits = new ArrayList<>();

        for (LedgerEntry e : entries) {
            String accNum = e.getAccount() != null ? e.getAccount().getAccountNumber() : "UNKNOWN";
            if (e.getEntryType() == EntryType.DEBIT) {
                debitSum = debitSum.add(e.getAmount());
                debits.add(accNum);
            } else {
                creditSum = creditSum.add(e.getAmount());
                credits.add(accNum);
            }
        }

        String srcAcc = debits.isEmpty() ? "—" : String.join(", ", debits);
        String dstAcc = credits.isEmpty() ? "—" : String.join(", ", credits);
        boolean balanced = debitSum.compareTo(creditSum) == 0 && !entries.isEmpty();

        UUID originalReversedId = null;
        if (tx.getIdempotencyKey() != null && tx.getIdempotencyKey().startsWith(REVERSAL_PREFIX)) {
            originalReversedId = parseUuidSafe(tx.getIdempotencyKey().substring(REVERSAL_PREFIX.length())).orElse(null);
        }

        return new PlatformTransactionResponse(
                tx.getId(),
                tx.getTransactionType().name(),
                tx.getStatus().name(),
                tx.getAmount(),
                tx.getFailureReason(),
                tx.getIdempotencyKey(),
                tx.getInitiatedBy() != null ? tx.getInitiatedBy().getEmail() : "SYSTEM",
                tx.getInitiatedBy() != null && tx.getInitiatedBy().getRole() != null ? tx.getInitiatedBy().getRole().name() : "SYSTEM",
                tx.getCreatedAt(),
                srcAcc,
                dstAcc,
                debitSum,
                creditSum,
                balanced,
                reversedTxIds.contains(tx.getId()),
                originalReversedId
        );
    }

    private String computeDigest(List<LedgerEntry> entries) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            if (entries.isEmpty()) {
                md.update("GENESIS_LEDGER_EMPTY".getBytes(StandardCharsets.UTF_8));
            } else {
                for (LedgerEntry e : entries) {
                    String row = e.getId() + "|" + e.getTransaction().getId() + "|"
                            + e.getAccount().getId() + "|" + e.getEntryType() + "|"
                            + e.getAmount().toPlainString() + "|" + e.getRunningBalanceAfter().toPlainString() + ";";
                    md.update(row.getBytes(StandardCharsets.UTF_8));
                }
            }
            byte[] hash = md.digest();
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }

    private Optional<UUID> parseUuidSafe(String raw) {
        try {
            return Optional.of(UUID.fromString(raw));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private boolean containsIgnoreCase(String value, String needle) {
        return value != null && value.toUpperCase().contains(needle.toUpperCase());
    }
}

