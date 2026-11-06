package com.ledgerline.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerline.dto.TransactionResponse;
import com.ledgerline.exceptions.ConcurrentConflictException;
import com.ledgerline.exceptions.IdempotencyException;
import com.ledgerline.exceptions.InvalidTransactionException;
import com.ledgerline.models.*;
import com.ledgerline.repositories.IdempotencyRecordRepository;
import com.ledgerline.repositories.LedgerEntryRepository;
import com.ledgerline.repositories.TransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class IdempotencyService {

    private static final Logger log = LoggerFactory.getLogger(IdempotencyService.class);
    private static final long LEASE_EXPIRATION_SECONDS = 60;
    private static final long MAX_AWAIT_TIMEOUT_MS = 10000; // 10s — covers H2 write visibility lag under load

    private final IdempotencyRecordRepository idempotencyRecordRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final ObjectMapper objectMapper;

    public IdempotencyService(
            IdempotencyRecordRepository idempotencyRecordRepository,
            TransactionRepository transactionRepository,
            LedgerEntryRepository ledgerEntryRepository,
            ObjectMapper objectMapper) {
        this.idempotencyRecordRepository = idempotencyRecordRepository;
        this.transactionRepository = transactionRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Calculates deterministic canonical SHA-256 request payload fingerprint.
     */
    public String calculateFingerprint(Object request) {
        try {
            byte[] rawBytes = objectMapper.writeValueAsBytes(request);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawBytes));
        } catch (Exception e) {
            log.error("Failed to calculate canonical request fingerprint", e);
            throw new RuntimeException("Canonical request fingerprint calculation failed", e);
        }
    }

    /**
     * Atomically coordinates database-backed idempotency.
     * Enforces:
     * - Mandatory key validation.
     * - Request fingerprint validation (different payload with same key returns 409).
     * - User scoping.
     * - Safe handling of in-flight requests and orphaned records.
     *
     * @return Optional containing cached response if already COMPLETED, or Optional.empty() if new execution reserved.
     */
    public <T> Optional<T> coordinateExecution(
            String idempotencyKey,
            UUID userId,
            String operation,
            Object requestPayload,
            Class<T> responseType) {

        if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
            throw new InvalidTransactionException("Idempotency-Key header is mandatory for all financial operations.");
        }

        String requestHash = calculateFingerprint(requestPayload);

        // Attempt initial database-backed reservation
        boolean newlyReserved = false;
        try {
            newlyReserved = tryInsertInProgress(idempotencyKey.trim(), userId, operation, requestHash);
        } catch (Exception e) {
            newlyReserved = false;
        }

        if (newlyReserved) {
            return Optional.empty(); // Caller must proceed with business logic
        }

        // Key already exists in database; evaluate status and fingerprint
        return handleExistingRecord(idempotencyKey.trim(), userId, requestHash, responseType);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = Exception.class)
    public boolean tryInsertInProgress(String idempotencyKey, UUID userId, String operation, String requestHash) {
        if (idempotencyRecordRepository.existsById(idempotencyKey)) {
            return false;
        }

        try {
            IdempotencyRecord record = new IdempotencyRecord(
                    idempotencyKey,
                    userId,
                    operation,
                    requestHash,
                    IdempotencyStatus.IN_PROGRESS,
                    null
            );
            idempotencyRecordRepository.saveAndFlush(record);
            return true; // This thread won the race and reserved the key
        } catch (Exception e) {
            // Unique constraint violation or concurrency collision: another thread reserved first
            return false;
        }
    }

    private <T> Optional<T> handleExistingRecord(
            String idempotencyKey,
            UUID userId,
            String currentRequestHash,
            Class<T> responseType) {

        long startTime = System.currentTimeMillis();

        while (System.currentTimeMillis() - startTime < MAX_AWAIT_TIMEOUT_MS) {
            Optional<IdempotencyRecord> recordOpt = getRecord(idempotencyKey);
            if (recordOpt.isEmpty()) {
                // Winning thread is committing its IN_PROGRESS reservation, await persistence
                try {
                    Thread.sleep(50);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new ConcurrentConflictException("Interrupted while waiting for in-flight transaction resolution.");
                }
                continue;
            }

            IdempotencyRecord record = recordOpt.get();

            // Validate user scoping
            if (!record.getUserId().equals(userId)) {
                throw new IdempotencyException("Idempotency key was issued to a different authenticated user.");
            }

            // Validate fingerprint match: Same key with different payload returns HTTP 409 Conflict
            if (!record.getRequestHash().equals(currentRequestHash)) {
                throw new IdempotencyException("Idempotency key reuse with different request payload is prohibited (Fingerprint mismatch).");
            }

            if (record.getStatus() == IdempotencyStatus.COMPLETED) {
                try {
                    T cachedResponse = objectMapper.readValue(record.getResponseBody(), responseType);
                    return Optional.of(cachedResponse);
                } catch (Exception e) {
                    log.error("Failed to deserialize cached response for key: {}", idempotencyKey, e);
                    throw new RuntimeException("Corrupted idempotency record payload", e);
                }
            }

            // Crash Recovery: If application crashed after committing the financial transaction
            // but before saving the cached response, recover and reconstruct the response directly from the ledger!
            Optional<T> recovered = tryRecoverCommittedTransaction(idempotencyKey, responseType);
            if (recovered.isPresent()) {
                log.info("Recovered committed financial transaction for idempotency key {} after crash/timeout", idempotencyKey);
                markCompleted(idempotencyKey, recovered.get());
                return recovered;
            }

            if (record.getStatus() == IdempotencyStatus.FAILED) {
                throw new ConcurrentConflictException("A previous operation with this idempotency key failed.");
            }

            if (record.getStatus() == IdempotencyStatus.IN_PROGRESS) {
                // Check for lease expiration (orphaned after server crash)
                Duration age = Duration.between(record.getUpdatedAt() != null ? record.getUpdatedAt() : record.getCreatedAt(), LocalDateTime.now());
                if (age.getSeconds() > LEASE_EXPIRATION_SECONDS) {
                    log.warn("Idempotency key {} has expired IN_PROGRESS lease (>{}s). Resetting.", idempotencyKey, LEASE_EXPIRATION_SECONDS);
                    markFailed(idempotencyKey);
                    throw new ConcurrentConflictException("Previous operation timed out or crashed. Please retry with a new key.");
                }

                try {
                    Thread.sleep(60);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new ConcurrentConflictException("Interrupted while waiting for in-flight transaction resolution.");
                }
            }
        }

        throw new ConcurrentConflictException("Concurrent request with idempotency key is currently processing. Please wait.");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public Optional<IdempotencyRecord> getRecord(String idempotencyKey) {
        return idempotencyRecordRepository.findById(idempotencyKey);
    }

    /**
     * Crash-Recovery Mechanism:
     * When the application crashes after TransferService commits to the database but before
     * markCompleted saves the cached response, this method reconstructs the original
     * TransactionResponse from the committed transaction and ledger entries.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public <T> Optional<T> tryRecoverCommittedTransaction(String idempotencyKey, Class<T> responseType) {
        if (!responseType.isAssignableFrom(TransactionResponse.class)) {
            return Optional.empty();
        }

        Optional<Transaction> txOpt = transactionRepository.findByIdempotencyKey(idempotencyKey);
        if (txOpt.isEmpty()) {
            return Optional.empty();
        }

        Transaction tx = txOpt.get();
        if (tx.getStatus() != TransactionStatus.COMPLETED) {
            return Optional.empty();
        }

        List<LedgerEntry> entries = ledgerEntryRepository.findByTransactionId(tx.getId());
        UUID sourceAccountId = null;
        UUID destAccountId = null;
        for (LedgerEntry entry : entries) {
            if (entry.getEntryType() == EntryType.DEBIT && sourceAccountId == null) {
                sourceAccountId = entry.getAccount().getId();
            } else if (entry.getEntryType() == EntryType.CREDIT && destAccountId == null) {
                destAccountId = entry.getAccount().getId();
            }
        }

        TransactionResponse response = new TransactionResponse(
                tx.getId(),
                tx.getTransactionType(),
                tx.getStatus(),
                tx.getAmount(),
                tx.getFailureReason(),
                sourceAccountId,
                destAccountId,
                idempotencyKey,
                tx.getCreatedAt()
        );

        return Optional.of(responseType.cast(response));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markCompleted(String idempotencyKey, Object responseBody) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return;
        }

        idempotencyRecordRepository.findById(idempotencyKey.trim()).ifPresent(record -> {
            try {
                String json = objectMapper.writeValueAsString(responseBody);
                record.setStatus(IdempotencyStatus.COMPLETED);
                record.setResponseBody(json);
                record.setUpdatedAt(LocalDateTime.now());
                idempotencyRecordRepository.saveAndFlush(record);
            } catch (Exception e) {
                log.error("Failed to serialize response body for idempotency key: {}", idempotencyKey, e);
            }
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return;
        }

        idempotencyRecordRepository.findById(idempotencyKey.trim()).ifPresent(record -> {
            record.setStatus(IdempotencyStatus.FAILED);
            record.setUpdatedAt(LocalDateTime.now());
            idempotencyRecordRepository.saveAndFlush(record);
        });
    }
}
