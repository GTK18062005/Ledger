package com.ledgerline;

import com.ledgerline.controllers.DepositApprovalController;
import com.ledgerline.dto.CreateDepositApprovalDto;
import com.ledgerline.dto.DepositApprovalResponse;
import com.ledgerline.dto.ReviewDepositApprovalDto;
import com.ledgerline.exceptions.UnauthorizedAccessException;
import com.ledgerline.models.Account;
import com.ledgerline.models.Role;
import com.ledgerline.models.User;
import com.ledgerline.repositories.AccountRepository;
import com.ledgerline.repositories.DepositApprovalRequestRepository;
import com.ledgerline.repositories.UserRepository;
import com.ledgerline.services.DepositApprovalService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class DepositApprovalWorkflowTests {

    @Autowired
    private DepositApprovalService depositApprovalService;

    @Autowired
    private DepositApprovalController depositApprovalController;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DepositApprovalRequestRepository depositApprovalRequestRepository;

    private User testCustomer;
    private User testAdmin;
    private Account customerAccount;

    @BeforeEach
    public void setup() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        testCustomer = userRepository.save(new User("cust_" + suffix + "@deposit.test", "hash123", Role.ACCOUNT_HOLDER));
        testAdmin = userRepository.save(new User("admin_" + suffix + "@deposit.test", "adminHash123", Role.ADMIN));
        customerAccount = accountRepository.save(new Account("ACC-DEP-" + suffix, testCustomer, BigDecimal.ZERO, "INR"));
    }

    @AfterEach
    public void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private UsernamePasswordAuthenticationToken createAuthToken(User user) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                user.getId(),
                user.getEmail(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
        return auth;
    }

    @Test
    @DisplayName("Maker-Checker: Account holder deposit request stays PENDING without prematurely crediting balance")
    public void testCustomerDepositRequestDoesNotImmediatelyCreditBalance() {
        UsernamePasswordAuthenticationToken auth = createAuthToken(testCustomer);

        CreateDepositApprovalDto requestDto = new CreateDepositApprovalDto(
                customerAccount.getId(),
                new BigDecimal("2500.00"),
                "Wire UTR: AXIS202611119948"
        );

        ResponseEntity<DepositApprovalResponse> response = depositApprovalController.createDepositRequest(requestDto, auth);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("PENDING", response.getBody().getStatus());
        assertEquals(new BigDecimal("2500.00"), response.getBody().getAmount());

        // CRITICAL CHECK: Account balance must NOT have changed!
        Account refreshed = accountRepository.findById(customerAccount.getId()).orElseThrow();
        assertEquals(0, BigDecimal.ZERO.compareTo(refreshed.getBalance()), "Customer balance must remain untouched until admin approval!");
    }

    @Test
    @DisplayName("Maker-Checker: Admin approval executes double-entry crediting customer and debiting SYSTEM_FUNDING")
    public void testAdminApprovalCreditsAccountAndPreservesZeroSum() {
        UsernamePasswordAuthenticationToken customerAuth = createAuthToken(testCustomer);

        CreateDepositApprovalDto requestDto = new CreateDepositApprovalDto(
                customerAccount.getId(),
                new BigDecimal("1500.00"),
                "Wire Ref: HDFC99381726"
        );
        DepositApprovalResponse created = depositApprovalController.createDepositRequest(requestDto, customerAuth).getBody();
        assertNotNull(created);

        UsernamePasswordAuthenticationToken adminAuth = createAuthToken(testAdmin);

        BigDecimal totalNetBefore = accountRepository.sumAllBalances();

        ReviewDepositApprovalDto reviewDto = new ReviewDepositApprovalDto("Verified incoming HDFC wire statement");
        ResponseEntity<DepositApprovalResponse> approvedResp = depositApprovalController.approveDepositRequest(created.getId(), reviewDto, adminAuth);

        assertEquals(HttpStatus.OK, approvedResp.getStatusCode());
        assertEquals("APPROVED", approvedResp.getBody().getStatus());
        assertNotNull(approvedResp.getBody().getTransactionId());

        // Balance must now be credited exactly 1500.00
        Account updatedAcc = accountRepository.findById(customerAccount.getId()).orElseThrow();
        assertEquals(new BigDecimal("1500.0000"), updatedAcc.getBalance());

        // Mathematical invariant: Net system delta across the deposit approval must remain strictly zero
        BigDecimal totalNetAfter = accountRepository.sumAllBalances();
        assertEquals(0, BigDecimal.ZERO.compareTo(totalNetAfter.subtract(totalNetBefore)),
                "Double-entry net sum delta must remain exactly 0.0000 INR!");
    }

    @Test
    @DisplayName("Security: Non-admin users cannot approve deposit requests")
    public void testNonAdminCannotApproveDepositRequest() {
        UsernamePasswordAuthenticationToken customerAuth = createAuthToken(testCustomer);

        CreateDepositApprovalDto requestDto = new CreateDepositApprovalDto(
                customerAccount.getId(),
                new BigDecimal("500.00"),
                "Fake Wire"
        );
        DepositApprovalResponse created = depositApprovalController.createDepositRequest(requestDto, customerAuth).getBody();
        assertNotNull(created);

        // Attempting to approve as regular customer
        assertThrows(UnauthorizedAccessException.class, () -> {
            depositApprovalService.approveRequest(created.getId(), testCustomer.getId(), new ReviewDepositApprovalDto("Hacked note"));
        });
    }

    @Test
    @DisplayName("Maker-Checker: Admin can reject fraudulent or unverified deposit requests")
    public void testAdminCanRejectDepositRequest() {
        UsernamePasswordAuthenticationToken customerAuth = createAuthToken(testCustomer);

        CreateDepositApprovalDto requestDto = new CreateDepositApprovalDto(
                customerAccount.getId(),
                new BigDecimal("50000.00"),
                "Unverified UTR"
        );
        DepositApprovalResponse created = depositApprovalController.createDepositRequest(requestDto, customerAuth).getBody();
        assertNotNull(created);

        UsernamePasswordAuthenticationToken adminAuth = createAuthToken(testAdmin);

        ReviewDepositApprovalDto reviewDto = new ReviewDepositApprovalDto("Wire transfer not found in clearing account");
        ResponseEntity<DepositApprovalResponse> rejectedResp = depositApprovalController.rejectDepositRequest(created.getId(), reviewDto, adminAuth);

        assertEquals("REJECTED", rejectedResp.getBody().getStatus());

        // Balance must NOT have changed
        Account acc = accountRepository.findById(customerAccount.getId()).orElseThrow();
        assertEquals(0, BigDecimal.ZERO.compareTo(acc.getBalance()));
    }
}
