package com.ledgerline.dto;

import java.math.BigDecimal;

public class IntegrityVerificationResponse {

    private long totalTransactionsReviewed;
    private long totalLedgerEntries;
    private BigDecimal totalDebits;
    private BigDecimal totalCredits;
    private BigDecimal variance;
    private BigDecimal reconciledAttestedVolume;
    private long securityAlertsCount;
    private long negativeBalanceViolations;
    private String financialIntegrityIndex;
    private String merkleRootHash;
    private BigDecimal netSystemBalance;
    private boolean conservedZeroSum;
    private String verifiedAt;

    public IntegrityVerificationResponse() {
    }

    public IntegrityVerificationResponse(
            long totalTransactionsReviewed,
            long totalLedgerEntries,
            BigDecimal totalDebits,
            BigDecimal totalCredits,
            BigDecimal variance,
            BigDecimal reconciledAttestedVolume,
            long securityAlertsCount,
            long negativeBalanceViolations,
            String financialIntegrityIndex,
            String merkleRootHash,
            BigDecimal netSystemBalance,
            boolean conservedZeroSum,
            String verifiedAt) {
        this.totalTransactionsReviewed = totalTransactionsReviewed;
        this.totalLedgerEntries = totalLedgerEntries;
        this.totalDebits = totalDebits;
        this.totalCredits = totalCredits;
        this.variance = variance;
        this.reconciledAttestedVolume = reconciledAttestedVolume;
        this.securityAlertsCount = securityAlertsCount;
        this.negativeBalanceViolations = negativeBalanceViolations;
        this.financialIntegrityIndex = financialIntegrityIndex;
        this.merkleRootHash = merkleRootHash;
        this.netSystemBalance = netSystemBalance;
        this.conservedZeroSum = conservedZeroSum;
        this.verifiedAt = verifiedAt;
    }

    public long getTotalTransactionsReviewed() {
        return totalTransactionsReviewed;
    }

    public void setTotalTransactionsReviewed(long totalTransactionsReviewed) {
        this.totalTransactionsReviewed = totalTransactionsReviewed;
    }

    public long getTotalLedgerEntries() {
        return totalLedgerEntries;
    }

    public void setTotalLedgerEntries(long totalLedgerEntries) {
        this.totalLedgerEntries = totalLedgerEntries;
    }

    public BigDecimal getTotalDebits() {
        return totalDebits;
    }

    public void setTotalDebits(BigDecimal totalDebits) {
        this.totalDebits = totalDebits;
    }

    public BigDecimal getTotalCredits() {
        return totalCredits;
    }

    public void setTotalCredits(BigDecimal totalCredits) {
        this.totalCredits = totalCredits;
    }

    public BigDecimal getVariance() {
        return variance;
    }

    public void setVariance(BigDecimal variance) {
        this.variance = variance;
    }

    public BigDecimal getReconciledAttestedVolume() {
        return reconciledAttestedVolume;
    }

    public void setReconciledAttestedVolume(BigDecimal reconciledAttestedVolume) {
        this.reconciledAttestedVolume = reconciledAttestedVolume;
    }

    public long getSecurityAlertsCount() {
        return securityAlertsCount;
    }

    public void setSecurityAlertsCount(long securityAlertsCount) {
        this.securityAlertsCount = securityAlertsCount;
    }

    public long getNegativeBalanceViolations() {
        return negativeBalanceViolations;
    }

    public void setNegativeBalanceViolations(long negativeBalanceViolations) {
        this.negativeBalanceViolations = negativeBalanceViolations;
    }

    public String getFinancialIntegrityIndex() {
        return financialIntegrityIndex;
    }

    public void setFinancialIntegrityIndex(String financialIntegrityIndex) {
        this.financialIntegrityIndex = financialIntegrityIndex;
    }

    public String getMerkleRootHash() {
        return merkleRootHash;
    }

    public void setMerkleRootHash(String merkleRootHash) {
        this.merkleRootHash = merkleRootHash;
    }

    public BigDecimal getNetSystemBalance() {
        return netSystemBalance;
    }

    public void setNetSystemBalance(BigDecimal netSystemBalance) {
        this.netSystemBalance = netSystemBalance;
    }

    public boolean isConservedZeroSum() {
        return conservedZeroSum;
    }

    public void setConservedZeroSum(boolean conservedZeroSum) {
        this.conservedZeroSum = conservedZeroSum;
    }

    public String getVerifiedAt() {
        return verifiedAt;
    }

    public void setVerifiedAt(String verifiedAt) {
        this.verifiedAt = verifiedAt;
    }
}

