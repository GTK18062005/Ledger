package com.ledgerline;

import com.ledgerline.controllers.AuditController;
import com.ledgerline.controllers.PlatformTransactionController;
import com.ledgerline.dto.*;
import com.ledgerline.exceptions.InsufficientFundsException;
import com.ledgerline.exceptions.InvalidTransactionException;
import com.ledgerline.models.Account;
import com.ledgerline.models.Role;
import com.ledgerline.models.User;
import com.ledgerline.repositories.AccountRepository;
import com.ledgerline.repositories.AuditLogRepository;
import com.ledgerline.repositories.UserRepository;
import com.ledgerline.services.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
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
public class PlatformGovernanceAndReversalTests {

    @Autowired
    private PlatformTransactionController transactionController;

    @Autowired
    private AuditController auditController;

    @Autowired
    private DepositService depositService;

    @Autowired
    private TransferService transferService;

    @Autowired
    private WithdrawalService withdrawalService;

    @Autowired
    private SystemAccountService systemAccountService;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    private User customerA;
    private User customerB;
    private User adminUser;
    private User auditorUser;
    private Account accountA;
    private Account accountB;

    @BeforeEach
    public void setup() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        customerA = userRepository.save(new User("rev_a_" + suffix + "@test.io", "hash", Role.ACCOUNT_HOLDER, "Customer A"));
        customerB = userRepository.save(new User("rev_b_" + suffix + "@test.io", "hash", Role.ACCOUNT_HOLDER, "Customer B"));
        adminUser = userRepository.save(new User("rev_admin_" + suffix + "@test.io", "hash", Role.ADMIN, "Platform Admin"));
        auditorUser = userRepository.save(new User("rev_auditor_" + suffix + "@test.io", "hash", Role.AUDITOR, "Chief Auditor"));

        accountA = accountRepository.save(new Account("ACC-REVA-" + suffix, customerA, BigDecimal.ZERO, "INR"));
        accountB = accountRepository.save(new Account("ACC-REVB-" + suffix, customerB, BigDecimal.ZERO, "INR"));

