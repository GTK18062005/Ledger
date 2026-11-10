package com.ledgerline.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ledgerline.dto.ErrorResponse;
import com.ledgerline.dto.RateLimitResult;
import com.ledgerline.services.RateLimiterService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimiterService rateLimiterService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RateLimitingFilter(RateLimiterService rateLimiterService) {
        this.rateLimiterService = rateLimiterService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        // Exempt public healthchecks and H2 console from rate limiting
        if (path.startsWith("/actuator") || path.equals("/api/health") || path.startsWith("/h2-console") || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        // Only enforce on /api/** endpoints
        if (!path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String category;
        long limit;

        if (path.startsWith("/api/auth/") || path.equals("/api/admin/bootstrap")) {
            category = "AUTH";
            limit = 15; // 15 auth requests per minute to prevent brute-force attacks
        } else if (path.equals("/api/transfers") || path.equals("/api/withdrawals") || path.equals("/api/deposits")) {
            category = "FINANCIAL";
            limit = 30; // 30 balance-modifying operations per minute per client
        } else {
            category = "GENERAL";
            limit = 120; // 120 general queries per minute
        }

        String clientId = resolveClientId(request);
        RateLimitResult result = rateLimiterService.tryAcquire(category, clientId, limit);

        response.setHeader("X-RateLimit-Limit", String.valueOf(result.getLimit()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(result.getRemaining()));

        if (!result.isAllowed()) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", String.valueOf(result.getRetryAfterSeconds()));
            response.setHeader("X-RateLimit-Reset", String.valueOf(result.getRetryAfterSeconds()));

            ErrorResponse error = new ErrorResponse(
                    HttpStatus.TOO_MANY_REQUESTS.value(),
                    "RATE_LIMIT_EXCEEDED",
                    "Too many requests for " + category + " operations. Please retry in " + result.getRetryAfterSeconds() + " seconds.",
                    path
            );

            response.getWriter().write(objectMapper.writeValueAsString(error));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String resolveClientId(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() != null && !"anonymousUser".equals(auth.getPrincipal())) {
            return "user:" + auth.getPrincipal().toString();
        }

        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return "ip:" + forwarded.split(",")[0].trim();
        }

        return "ip:" + request.getRemoteAddr();
    }
}
