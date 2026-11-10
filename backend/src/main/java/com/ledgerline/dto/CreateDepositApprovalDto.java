package com.ledgerline.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public class CreateDepositApprovalDto {

    private UUID accountId;
    private String accountIdentifier;

    @NotNull(message = "Deposit amount is required")
    @DecimalMin(value = "0.01", message = "Deposit amount must be strictly greater than zero")
    private BigDecimal amount;

    private String referenceMemo;

    public CreateDepositApprovalDto() {
    }

    public CreateDepositApprovalDto(UUID accountId, BigDecimal amount, String referenceMemo) {
        this.accountId = accountId;
        this.amount = amount;
        this.referenceMemo = referenceMemo;
    }

    public CreateDepositApprovalDto(String accountIdentifier, BigDecimal amount, String referenceMemo) {
        setAccountInput(accountIdentifier);
        this.amount = amount;
        this.referenceMemo = referenceMemo;
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

    public String getAccountIdentifier() {
        return accountIdentifier;
    }

    public void setAccountIdentifier(String accountIdentifier) {
        this.accountIdentifier = accountIdentifier;
    }

    @JsonSetter("accountInput")
    public void setAccountInput(String input) {
        if (input == null || input.trim().isEmpty()) return;
        String trimmed = input.trim();
        try {
            this.accountId = UUID.fromString(trimmed);
        } catch (IllegalArgumentException e) {
            this.accountIdentifier = trimmed;
        }
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
}