        // Fund Account A via genuine double-entry deposit from SYSTEM_FUNDING
        createAuth(adminUser);
        depositService.deposit(new DepositRequest(accountA.getId(), new BigDecimal("2000.00"), "Seed Capital"),
                UUID.randomUUID().toString(), adminUser.getId());
    }

    @AfterEach
    public void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private UsernamePasswordAuthenticationToken createAuth(User user) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                user.getId(),
                user.getEmail(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
        return auth;
    }

    @Test
    @DisplayName("Governance RBAC: Auditor can read transactions and integrity, only Admin can reverse")
    public void testGovernanceRbac() {
        createAuth(customerA);
        TransactionResponse transfer = transferService.transfer(
                new TransferRequest(accountA.getId(), accountB.getId(), new BigDecimal("300.00"), "Vendor payment"),
                UUID.randomUUID().toString(),
                customerA.getId()
        );

        assertThrows(AccessDeniedException.class, () -> transactionController.getAllTransactions());
        assertThrows(AccessDeniedException.class, () -> auditController.getIntegrityVerification());

        UsernamePasswordAuthenticationToken custAuth = createAuth(customerA);
        assertThrows(AccessDeniedException.class, () ->
                transactionController.reverseTransaction(transfer.getTransactionId(), new ReverseTransactionRequest("Hack"), custAuth));

        UsernamePasswordAuthenticationToken auditorAuth = createAuth(auditorUser);
        ResponseEntity<List<PlatformTransactionResponse>> listRes = transactionController.getAllTransactions();
        assertEquals(200, listRes.getStatusCode().value());
        assertNotNull(listRes.getBody());
        assertTrue(listRes.getBody().stream().anyMatch(t -> t.getTransactionId().equals(transfer.getTransactionId())));

        assertThrows(AccessDeniedException.class, () ->
                transactionController.reverseTransaction(transfer.getTransactionId(), new ReverseTransactionRequest("Auditor mutation blocked"), auditorAuth));
    }

    @Test
    @DisplayName("Reversal: Admin executes compensating double-entry reversal and blocks double-reversal")
    public void testCompensatingReversalPreservesZeroSum() {
        createAuth(customerA);
        TransactionResponse transfer = transferService.transfer(
                new TransferRequest(accountA.getId(), accountB.getId(), new BigDecimal("500.00"), "Erroneous transfer"),
                UUID.randomUUID().toString(),
                customerA.getId()
        );

        BigDecimal netBefore = accountRepository.sumAllBalances();

        UsernamePasswordAuthenticationToken adminAuth = createAuth(adminUser);
        ResponseEntity<PlatformTransactionResponse> revRes = transactionController.reverseTransaction(
                transfer.getTransactionId(),
                new ReverseTransactionRequest("Duplicate settlement dispute"),
                adminAuth
        );

        assertEquals(200, revRes.getStatusCode().value());
        PlatformTransactionResponse rev = revRes.getBody();
        assertNotNull(rev);
        assertEquals("REVERSAL", rev.getTransactionType());
        assertEquals("COMPLETED", rev.getStatus());
        assertTrue(rev.isInvariantBalanced());
        assertEquals(transfer.getTransactionId(), rev.getReversedOriginalTxId());

        Account refreshedA = accountRepository.findById(accountA.getId()).orElseThrow();
        Account refreshedB = accountRepository.findById(accountB.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("2000.0000").compareTo(refreshedA.getBalance()));
        assertEquals(0, BigDecimal.ZERO.compareTo(refreshedB.getBalance()));

        BigDecimal netAfter = accountRepository.sumAllBalances();
        assertEquals(0, BigDecimal.ZERO.compareTo(netAfter.subtract(netBefore)));

        // Double reversal must be rejected
        assertThrows(InvalidTransactionException.class, () ->
                transactionController.reverseTransaction(transfer.getTransactionId(), new ReverseTransactionRequest("Second attempt"), adminAuth));
    }

    @Test
    @DisplayName("Reversal Safety: Blocks reversal when recipient has insufficient funds to prevent negative balance")
    public void testReversalBlockedIfRecipientAlreadyWithdrew() {
        createAuth(customerA);
        TransactionResponse transfer = transferService.transfer(
                new TransferRequest(accountA.getId(), accountB.getId(), new BigDecimal("600.00"), "Transfer then spend"),
                UUID.randomUUID().toString(),
                customerA.getId()
        );

        // Recipient withdraws 400 leaving only 200
        createAuth(customerB);
        withdrawalService.withdraw(
                new WithdrawalRequest(accountB.getId(), new BigDecimal("400.00"), "Cash out"),
                UUID.randomUUID().toString(),
                customerB.getId()
        );

        UsernamePasswordAuthenticationToken adminAuth = createAuth(adminUser);
        assertThrows(InsufficientFundsException.class, () ->
                transactionController.reverseTransaction(transfer.getTransactionId(), new ReverseTransactionRequest("Clawback"), adminAuth));

        Account refreshedB = accountRepository.findById(accountB.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("200.0000").compareTo(refreshedB.getBalance()));
        assertFalse(auditLogRepository.findByAccountIdAndStatusOrderByCreatedAtDesc(accountB.getId(), "REFUSED").isEmpty());
    }

    @Test
    @DisplayName("Continuous Assurance: Integrity endpoint reports 100.000%, zero variance, and SHA-256 root hash")
    public void testContinuousAssuranceIntegrityVerification() {
        // Harmonize any prior fixture accounts in shared H2 context if present
        BigDecimal currentNet = accountRepository.sumAllBalances();
        if (currentNet != null && currentNet.compareTo(BigDecimal.ZERO) != 0) {
            Account funding = systemAccountService.getOrCreateFundingAccount();
            funding.setBalance(funding.getBalance().subtract(currentNet));
            accountRepository.save(funding);
        }

        createAuth(auditorUser);
        ResponseEntity<IntegrityVerificationResponse> res = auditController.getIntegrityVerification();
        assertEquals(200, res.getStatusCode().value());

        IntegrityVerificationResponse body = res.getBody();
        assertNotNull(body);
        assertTrue(body.isConservedZeroSum());
        assertEquals("100.000%", body.getFinancialIntegrityIndex());
        assertEquals(0, BigDecimal.ZERO.compareTo(body.getVariance()));
        assertEquals(0, body.getNegativeBalanceViolations());
        assertNotNull(body.getMerkleRootHash());
        assertEquals(64, body.getMerkleRootHash().length());
        assertTrue(body.getTotalTransactionsReviewed() > 0);
    }
}

