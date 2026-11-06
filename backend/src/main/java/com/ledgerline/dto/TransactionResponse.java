package com.ledgerline.dto;

import com.ledgerline.models.TransactionStatus;
import com.ledgerline.models.TransactionType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class TransactionResponse {
    private UUID transactionId;
    private TransactionType transactionType;
    private TransactionStatus status;
    private BigDecimal amount;
    private String failureReason;
    private UUID sourceAccountId;
    private UUID destinationAccountId;
    private String idempotencyKey;
    private LocalDateTime timestamp;

    public TransactionResponse() {
    }

    public TransactionResponse(UUID transactionId, TransactionType transactionType, TransactionStatus status,
                               BigDecimal amount, String failureReason, UUID sourceAccountId,
                               UUID destinationAccountId, String idempotencyKey, LocalDateTime timestamp) {
        this.transactionId = transactionId;
        this.transactionType = transactionType;
        this.status = status;
        this.amount = amount;
        this.failureReason = failureReason;
        this.sourceAccountId = sourceAccountId;
        this.destinationAccountId = destinationAccountId;
        this.idempotencyKey = idempotencyKey;
        this.timestamp = timestamp;
    }

    public UUID getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(UUID transactionId) {
        this.transactionId = transactionId;
    }

    public TransactionType getTransactionType() {
        return transactionType;
    }

    public void setTransactionType(TransactionType transactionType) {
        this.transactionType = transactionType;
    }

    public TransactionStatus getStatus() {
        return status;
    }

    public void setStatus(TransactionStatus status) {
        this.status = status;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    public UUID getSourceAccountId() {
        return sourceAccountId;
    }

    public void setSourceAccountId(UUID sourceAccountId) {
        this.sourceAccountId = sourceAccountId;
    }

    public UUID getDestinationAccountId() {
        return destinationAccountId;
    }

    public void setDestinationAccountId(UUID destinationAccountId) {
        this.destinationAccountId = destinationAccountId;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}

