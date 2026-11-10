package com.ledgerline.dto;

import com.ledgerline.models.AccountStatus;
import jakarta.validation.constraints.NotNull;

public class UpdateAccountStatusRequest {

    @NotNull(message = "Account status is required")
    private AccountStatus status;

    private String adminReason;

    public UpdateAccountStatusRequest() {
    }

    public UpdateAccountStatusRequest(AccountStatus status, String adminReason) {
        this.status = status;
        this.adminReason = adminReason;
    }

    public AccountStatus getStatus() {
        return status;
    }

    public void setStatus(AccountStatus status) {
        this.status = status;
    }

    public String getAdminReason() {
        if (adminReason == null || adminReason.trim().isEmpty()) {
            return "Administrative status update";
        }
        return adminReason.trim();
    }

    public void setAdminReason(String adminReason) {
        this.adminReason = adminReason;
    }
}

