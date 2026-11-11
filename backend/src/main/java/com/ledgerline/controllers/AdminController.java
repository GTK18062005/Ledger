package com.ledgerline.controllers;

import com.ledgerline.dto.AuthResponse;
import com.ledgerline.dto.BootstrapAdminRequest;
import com.ledgerline.dto.DepositRequest;
import com.ledgerline.dto.TransactionResponse;
import com.ledgerline.models.Account;
import com.ledgerline.models.User;
import com.ledgerline.repositories.AccountRepository;
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

import java.math.BigDecimal;
import java.util.HashMap;
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
    private final AccountRepository accountRepository;
    private final DepositService depositService;
    private final IdempotencyService idempotencyService;

    public AdminController(
            AdminBootstrapService adminBootstrapService,
            UserRepository userRepository,
            AccountRepository accountRepository,
            DepositService depositService,
            IdempotencyService idempotencyService) {
        this.adminBootstrapService = adminBootstrapService;
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
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
        List<Account> allAccounts = accountRepository.findAll();
        Map<UUID, List<Account>> accountsByOwner = allAccounts.stream()
                .filter(a -> a.getOwner() != null)
                .collect(Collectors.groupingBy(a -> a.getOwner().getId()));

        List<Map<String, Object>> users = userRepository.findAll().stream()
                .map(u -> {
                    List<Account> owned = accountsByOwner.getOrDefault(u.getId(), List.of());
                    BigDecimal totalBal = owned.stream()
                            .filter(a -> !a.isSystem())
                            .map(Account::getBalance)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", u.getId());
                    item.put("email", u.getEmail());
                    item.put("fullName", u.getFullName() != null ? u.getFullName() : "");
                    item.put("role", u.getRole().name());
                    item.put("accountCount", owned.size());
                    item.put("totalBalance", totalBal);
                    item.put("createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : "");
                    return item;
                })
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

