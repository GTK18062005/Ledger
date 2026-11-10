package com.ledgerline.services;

import com.ledgerline.dto.RateLimitResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class RateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(RateLimiterService.class);

    private final StringRedisTemplate redisTemplate;

    // Resilient in-memory fallback for offline test environments or temporary Redis disconnects
    private final Map<String, SlidingWindowEntry> inMemoryFallbackCache = new ConcurrentHashMap<>();

    public RateLimiterService(@Autowired(required = false) StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        if (this.redisTemplate != null) {
            log.info("Redis RateLimiter initialized with live Redis template.");
        } else {
            log.warn("Redis template not provided. RateLimiter operating in high-performance in-memory fallback mode.");
        }
    }

    public RateLimitResult tryAcquire(String category, String clientId, long limitPerMinute) {
        long currentEpochMinute = Instant.now().getEpochSecond() / 60;
        long secondsRemainingInMinute = 60 - (Instant.now().getEpochSecond() % 60);

        String key = "ratelimit:" + category.toLowerCase() + ":" + clientId + ":" + currentEpochMinute;

        if (redisTemplate != null) {
            try {
                Long count = redisTemplate.opsForValue().increment(key);
                if (count != null && count == 1) {
                    redisTemplate.expire(key, Duration.ofSeconds(120));
                }

                if (count != null && count > limitPerMinute) {
                    return RateLimitResult.rejected(limitPerMinute, secondsRemainingInMinute);
                }

                long remaining = count != null ? Math.max(0, limitPerMinute - count) : limitPerMinute - 1;
                return RateLimitResult.allowed(limitPerMinute, remaining);
            } catch (Exception ex) {
                log.warn("Redis unavailable for rate limiting (key: {}). Falling back to in-memory window. Reason: {}", key, ex.getMessage());
            }
        }

        // In-Memory Fallback
        cleanOldInMemoryEntries(currentEpochMinute);
        SlidingWindowEntry entry = inMemoryFallbackCache.computeIfAbsent(
                key,
                k -> new SlidingWindowEntry(currentEpochMinute)
        );

        int currentCount = entry.counter.incrementAndGet();
        if (currentCount > limitPerMinute) {
            return RateLimitResult.rejected(limitPerMinute, secondsRemainingInMinute);
        }

        return RateLimitResult.allowed(limitPerMinute, Math.max(0, limitPerMinute - currentCount));
    }

    public boolean isRedisConnected() {
        if (redisTemplate == null) {
            return false;
        }
        try {
            String pingResult = redisTemplate.getConnectionFactory().getConnection().ping();
            return "PONG".equalsIgnoreCase(pingResult);
        } catch (Exception e) {
            return false;
        }
    }

    private void cleanOldInMemoryEntries(long currentEpochMinute) {
        if (inMemoryFallbackCache.size() > 5000) {
            inMemoryFallbackCache.entrySet().removeIf(e -> e.getValue().epochMinute < currentEpochMinute - 2);
        }
    }

    private static class SlidingWindowEntry {
        final long epochMinute;
        final AtomicInteger counter = new AtomicInteger(0);

        SlidingWindowEntry(long epochMinute) {
            this.epochMinute = epochMinute;
        }
    }
}
