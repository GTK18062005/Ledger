package com.ledgerline.controllers;

import com.ledgerline.dto.AuthResponse;
import com.ledgerline.dto.BootstrapAdminRequest;
import com.ledgerline.dto.DepositRequest;
import com.ledgerline.dto.TransactionResponse;
import com.ledgerline.models.User;
import com.ledgerline.repositories.UserRepository;
import com.ledgerline.services.AdminBootstrapService;
import com.ledgerline.services.DepositService;
import com.ledgerline.services.IdempotencyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminBootstrapService adminBootstrapService;
    private final UserRepository userRepository;
    private final DepositService depositService;
    private final IdempotencyService idempotencyService;

    public AdminController(
            AdminBootstrapService adminBootstrapService,
            UserRepository userRepository,
            DepositService depositService,
            IdempotencyService idempotencyService) {
        this.adminBootstrapService = adminBootstrapService;
        this.userRepository = userRepository;
        this.depositService = depositService;
        this.idempotencyService = idempotencyService;
    }

    @PostMapping("/bootstrap")
    public ResponseEntity<AuthResponse> bootstrapAdmin(@Valid @RequestBody BootstrapAdminRequest request) {
        AuthResponse response = adminBootstrapService.bootstrapAdmin(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        List<Map<String, Object>> users = userRepository.findAll().stream()
                .map(u -> Map.<String, Object>of(
                        "id", u.getId(),
                        "email", u.getEmail(),
                        "role", u.getRole().name(),
                        "createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : ""
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @PostMapping("/deposits")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TransactionResponse> depositFunds(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody DepositRequest request,
            Authentication authentication) {
        UUID adminId = (UUID) authentication.getPrincipal();
        Optional<TransactionResponse> cached = idempotencyService.coordinateExecution(
                idempotencyKey,
                adminId,
                "ADMIN_DEPOSIT",
                request,
                TransactionResponse.class
        );
        if (cached.isPresent()) {
            return ResponseEntity.ok(cached.get());
        }

        try {
            TransactionResponse response = depositService.deposit(request, idempotencyKey, adminId);
            idempotencyService.markCompleted(idempotencyKey, response);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            idempotencyService.markFailed(idempotencyKey);
            throw e;
        }
    }
}

