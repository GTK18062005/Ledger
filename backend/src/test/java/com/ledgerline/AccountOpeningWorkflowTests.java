package com.ledgerline;

import com.ledgerline.controllers.AccountOpeningController;
import com.ledgerline.dto.AccountOpeningResponse;
import com.ledgerline.dto.CreateAccountOpeningDto;
import com.ledgerline.dto.ReviewDepositApprovalDto;
import com.ledgerline.exceptions.InvalidTransactionException;
import com.ledgerline.exceptions.UnauthorizedAccessException;
import com.ledgerline.models.Account;
import com.ledgerline.models.Role;
import com.ledgerline.models.User;
import com.ledgerline.repositories.AccountOpeningRequestRepository;
import com.ledgerline.repositories.AccountRepository;
import com.ledgerline.repositories.UserRepository;
import com.ledgerline.services.AccountOpeningService;
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
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class AccountOpeningWorkflowTests {

    @Autowired
    private AccountOpeningController controller;

    @Autowired
    private AccountOpeningService service;

    @Autowired
    private AccountOpeningRequestRepository requestRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private UserRepository userRepository;

    private User testCustomer;
    private User testAdmin;

    @BeforeEach
    public void setup() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        testCustomer = userRepository.save(new User("accreq_cust_" + suffix + "@test.io", "hash123", Role.ACCOUNT_HOLDER));
        testAdmin = userRepository.save(new User("accreq_admin_" + suffix + "@test.io", "hash123", Role.ADMIN));
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
    @DisplayName("Account Request: Customer submits request persisted as PENDING without creating account prematurely")
    public void testCreateAccountRequestPersistsPending() {
        UsernamePasswordAuthenticationToken auth = createAuthToken(testCustomer);
        CreateAccountOpeningDto dto = new CreateAccountOpeningDto("Business", "INR", "Operating corporate account");

        ResponseEntity<AccountOpeningResponse> res = controller.createAccountRequest(dto, auth);
        assertEquals(HttpStatus.CREATED, res.getStatusCode());
        assertNotNull(res.getBody());
        assertEquals("PENDING", res.getBody().getStatus());
        assertEquals("BUSINESS", res.getBody().getAccountType());
        assertNull(res.getBody().getCreatedAccountId());

        List<Account> customerAccounts = accountRepository.findByOwnerId(testCustomer.getId());
        assertEquals(0, customerAccounts.size(), "Account must not be opened before admin approval");
    }

    @Test
    @DisplayName("Account Request: Duplicate PENDING request of same type is rejected cleanly")
    public void testDuplicatePendingRequestBlocked() {
        UsernamePasswordAuthenticationToken auth = createAuthToken(testCustomer);
        controller.createAccountRequest(new CreateAccountOpeningDto("Business", "INR", "First request"), auth);

        assertThrows(InvalidTransactionException.class, () -> {
            controller.createAccountRequest(new CreateAccountOpeningDto("Business", "INR", "Duplicate"), auth);
        });
    }

    @Test
    @DisplayName("Account Request: Admin approval provisions real zero-balance account and marks APPROVED")
    public void testAdminApprovalProvisionsAccount() {
        UsernamePasswordAuthenticationToken custAuth = createAuthToken(testCustomer);
        AccountOpeningResponse created = controller.createAccountRequest(
                new CreateAccountOpeningDto("Treasury Vault", "USD", "Reserve settlement vault"),
                custAuth
        ).getBody();
        assertNotNull(created);

        // Non-admin cannot approve
        assertThrows(UnauthorizedAccessException.class, () -> {
            service.approveRequest(created.getId(), testCustomer.getId(), new ReviewDepositApprovalDto("Attempted self approval"));
        });

        // Admin approves
        UsernamePasswordAuthenticationToken adminAuth = createAuthToken(testAdmin);
        ResponseEntity<AccountOpeningResponse> approvedRes = controller.approveAccountRequest(
                created.getId(),
                new ReviewDepositApprovalDto("KYC and corporate reserve verified"),
                adminAuth
        );

        assertEquals(HttpStatus.OK, approvedRes.getStatusCode());
        assertEquals("APPROVED", approvedRes.getBody().getStatus());
        assertNotNull(approvedRes.getBody().getCreatedAccountId());
        assertNotNull(approvedRes.getBody().getCreatedAccountNumber());

        List<Account> accounts = accountRepository.findByOwnerId(testCustomer.getId());
        assertEquals(1, accounts.size());
        assertEquals(0, BigDecimal.ZERO.compareTo(accounts.get(0).getBalance()));
        assertEquals("USD", accounts.get(0).getCurrency());
    }

    @Test
    @DisplayName("Account Request: Admin rejection records REJECTED without opening an account")
    public void testAdminRejectionBlocksAccountCreation() {
        UsernamePasswordAuthenticationToken custAuth = createAuthToken(testCustomer);
        AccountOpeningResponse created = controller.createAccountRequest(
                new CreateAccountOpeningDto("Personal", "INR", "Secondary wallet"),
                custAuth
        ).getBody();
        assertNotNull(created);

        UsernamePasswordAuthenticationToken adminAuth = createAuthToken(testAdmin);
        ResponseEntity<AccountOpeningResponse> rejectedRes = controller.rejectAccountRequest(
                created.getId(),
                new ReviewDepositApprovalDto("Insufficient documentation"),
                adminAuth
        );

        assertEquals("REJECTED", rejectedRes.getBody().getStatus());
        assertNull(rejectedRes.getBody().getCreatedAccountId());
        assertEquals(0, accountRepository.findByOwnerId(testCustomer.getId()).size());
    }
}

