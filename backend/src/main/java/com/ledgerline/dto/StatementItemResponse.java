package com.ledgerline.dto;

import com.ledgerline.models.EntryType;
import com.ledgerline.models.TransactionStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class StatementItemResponse {
    private UUID id;
    private UUID transactionId;
    private LocalDateTime timestamp;
    private UUID initiatorId;
    private String initiatorEmail;
    private String initiatorRole;
    private EntryType entryType;
    private BigDecimal amount;
    private TransactionStatus status;
    private String failureReason;
    private BigDecimal runningBalance;

    public StatementItemResponse() {
    }

    public StatementItemResponse(UUID id, UUID transactionId, LocalDateTime timestamp,
                                 UUID initiatorId, String initiatorEmail, String initiatorRole,
                                 EntryType entryType, BigDecimal amount, TransactionStatus status,
                                 String failureReason, BigDecimal runningBalance) {
        this.id = id;
        this.transactionId = transactionId;
        this.timestamp = timestamp;
        this.initiatorId = initiatorId;
        this.initiatorEmail = initiatorEmail;
        this.initiatorRole = initiatorRole;
        this.entryType = entryType;
        this.amount = amount;
        this.status = status;
        this.failureReason = failureReason;
        this.runningBalance = runningBalance;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(UUID transactionId) {
        this.transactionId = transactionId;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public UUID getInitiatorId() {
        return initiatorId;
    }

    public void setInitiatorId(UUID initiatorId) {
        this.initiatorId = initiatorId;
    }

    public String getInitiatorEmail() {
        return initiatorEmail;
    }

    public void setInitiatorEmail(String initiatorEmail) {
        this.initiatorEmail = initiatorEmail;
    }

    public String getInitiatorRole() {
        return initiatorRole;
    }

    public void setInitiatorRole(String initiatorRole) {
        this.initiatorRole = initiatorRole;
    }

    public EntryType getEntryType() {
        return entryType;
    }

    public void setEntryType(EntryType entryType) {
        this.entryType = entryType;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public TransactionStatus getStatus() {
        return status;
    }

    public void setStatus(TransactionStatus status) {
        this.status = status;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    public BigDecimal getRunningBalance() {
        return runningBalance;
    }

    public void setRunningBalance(BigDecimal runningBalance) {
        this.runningBalance = runningBalance;
    }
}

