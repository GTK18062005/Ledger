package com.ledgerline.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public class WithdrawalRequest {

    private UUID accountId;
    private String accountIdentifier;

    @NotNull(message = "Withdrawal amount is required")
    @DecimalMin(value = "0.01", message = "Withdrawal amount must be greater than zero")
    private BigDecimal amount;

    private String description;

    public WithdrawalRequest() {
    }

    public WithdrawalRequest(UUID accountId, BigDecimal amount, String description) {
        this.accountId = accountId;
        this.amount = amount;
        this.description = description;
    }

    public WithdrawalRequest(String accountIdentifier, BigDecimal amount, String description) {
        setAccountInput(accountIdentifier);
        this.amount = amount;
        this.description = description;
    }

    @AssertTrue(message = "Account ID or Account Number is required")
    public boolean isValidAccount() {
        return accountId != null || (accountIdentifier != null && !accountIdentifier.trim().isEmpty());
    }

    public UUID getAccountId() {
        return accountId;
    }

    public void setAccountId(UUID accountId) {
        this.accountId = accountId;
    }

    @JsonSetter("accountId")
    public void setAccountInput(Object val) {
        if (val == null) return;
        if (val instanceof UUID) {
            this.accountId = (UUID) val;
            return;
        }
        String s = val.toString().trim();
        if (s.isEmpty()) return;
        try {
            this.accountId = UUID.fromString(s);
        } catch (IllegalArgumentException e) {
            this.accountIdentifier = s;
        }
    }

    public String getAccountIdentifier() {
        return accountIdentifier;
    }

    public void setAccountIdentifier(String accountIdentifier) {
        this.accountIdentifier = accountIdentifier;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
