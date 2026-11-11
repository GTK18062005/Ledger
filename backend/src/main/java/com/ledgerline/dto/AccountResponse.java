package com.ledgerline.dto;

import com.ledgerline.models.AccountStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class AccountResponse {
    private UUID id;
    private String accountNumber;
    private UUID ownerId;
    private String ownerEmail;
    private BigDecimal balance;
    private String currency;
    private AccountStatus status;
    private boolean isSystem;
    private LocalDateTime createdAt;

    public AccountResponse() {
    }

    public AccountResponse(UUID id, String accountNumber, UUID ownerId, String ownerEmail,
                           BigDecimal balance, String currency, AccountStatus status, LocalDateTime createdAt) {
        this(id, accountNumber, ownerId, ownerEmail, balance, currency, status, false, createdAt);
    }

    public AccountResponse(UUID id, String accountNumber, UUID ownerId, String ownerEmail,
                           BigDecimal balance, String currency, AccountStatus status, boolean isSystem, LocalDateTime createdAt) {
        this.id = id;
        this.accountNumber = accountNumber;
        this.ownerId = ownerId;
        this.ownerEmail = ownerEmail;
        this.balance = balance;
        this.currency = currency;
        this.status = status;
        this.isSystem = isSystem;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(UUID ownerId) {
        this.ownerId = ownerId;
    }

    public String getOwnerEmail() {
        return ownerEmail;
    }

    public void setOwnerEmail(String ownerEmail) {
        this.ownerEmail = ownerEmail;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public AccountStatus getStatus() {
        return status;
    }

    public void setStatus(AccountStatus status) {
        this.status = status;
    }

    public boolean isSystem() {
        return isSystem;
    }

    public void setSystem(boolean system) {
        isSystem = system;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

