package com.ledgerline.dto;

public class RateLimitResult {

    private final boolean allowed;
    private final long limit;
    private final long remaining;
    private final long retryAfterSeconds;

    public RateLimitResult(boolean allowed, long limit, long remaining, long retryAfterSeconds) {
        this.allowed = allowed;
        this.limit = limit;
        this.remaining = remaining;
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public static RateLimitResult allowed(long limit, long remaining) {
        return new RateLimitResult(true, limit, remaining, 0);
    }

    public static RateLimitResult rejected(long limit, long retryAfterSeconds) {
        return new RateLimitResult(false, limit, 0, retryAfterSeconds);
    }

    public boolean isAllowed() {
        return allowed;
    }

    public long getLimit() {
        return limit;
    }

    public long getRemaining() {
        return remaining;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}

