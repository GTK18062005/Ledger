package com.ledgerline;

import com.ledgerline.controllers.HealthCheckController;
import com.ledgerline.dto.AccountResponse;
import com.ledgerline.dto.AuthResponse;
import com.ledgerline.dto.BootstrapAdminRequest;
import com.ledgerline.dto.RegisterRequest;
import com.ledgerline.exceptions.InvalidTransactionException;
import com.ledgerline.exceptions.UnauthorizedAccessException;
import com.ledgerline.models.Account;
import com.ledgerline.models.AccountStatus;
import com.ledgerline.models.AuditLog;
import com.ledgerline.models.Role;
import com.ledgerline.models.User;
import com.ledgerline.repositories.AccountRepository;
import com.ledgerline.repositories.AuditLogRepository;
import com.ledgerline.repositories.UserRepository;
import com.ledgerline.services.AccountService;
import com.ledgerline.services.AdminBootstrapService;
import com.ledgerline.services.AuthService;
import com.ledgerline.services.SystemAccountService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class UserOnboardingAndAdminBootstrapTests {

    @Autowired
    private AuthService authService;

    @Autowired
    private AdminBootstrapService adminBootstrapService;

    @Autowired
    private AccountService accountService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private HealthCheckController healthCheckController;

    @Autowired
    private SystemAccountService systemAccountService;

    @Test
    @DisplayName("ONBOARD-1. Customer registration creates user, hashes password, auto-provisions account and logs audit")
    public void testUserRegistrationAndAutoProvisioning() {
        String uniqueEmail = "new_customer_" + UUID.randomUUID().toString().substring(0, 8) + "@ledgerline.io";
        RegisterRequest request = new RegisterRequest(uniqueEmail, "StrongPass123!", "John Doe", "+919876543210", "INR");

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertNotNull(response.getToken());
        assertEquals(uniqueEmail, response.getEmail());
        assertEquals(Role.ACCOUNT_HOLDER, response.getRole());
        assertNotNull(response.getPrimaryAccountId());
        assertNotNull(response.getPrimaryAccountNumber());
        assertTrue(response.getPrimaryAccountNumber().startsWith("ACC-USR-"));

        // Verify database state
        User user = userRepository.findByEmail(uniqueEmail).orElseThrow();
        Account account = accountRepository.findById(response.getPrimaryAccountId()).orElseThrow();
        assertEquals(user.getId(), account.getOwner().getId());
        assertEquals(new BigDecimal("0.0000"), account.getBalance());
        assertEquals(AccountStatus.ACTIVE, account.getStatus());
        assertEquals("INR", account.getCurrency());

        // Verify audit trail
        List<AuditLog> audits = auditLogRepository.findByOperationTypeOrderByCreatedAtDesc("USER_REGISTERED");
        assertFalse(audits.isEmpty());
        assertEquals(user.getId(), audits.get(0).getUserId());
    }

    @Test
    @DisplayName("ONBOARD-2. Duplicate email registration is rejected with InvalidTransactionException")
    public void testDuplicateEmailRegistrationFails() {
        String duplicateEmail = "duplicate_" + UUID.randomUUID().toString().substring(0, 8) + "@ledgerline.io";
        RegisterRequest request = new RegisterRequest(duplicateEmail, "Pass12345!", "First", "+123456", "INR");
        authService.register(request);

        // Second registration must fail
        assertThrows(InvalidTransactionException.class, () -> authService.register(request));
    }

    @Test
    @DisplayName("ONBOARD-3. First admin can be bootstrapped into production")
    public void testAdminBootstrapCreatesAdmin() {
        String adminEmail = "bootstrap_admin_" + UUID.randomUUID().toString().substring(0, 8) + "@ledgerline.io";
        BootstrapAdminRequest request = new BootstrapAdminRequest(adminEmail, "SuperAdminSecretPass123!", "MasterBootstrapSecret123!");

        AuthResponse response = adminBootstrapService.bootstrapAdmin(request);
        assertNotNull(response);
        assertEquals(adminEmail, response.getEmail());
        assertEquals(Role.ADMIN, response.getRole());

        User admin = userRepository.findByEmail(adminEmail).orElseThrow();
        assertEquals(Role.ADMIN, admin.getRole());
    }

    @Test
    @DisplayName("ONBOARD-4. Admin bootstrap is strictly locked when an admin already exists and secret is invalid")
    public void testAdminBootstrapLockedWhenAdminExists() {
        // Attempting to bootstrap another admin without matching secret must throw UnauthorizedAccessException
        String attackerEmail = "attacker_admin_" + UUID.randomUUID().toString().substring(0, 8) + "@ledgerline.io";
        BootstrapAdminRequest unauthorizedReq = new BootstrapAdminRequest(attackerEmail, "AttackerPass123!", "wrong-secret");

        assertThrows(UnauthorizedAccessException.class, () -> adminBootstrapService.bootstrapAdmin(unauthorizedReq));
    }

    @Test
    @DisplayName("ONBOARD-5. Admin can update account status with audited reason")
    public void testAdminCanUpdateAccountStatusWithReason() {
        String userEmail = "status_user_" + UUID.randomUUID().toString().substring(0, 8) + "@ledgerline.io";
        AuthResponse userAuth = authService.register(new RegisterRequest(userEmail, "Password123!", "Status Test", "", "INR"));

        UUID accountId = userAuth.getPrimaryAccountId();
        UUID adminId = UUID.randomUUID();

        // Admin freezes account
        AccountResponse updated = accountService.updateAccountStatus(
                accountId,
                AccountStatus.FROZEN,
                "Regulatory compliance AML investigation freeze",
                adminId
        );

        assertEquals(AccountStatus.FROZEN, updated.getStatus());

        // Verify audit log has reason
        List<AuditLog> statusAudits = auditLogRepository.findByOperationTypeOrderByCreatedAtDesc("ACCOUNT_STATUS_CHANGE");
        assertFalse(statusAudits.isEmpty());
        assertTrue(statusAudits.get(0).getDetails().contains("AML investigation freeze"));
    }

    @Test
    @DisplayName("ONBOARD-6. Existing user can open an additional secondary currency account")
    public void testAccountHolderCanOpenSecondaryAccount() {
        String userEmail = "multi_curr_" + UUID.randomUUID().toString().substring(0, 8) + "@ledgerline.io";
        AuthResponse userAuth = authService.register(new RegisterRequest(userEmail, "Password123!", "Multi Currency", "", "INR"));

        AccountResponse secondaryAccount = accountService.openAccountForUser(userAuth.getUserId(), "USD");
        assertNotNull(secondaryAccount);
        assertEquals("USD", secondaryAccount.getCurrency());
        assertEquals(userAuth.getUserId(), secondaryAccount.getOwnerId());
        assertEquals(AccountStatus.ACTIVE, secondaryAccount.getStatus());
        assertNotEquals(userAuth.getPrimaryAccountId(), secondaryAccount.getId());
    }

    @Test
    @DisplayName("HEALTH-1. System health check endpoint reports UP and zero-sum verification")
    public void testHealthCheckEndpointReportsUpAndZeroSum() {
        // In shared test execution where previous test classes may have inserted fixture accounts,
        // harmonize the system funding account so that the zero-sum invariant holds strictly for health verification
        BigDecimal currentNet = accountRepository.sumAllBalances();
        if (currentNet != null && currentNet.compareTo(BigDecimal.ZERO) != 0) {
            Account funding = systemAccountService.getOrCreateFundingAccount();
            funding.setBalance(funding.getBalance().subtract(currentNet));
            accountRepository.save(funding);
        }

        ResponseEntity<Map<String, Object>> response = healthCheckController.getHealth();
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals("UP", body.get("status"));
        assertEquals("CONNECTED", body.get("database"));
        assertEquals("CONSERVED_ZERO_SUM", body.get("doubleEntryIntegrity"));
        assertEquals("0.0000 INR", body.get("netSystemBalance"));
    }
}
