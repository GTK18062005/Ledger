package com.ledgerline.controllers;

import com.ledgerline.repositories.AccountRepository;
import com.ledgerline.services.RateLimiterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthCheckController {

    private final AccountRepository accountRepository;
    private final RateLimiterService rateLimiterService;

    public HealthCheckController(AccountRepository accountRepository, RateLimiterService rateLimiterService) {
        this.accountRepository = accountRepository;
        this.rateLimiterService = rateLimiterService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> health = new HashMap<>();
        health.put("service", "BalanceVault Financial Engine");
        health.put("version", "1.0.0");
        health.put("timestamp", Instant.now().toString());

        boolean dbOk = false;
        boolean integrityOk = false;
        String netBalanceStr = "UNKNOWN";

        try {
            BigDecimal net = accountRepository.sumAllBalances();
            dbOk = true;
            if (net != null) {
                netBalanceStr = net.setScale(4, java.math.RoundingMode.HALF_UP).toPlainString() + " INR";
                integrityOk = net.compareTo(BigDecimal.ZERO) == 0;
            } else {
                integrityOk = true;
                netBalanceStr = "0.0000 INR";
            }
        } catch (Exception e) {
            health.put("databaseError", e.getMessage());
        }

        boolean redisOk = rateLimiterService.isRedisConnected();

        health.put("database", dbOk ? "CONNECTED" : "DOWN");
        health.put("doubleEntryIntegrity", integrityOk ? "CONSERVED_ZERO_SUM" : "VIOLATION_DETECTED");
        health.put("netSystemBalance", netBalanceStr);
        health.put("redisRateLimiter", redisOk ? "CONNECTED" : "IN_MEMORY_FALLBACK");
        health.put("status", (dbOk && integrityOk) ? "UP" : "DOWN");

        if (dbOk && integrityOk) {
            return ResponseEntity.ok(health);
        } else {
            return ResponseEntity.status(503).body(health);
        }
    }
}
