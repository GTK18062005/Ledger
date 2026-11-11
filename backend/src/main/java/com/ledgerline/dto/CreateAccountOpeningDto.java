package com.ledgerline.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateAccountOpeningDto {

    @NotBlank(message = "Account type is required")
    @Size(max = 64, message = "Account type must be under 64 characters")
    private String accountType;

    @Size(max = 8, message = "Currency code must be under 8 characters")
    private String currency = "INR";

    @Size(max = 500, message = "Reason must be under 500 characters")
    private String reason;

    public CreateAccountOpeningDto() {
    }

    public CreateAccountOpeningDto(String accountType, String currency, String reason) {
        this.accountType = accountType;
        this.currency = currency;
        this.reason = reason;
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
}

