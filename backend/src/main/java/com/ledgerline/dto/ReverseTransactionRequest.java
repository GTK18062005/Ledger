package com.ledgerline.dto;

import jakarta.validation.constraints.Size;

public class ReverseTransactionRequest {

    @Size(max = 220, message = "Reversal reason must be under 220 characters")
    private String reason;

    public ReverseTransactionRequest() {
    }

    public ReverseTransactionRequest(String reason) {
        this.reason = reason;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}

