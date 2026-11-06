package com.ledgerline.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public class CreateAccountRequest {

    @NotNull(message = "Owner user ID is required")
    private UUID ownerId;

    @NotBlank(message = "Account number is required")
    private String accountNumber;

    @NotBlank(message = "Currency is required")
    private String currency = "INR";

    @NotNull(message = "Initial balance is required")
    @DecimalMin(value = "0.00", message = "Initial balance cannot be negative")
    private BigDecimal initialBalance = BigDecimal.ZERO;

    public CreateAccountRequest() {
    }

    public CreateAccountRequest(UUID ownerId, String accountNumber, String currency, BigDecimal initialBalance) {
        this.ownerId = ownerId;
        this.accountNumber = accountNumber;
        this.currency = currency;
        this.initialBalance = initialBalance;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(UUID ownerId) {
        this.ownerId = ownerId;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public BigDecimal getInitialBalance() {
        return initialBalance;
    }

    public void setInitialBalance(BigDecimal initialBalance) {
        this.initialBalance = initialBalance;
    }
}

