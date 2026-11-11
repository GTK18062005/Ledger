package com.ledgerline.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class AccountOpeningResponse {

    private UUID id;
    private UUID userId;
    private String userEmail;
    private String userFullName;
    private String accountType;
    private String currency;
    private String reason;
    private String status;
    private String reviewedByEmail;
    private String adminNotes;
    private UUID createdAccountId;
    private String createdAccountNumber;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public AccountOpeningResponse() {
    }

    public AccountOpeningResponse(
            UUID id,
            UUID userId,
            String userEmail,
            String userFullName,
            String accountType,
            String currency,
            String reason,
            String status,
            String reviewedByEmail,
            String adminNotes,
            UUID createdAccountId,
            String createdAccountNumber,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
        this.id = id;
        this.userId = userId;
        this.userEmail = userEmail;
        this.userFullName = userFullName;
        this.accountType = accountType;
        this.currency = currency;
        this.reason = reason;
        this.status = status;
        this.reviewedByEmail = reviewedByEmail;
        this.adminNotes = adminNotes;
        this.createdAccountId = createdAccountId;
        this.createdAccountNumber = createdAccountNumber;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getUserFullName() {
        return userFullName;
    }

    public void setUserFullName(String userFullName) {
        this.userFullName = userFullName;
    }

    public String getAccountType() {
        return accountType;
    }

    public void setAccountType(String accountType) {
        this.accountType = accountType;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getReviewedByEmail() {
        return reviewedByEmail;
    }

    public void setReviewedByEmail(String reviewedByEmail) {
        this.reviewedByEmail = reviewedByEmail;
    }

    public String getAdminNotes() {
        return adminNotes;
    }

    public void setAdminNotes(String adminNotes) {
        this.adminNotes = adminNotes;
    }

    public UUID getCreatedAccountId() {
        return createdAccountId;
    }

    public void setCreatedAccountId(UUID createdAccountId) {
        this.createdAccountId = createdAccountId;
    }

    public String getCreatedAccountNumber() {
        return createdAccountNumber;
    }

    public void setCreatedAccountNumber(String createdAccountNumber) {
        this.createdAccountNumber = createdAccountNumber;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

