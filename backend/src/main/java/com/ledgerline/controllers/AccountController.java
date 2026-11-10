package com.ledgerline.controllers;

import com.ledgerline.dto.AccountResponse;
import com.ledgerline.dto.AggregateBalanceResponse;
import com.ledgerline.dto.CreateAccountRequest;
import com.ledgerline.dto.StatementItemResponse;
import com.ledgerline.dto.UpdateAccountStatusRequest;
import com.ledgerline.models.Role;
import com.ledgerline.services.AccountService;
import com.ledgerline.services.StatementService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;
    private final StatementService statementService;

    public AccountController(AccountService accountService, StatementService statementService) {
        this.accountService = accountService;
        this.statementService = statementService;
    }

    private UUID getUserId(Authentication auth) {
        return (UUID) auth.getPrincipal();
    }

    private Role getUserRole(Authentication auth) {
        String authority = auth.getAuthorities().iterator().next().getAuthority();
        return Role.valueOf(authority.replace("ROLE_", ""));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AccountResponse> createAccount(
            @Valid @RequestBody CreateAccountRequest request,
            Authentication authentication) {
        AccountResponse response = accountService.createAccount(request, getUserId(authentication));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/open")
    @PreAuthorize("hasRole('ACCOUNT_HOLDER')")
    public ResponseEntity<AccountResponse> openAccount(
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication) {
        String currency = body != null ? body.get("currency") : "INR";
        AccountResponse response = accountService.openAccountForUser(getUserId(authentication), currency);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @RequestMapping(value = "/{id}/status", method = {RequestMethod.POST, RequestMethod.PATCH, RequestMethod.PUT})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AccountResponse> updateAccountStatus(
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateAccountStatusRequest request,
            Authentication authentication) {
        AccountResponse response = accountService.updateAccountStatus(
                id,
                request.getStatus(),
                request.getAdminReason(),
                getUserId(authentication)
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<AccountResponse>> getAccounts(Authentication authentication) {
        List<AccountResponse> accounts = accountService.getAccounts(getUserId(authentication), getUserRole(authentication));
        return ResponseEntity.ok(accounts);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AccountResponse> getAccountById(
            @PathVariable("id") UUID id,
            Authentication authentication) {
        AccountResponse account = accountService.getAccountById(id, getUserId(authentication), getUserRole(authentication));
        return ResponseEntity.ok(account);
    }

    @GetMapping("/{id}/statement")
    public ResponseEntity<List<StatementItemResponse>> getStatement(
            @PathVariable("id") UUID id,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size,
            Authentication authentication) {
        List<StatementItemResponse> statement = statementService.getStatement(
                id,
                getUserId(authentication),
                getUserRole(authentication),
                page,
                size
        );
        return ResponseEntity.ok(statement);
    }

    @GetMapping("/aggregate")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public ResponseEntity<AggregateBalanceResponse> getAggregateBalance() {
        return ResponseEntity.ok(accountService.getAggregateBalances());
    }
}
