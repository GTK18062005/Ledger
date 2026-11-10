package com.ledgerline.health;

import com.ledgerline.repositories.AccountRepository;
import com.ledgerline.services.RateLimiterService;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class LedgerIntegrityHealthIndicator implements HealthIndicator {

    private final AccountRepository accountRepository;
    private final RateLimiterService rateLimiterService;

    public LedgerIntegrityHealthIndicator(AccountRepository accountRepository, RateLimiterService rateLimiterService) {
        this.accountRepository = accountRepository;
        this.rateLimiterService = rateLimiterService;
    }

    @Override
    public Health health() {
        try {
            BigDecimal totalBalance = accountRepository.sumAllBalances();
            boolean isZeroSum = totalBalance == null || totalBalance.compareTo(BigDecimal.ZERO) == 0;
            boolean redisConnected = rateLimiterService.isRedisConnected();

            if (isZeroSum) {
                return Health.up()
                        .withDetail("service", "BalanceVault Financial Ledger Engine")
                        .withDetail("doubleEntryIntegrity", "CONSERVED_ZERO_SUM")
                        .withDetail("systemNetBalance", "0.0000 INR")
                        .withDetail("redisRateLimiter", redisConnected ? "CONNECTED" : "IN_MEMORY_FALLBACK")
                        .build();
            } else {
                return Health.down()
                        .withDetail("service", "BalanceVault Financial Ledger Engine")
                        .withDetail("doubleEntryIntegrity", "CRITICAL_DRIFT_DETECTED")
                        .withDetail("systemNetBalance", totalBalance.toPlainString() + " INR")
                        .withDetail("redisRateLimiter", redisConnected ? "CONNECTED" : "IN_MEMORY_FALLBACK")
                        .build();
            }
        } catch (Exception ex) {
            return Health.down(ex)
                    .withDetail("service", "BalanceVault Financial Ledger Engine")
                    .withDetail("error", "Database connection or integrity query failed: " + ex.getMessage())
                    .build();
        }
    }
}
