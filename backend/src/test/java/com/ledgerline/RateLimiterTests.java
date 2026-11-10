package com.ledgerline;

import com.ledgerline.dto.RateLimitResult;
import com.ledgerline.services.RateLimiterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class RateLimiterTests {

    private RateLimiterService rateLimiterService;

    @BeforeEach
    public void setup() {
        // Test in-memory fallback engine directly without requiring external Redis dependency
        rateLimiterService = new RateLimiterService(null);
    }

    @Test
    @DisplayName("RateLimit-1. Requests within quota succeed with accurate remaining counter")
    public void testRequestsWithinQuotaAllowed() {
        String clientId = "test-client-1";
        long limit = 5;

        for (int i = 1; i <= limit; i++) {
            RateLimitResult result = rateLimiterService.tryAcquire("FINANCIAL", clientId, limit);
            assertTrue(result.isAllowed(), "Request " + i + " should be allowed");
            assertEquals(limit - i, result.getRemaining(), "Remaining quota should decrement accurately");
        }
    }

    @Test
    @DisplayName("RateLimit-2. Requests exceeding quota are blocked with HTTP 429 semantics and retryAfter")
    public void testRequestsExceedingQuotaBlocked() {
        String clientId = "test-client-2";
        long limit = 3;

        // Exhaust quota
        for (int i = 0; i < limit; i++) {
            RateLimitResult res = rateLimiterService.tryAcquire("AUTH", clientId, limit);
            assertTrue(res.isAllowed());
        }

        // Exceeded request
        RateLimitResult blocked = rateLimiterService.tryAcquire("AUTH", clientId, limit);
        assertFalse(blocked.isAllowed(), "Request exceeding quota must be blocked");
        assertEquals(0, blocked.getRemaining());
        assertTrue(blocked.getRetryAfterSeconds() > 0 && blocked.getRetryAfterSeconds() <= 60,
                "Retry after must be between 1 and 60 seconds");
    }

    @Test
    @DisplayName("RateLimit-3. Multiple clients and categories are isolated from each other")
    public void testClientAndCategoryIsolation() {
        String clientA = "user-alice-101";
        String clientB = "user-bob-202";
        long limit = 2;

        // Exhaust clientA's FINANCIAL quota
        rateLimiterService.tryAcquire("FINANCIAL", clientA, limit);
        rateLimiterService.tryAcquire("FINANCIAL", clientA, limit);
        assertFalse(rateLimiterService.tryAcquire("FINANCIAL", clientA, limit).isAllowed());

        // Client B is completely unaffected
        assertTrue(rateLimiterService.tryAcquire("FINANCIAL", clientB, limit).isAllowed());

        // Client A's AUTH quota is also separate and unaffected
        assertTrue(rateLimiterService.tryAcquire("AUTH", clientA, limit).isAllowed());
    }
}
