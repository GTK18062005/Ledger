package com.ledgerline.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "account_opening_requests", indexes = {
        @Index(name = "idx_acc_req_status", columnList = "status"),
        @Index(name = "idx_acc_req_user", columnList = "user_id"),
        @Index(name = "idx_acc_req_created", columnList = "created_at")
})
public class AccountOpeningRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "account_type", nullable = false, length = 64)
    private String accountType;

    @Column(nullable = false, length = 8)
    private String currency = "INR";

    @Column(length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private DepositApprovalStatus status = DepositApprovalStatus.PENDING;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "admin_notes", length = 500)
    private String adminNotes;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_account_id")
    private Account createdAccount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public AccountOpeningRequest() {
    }

    public AccountOpeningRequest(User user, String accountType, String currency, String reason) {
        this.user = user;
        this.accountType = accountType;
        this.currency = currency != null ? currency : "INR";
        this.reason = reason;
        this.status = DepositApprovalStatus.PENDING;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
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

    public DepositApprovalStatus getStatus() {
        return status;
    }

    public void setStatus(DepositApprovalStatus status) {
        this.status = status;
    }

    public User getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(User reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public String getAdminNotes() {
        return adminNotes;
    }

    public void setAdminNotes(String adminNotes) {
        this.adminNotes = adminNotes;
    }

    public Account getCreatedAccount() {
        return createdAccount;
    }

    public void setCreatedAccount(Account createdAccount) {
        this.createdAccount = createdAccount;
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

