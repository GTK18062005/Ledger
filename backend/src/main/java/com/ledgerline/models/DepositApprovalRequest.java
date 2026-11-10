package com.ledgerline.models;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "deposit_approval_requests", indexes = {
    @Index(name = "idx_dep_approval_status", columnList = "status"),
    @Index(name = "idx_dep_approval_user", columnList = "user_id"),
    @Index(name = "idx_dep_approval_account", columnList = "account_id"),
    @Index(name = "idx_dep_approval_created", columnList = "created_at")
})
public class DepositApprovalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(nullable = false, length = 8)
    private String currency = "INR";

    @Column(name = "reference_memo", length = 255)
    private String referenceMemo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private DepositApprovalStatus status = DepositApprovalStatus.PENDING;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "admin_notes", length = 500)
    private String adminNotes;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "transaction_id")
    private Transaction transaction;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public DepositApprovalRequest() {
    }

    public DepositApprovalRequest(Account account, User user, BigDecimal amount, String currency, String referenceMemo) {
        this.account = account;
        this.user = user;
        this.amount = amount;
        this.currency = currency != null ? currency : "INR";
        this.referenceMemo = referenceMemo;
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

    public Account getAccount() {
        return account;
    }

    public void setAccount(Account account) {
        this.account = account;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getReferenceMemo() {
        return referenceMemo;
    }

    public void setReferenceMemo(String referenceMemo) {
        this.referenceMemo = referenceMemo;
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

    public Transaction getTransaction() {
        return transaction;
    }

    public void setTransaction(Transaction transaction) {
        this.transaction = transaction;
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
