package com.ledgerline.dto;

import com.ledgerline.models.DepositApprovalRequest;

import java.math.BigDecimal;
import java.util.UUID;

public class DepositApprovalResponse {

    private UUID id;
    private UUID accountId;
    private String accountNumber;
    private UUID userId;
    private String userEmail;
    private BigDecimal amount;
    private String currency;
    private String referenceMemo;
    private String status;
    private String reviewedByEmail;
    private String adminNotes;
    private UUID transactionId;
    private String createdAt;
    private String updatedAt;

    public DepositApprovalResponse() {
    }

    public static DepositApprovalResponse fromEntity(DepositApprovalRequest entity) {
        DepositApprovalResponse res = new DepositApprovalResponse();
        res.id = entity.getId();
        if (entity.getAccount() != null) {
            res.accountId = entity.getAccount().getId();
            res.accountNumber = entity.getAccount().getAccountNumber();
        }
        if (entity.getUser() != null) {
            res.userId = entity.getUser().getId();
            res.userEmail = entity.getUser().getEmail();
        }
        res.amount = entity.getAmount();
        res.currency = entity.getCurrency();
        res.referenceMemo = entity.getReferenceMemo();
        res.status = entity.getStatus() != null ? entity.getStatus().name() : "PENDING";
        if (entity.getReviewedBy() != null) {
            res.reviewedByEmail = entity.getReviewedBy().getEmail();
        }
        res.adminNotes = entity.getAdminNotes();
        if (entity.getTransaction() != null) {
            res.transactionId = entity.getTransaction().getId();
        }
        res.createdAt = entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : "";
        res.updatedAt = entity.getUpdatedAt() != null ? entity.getUpdatedAt().toString() : "";
        return res;
    }

    public UUID getId() {
        return id;
    }

    public UUID getAccountId() {
        return accountId;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public String getReferenceMemo() {
        return referenceMemo;
    }

    public String getStatus() {
        return status;
    }

    public String getReviewedByEmail() {
        return reviewedByEmail;
    }

    public String getAdminNotes() {
        return adminNotes;
    }

    public UUID getTransactionId() {
        return transactionId;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }
}
