package com.ledgerline.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public class TransferRequest {

    private UUID sourceAccountId;
    private String sourceAccountIdentifier;

    private UUID destinationAccountId;
    private String destinationAccountIdentifier;

    @NotNull(message = "Transfer amount is required")
    @DecimalMin(value = "0.01", message = "Transfer amount must be greater than zero")
    private BigDecimal amount;

    private String description;

    public TransferRequest() {
    }

    public TransferRequest(UUID sourceAccountId, UUID destinationAccountId, BigDecimal amount, String description) {
        this.sourceAccountId = sourceAccountId;
        this.destinationAccountId = destinationAccountId;
        this.amount = amount;
        this.description = description;
    }

    public TransferRequest(UUID sourceAccountId, String destinationIdentifier, BigDecimal amount, String description) {
        this.sourceAccountId = sourceAccountId;
        setDestinationAccountInput(destinationIdentifier);
        this.amount = amount;
        this.description = description;
    }

    @AssertTrue(message = "Source account ID or Account Number is required")
    public boolean isValidSource() {
        return sourceAccountId != null || (sourceAccountIdentifier != null && !sourceAccountIdentifier.trim().isEmpty());
    }

    @AssertTrue(message = "Destination account ID or Account Number is required")
    public boolean isValidDestination() {
        return destinationAccountId != null || (destinationAccountIdentifier != null && !destinationAccountIdentifier.trim().isEmpty());
    }

    public UUID getSourceAccountId() {
        return sourceAccountId;
    }

    public void setSourceAccountId(UUID sourceAccountId) {
        this.sourceAccountId = sourceAccountId;
    }

    @JsonSetter("sourceAccountId")
    public void setSourceAccountInput(Object val) {
        if (val == null) return;
        if (val instanceof UUID) {
            this.sourceAccountId = (UUID) val;
            return;
        }
        String s = val.toString().trim();
        if (s.isEmpty()) return;
        try {
            this.sourceAccountId = UUID.fromString(s);
        } catch (IllegalArgumentException e) {
            this.sourceAccountIdentifier = s;
        }
    }

    @JsonSetter("sourceAccount")
    public void setSourceAccount(String val) {
        setSourceAccountInput(val);
    }

    public String getSourceAccountIdentifier() {
        return sourceAccountIdentifier;
    }

    public void setSourceAccountIdentifier(String sourceAccountIdentifier) {
        this.sourceAccountIdentifier = sourceAccountIdentifier;
    }

    public UUID getDestinationAccountId() {
        return destinationAccountId;
    }

    public void setDestinationAccountId(UUID destinationAccountId) {
        this.destinationAccountId = destinationAccountId;
    }

    @JsonSetter("destinationAccountId")
    public void setDestinationAccountInput(Object val) {
        if (val == null) return;
        if (val instanceof UUID) {
            this.destinationAccountId = (UUID) val;
            return;
        }
        String s = val.toString().trim();
        if (s.isEmpty()) return;
        try {
            this.destinationAccountId = UUID.fromString(s);
        } catch (IllegalArgumentException e) {
            this.destinationAccountIdentifier = s;
        }
    }

    @JsonSetter("destinationAccount")
    public void setDestinationAccount(String val) {
        setDestinationAccountInput(val);
    }

    public String getDestinationAccountIdentifier() {
        return destinationAccountIdentifier;
    }

    public void setDestinationAccountIdentifier(String destinationAccountIdentifier) {
        this.destinationAccountIdentifier = destinationAccountIdentifier;
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
