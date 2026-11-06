package com.ledgerline.dto;

import java.math.BigDecimal;

public class AggregateBalanceResponse {
    private long totalAccounts;
    private long activeAccounts;
    private BigDecimal aggregateBalance;
    private String currency;

    public AggregateBalanceResponse() {
    }

    public AggregateBalanceResponse(long totalAccounts, long activeAccounts, BigDecimal aggregateBalance, String currency) {
        this.totalAccounts = totalAccounts;
        this.activeAccounts = activeAccounts;
        this.aggregateBalance = aggregateBalance;
        this.currency = currency;
    }

    public long getTotalAccounts() {
        return totalAccounts;
    }

    public void setTotalAccounts(long totalAccounts) {
        this.totalAccounts = totalAccounts;
    }

    public long getActiveAccounts() {
        return activeAccounts;
    }

    public void setActiveAccounts(long activeAccounts) {
        this.activeAccounts = activeAccounts;
    }

    public BigDecimal getAggregateBalance() {
        return aggregateBalance;
    }

    public void setAggregateBalance(BigDecimal aggregateBalance) {
        this.aggregateBalance = aggregateBalance;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }
}

