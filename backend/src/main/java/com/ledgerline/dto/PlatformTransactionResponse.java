package com.ledgerline.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class PlatformTransactionResponse {

    private UUID transactionId;
    private String transactionType;
    private String status;
    private BigDecimal amount;
    private String referenceMemo;
    private String idempotencyKey;
    private String initiatedByEmail;
    private String initiatedByRole;
    private LocalDateTime createdAt;
    private String sourceAccountNumber;
    private String destinationAccountNumber;
    private BigDecimal debitTotal;
    private BigDecimal creditTotal;
    private boolean invariantBalanced;
    private boolean reversed;
    private UUID reversedOriginalTxId;

    public PlatformTransactionResponse() {
    }

    public PlatformTransactionResponse(
            UUID transactionId,
            String transactionType,
            String status,
            BigDecimal amount,
            String referenceMemo,
            String idempotencyKey,
            String initiatedByEmail,
            String initiatedByRole,
            LocalDateTime createdAt,
            String sourceAccountNumber,
            String destinationAccountNumber,
            BigDecimal debitTotal,
            BigDecimal creditTotal,
            boolean invariantBalanced,
            boolean reversed,
            UUID reversedOriginalTxId) {
        this.transactionId = transactionId;
        this.transactionType = transactionType;
        this.status = status;
        this.amount = amount;
        this.referenceMemo = referenceMemo;
        this.idempotencyKey = idempotencyKey;
        this.initiatedByEmail = initiatedByEmail;
        this.initiatedByRole = initiatedByRole;
        this.createdAt = createdAt;
        this.sourceAccountNumber = sourceAccountNumber;
        this.destinationAccountNumber = destinationAccountNumber;
        this.debitTotal = debitTotal;
        this.creditTotal = creditTotal;
        this.invariantBalanced = invariantBalanced;
        this.reversed = reversed;
        this.reversedOriginalTxId = reversedOriginalTxId;
    }

    public UUID getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(UUID transactionId) {
        this.transactionId = transactionId;
    }

    public String getTransactionType() {
        return transactionType;
    }

    public void setTransactionType(String transactionType) {
        this.transactionType = transactionType;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getReferenceMemo() {
        return referenceMemo;
    }

    public void setReferenceMemo(String referenceMemo) {
        this.referenceMemo = referenceMemo;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public String getInitiatedByEmail() {
        return initiatedByEmail;
    }

    public void setInitiatedByEmail(String initiatedByEmail) {
        this.initiatedByEmail = initiatedByEmail;
    }

    public String getInitiatedByRole() {
        return initiatedByRole;
    }

    public void setInitiatedByRole(String initiatedByRole) {
        this.initiatedByRole = initiatedByRole;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getSourceAccountNumber() {
        return sourceAccountNumber;
    }

    public void setSourceAccountNumber(String sourceAccountNumber) {
        this.sourceAccountNumber = sourceAccountNumber;
    }

    public String getDestinationAccountNumber() {
        return destinationAccountNumber;
    }

    public void setDestinationAccountNumber(String destinationAccountNumber) {
        this.destinationAccountNumber = destinationAccountNumber;
    }

    public BigDecimal getDebitTotal() {
        return debitTotal;
    }

    public void setDebitTotal(BigDecimal debitTotal) {
        this.debitTotal = debitTotal;
    }

    public BigDecimal getCreditTotal() {
        return creditTotal;
    }

    public void setCreditTotal(BigDecimal creditTotal) {
        this.creditTotal = creditTotal;
    }

    public boolean isInvariantBalanced() {
        return invariantBalanced;
    }

    public void setInvariantBalanced(boolean invariantBalanced) {
        this.invariantBalanced = invariantBalanced;
    }

    public boolean isReversed() {
        return reversed;
    }

    public void setReversed(boolean reversed) {
        this.reversed = reversed;
    }

    public UUID getReversedOriginalTxId() {
        return reversedOriginalTxId;
    }

    public void setReversedOriginalTxId(UUID reversedOriginalTxId) {
        this.reversedOriginalTxId = reversedOriginalTxId;
    }
}

