package com.ledgerline;

import com.ledgerline.controllers.TransferController;
import com.ledgerline.dto.DepositRequest;
import com.ledgerline.dto.TransactionResponse;
import com.ledgerline.dto.TransferRequest;
import com.ledgerline.dto.WithdrawalRequest;
import com.ledgerline.exceptions.IdempotencyException;
import com.ledgerline.exceptions.InsufficientFundsException;
import com.ledgerline.exceptions.InvalidTransactionException;
import com.ledgerline.exceptions.UnauthorizedAccessException;
import com.ledgerline.models.*;
import com.ledgerline.repositories.AccountRepository;
import com.ledgerline.repositories.AuditLogRepository;
import com.ledgerline.repositories.LedgerEntryRepository;
import com.ledgerline.repositories.TransactionRepository;
import com.ledgerline.repositories.UserRepository;
import com.ledgerline.services.DepositService;
import com.ledgerline.services.IdempotencyService;
import com.ledgerline.services.SystemAccountService;
import com.ledgerline.services.TransferService;
import com.ledgerline.services.WithdrawalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class FinancialAndSecurityTests {

    @Autowired
    private TransferService transferService;

    @Autowired
    private WithdrawalService withdrawalService;

    @Autowired
    private DepositService depositService;

    @Autowired
    private TransferController transferController;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private SystemAccountService systemAccountService;

    @Autowired
    private com.ledgerline.repositories.IdempotencyRecordRepository idempotencyRecordRepository;

    @Autowired
    private com.ledgerline.services.StatementService statementService;

    @Autowired
    private IdempotencyService idempotencyService;

    private User customerUser;
    private User adminUser;
    private User auditorUser;

    @BeforeEach
    public void setup() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        customerUser = userRepository.save(new User("cust_" + suffix + "@ledgerline.io", "pass", Role.ACCOUNT_HOLDER));
        adminUser = userRepository.save(new User("admin_" + suffix + "@ledgerline.io", "pass", Role.ADMIN));
        auditorUser = userRepository.save(new User("auditor_" + suffix + "@ledgerline.io", "pass", Role.AUDITOR));
    }

    private UsernamePasswordAuthenticationToken createAuthToken(User user) {
        return new UsernamePasswordAuthenticationToken(
                user.getId(),
                user.getEmail(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }

    @Test
    @DisplayName("1. Double-Entry Deposit: External funding debits SYSTEM_FUNDING and credits customer")
    public void testDepositDoubleEntryAccounting() {
        String num = "ACC-DEP-DE-" + UUID.randomUUID().toString().substring(0, 8);
        Account customerAcc = accountRepository.save(new Account(num, customerUser, BigDecimal.ZERO, "INR"));

        BigDecimal depositAmount = new BigDecimal("500.00");
        String key = UUID.randomUUID().toString();
        DepositRequest req = new DepositRequest(customerAcc.getId(), depositAmount, "Double-Entry External Deposit");

        TransactionResponse response = depositService.deposit(req, key, customerUser.getId());
        assertNotNull(response);
        assertEquals(TransactionStatus.COMPLETED, response.getStatus());

        // Verify customer balance
        Account refreshedCust = accountRepository.findById(customerAcc.getId()).orElseThrow();
        assertEquals(0, depositAmount.compareTo(refreshedCust.getBalance()), "Customer balance must be 500.00");

        // Verify ledger entries for this transaction: exactly 2 entries (1 DEBIT, 1 CREDIT)
        Transaction tx = transactionRepository.findById(response.getTransactionId()).orElseThrow();
        Account fundingAcc = systemAccountService.getOrCreateFundingAccount();

        List<LedgerEntry> entries = ledgerEntryRepository.findAll().stream()
                .filter(e -> e.getTransaction().getId().equals(tx.getId()))
                .toList();

        assertEquals(2, entries.size(), "Strict double-entry requires exactly 2 ledger entries per external deposit");

        LedgerEntry debitEntry = entries.stream().filter(e -> e.getEntryType() == EntryType.DEBIT).findFirst().orElseThrow();
        LedgerEntry creditEntry = entries.stream().filter(e -> e.getEntryType() == EntryType.CREDIT).findFirst().orElseThrow();

        assertEquals(fundingAcc.getId(), debitEntry.getAccount().getId(), "SYSTEM_FUNDING must be debited");
        assertEquals(customerAcc.getId(), creditEntry.getAccount().getId(), "Customer account must be credited");
        assertEquals(0, depositAmount.compareTo(debitEntry.getAmount()));
        assertEquals(0, depositAmount.compareTo(creditEntry.getAmount()));
        assertEquals(0, debitEntry.getAmount().compareTo(creditEntry.getAmount()), "SUM(DEBITS) must equal SUM(CREDITS)");
    }

    @Test
    @DisplayName("2. Double-Entry Withdrawal: External withdrawal debits customer and credits SYSTEM_SETTLEMENT")
    public void testWithdrawalDoubleEntryAccounting() {
        String num = "ACC-WTH-DE-" + UUID.randomUUID().toString().substring(0, 8);
        BigDecimal initialBal = new BigDecimal("800.00");
        Account customerAcc = accountRepository.save(new Account(num, customerUser, initialBal, "INR"));

        BigDecimal withdrawAmount = new BigDecimal("350.00");
        String key = UUID.randomUUID().toString();
        WithdrawalRequest req = new WithdrawalRequest(customerAcc.getId(), withdrawAmount, "Double-Entry Withdrawal");

        TransactionResponse response = withdrawalService.withdraw(req, key, customerUser.getId());
        assertNotNull(response);
        assertEquals(TransactionStatus.COMPLETED, response.getStatus());

        // Verify customer balance
        Account refreshedCust = accountRepository.findById(customerAcc.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("450.00").compareTo(refreshedCust.getBalance()), "Customer balance must decrease to 450.00");

        // Verify ledger entries for this transaction: exactly 2 entries
        Transaction tx = transactionRepository.findById(response.getTransactionId()).orElseThrow();
        Account settlementAcc = systemAccountService.getOrCreateSettlementAccount();

        List<LedgerEntry> entries = ledgerEntryRepository.findAll().stream()
                .filter(e -> e.getTransaction().getId().equals(tx.getId()))
                .toList();

        assertEquals(2, entries.size(), "Strict double-entry requires exactly 2 ledger entries per external withdrawal");

        LedgerEntry debitEntry = entries.stream().filter(e -> e.getEntryType() == EntryType.DEBIT).findFirst().orElseThrow();
        LedgerEntry creditEntry = entries.stream().filter(e -> e.getEntryType() == EntryType.CREDIT).findFirst().orElseThrow();

        assertEquals(customerAcc.getId(), debitEntry.getAccount().getId(), "Customer account must be debited");
        assertEquals(settlementAcc.getId(), creditEntry.getAccount().getId(), "SYSTEM_SETTLEMENT must be credited");
        assertEquals(0, withdrawAmount.compareTo(debitEntry.getAmount()));
        assertEquals(0, withdrawAmount.compareTo(creditEntry.getAmount()));
        assertEquals(0, debitEntry.getAmount().compareTo(creditEntry.getAmount()), "SUM(DEBITS) must equal SUM(CREDITS)");
    }

    @Test
    @DisplayName("3. Idempotency Key Reuse With Modified Payload Throws 409 Conflict")
    public void testIdempotencyKeyReuseDifferentPayloadReturns409() {
        String numA = "ACC-IDEM-A-" + UUID.randomUUID().toString().substring(0, 8);
        String numB = "ACC-IDEM-B-" + UUID.randomUUID().toString().substring(0, 8);
        Account accA = accountRepository.save(new Account(numA, customerUser, new BigDecimal("1000.00"), "INR"));
        Account accB = accountRepository.save(new Account(numB, adminUser, new BigDecimal("100.00"), "INR"));

        String reuseKey = UUID.randomUUID().toString();
        UsernamePasswordAuthenticationToken auth = createAuthToken(customerUser);
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);

        // First execution with ₹100
        TransferRequest req1 = new TransferRequest(accA.getId(), accB.getId(), new BigDecimal("100.00"), "First payload");
        ResponseEntity<TransactionResponse> res1 = transferController.transfer(reuseKey, req1, auth);
        assertNotNull(res1.getBody());
        assertEquals(TransactionStatus.COMPLETED, res1.getBody().getStatus());

        // Second execution with SAME key but DIFFERENT payload (₹200) -> Must throw IdempotencyException (HTTP 409)
        TransferRequest req2 = new TransferRequest(accA.getId(), accB.getId(), new BigDecimal("200.00"), "Tampered payload");
        assertThrows(IdempotencyException.class, () -> {
            transferController.transfer(reuseKey, req2, auth);
        }, "Reusing an idempotency key with altered payload must be rejected with 409 Conflict");
    }

    @Test
    @DisplayName("4. Missing or Blank Idempotency-Key Throws 400 Bad Request")
    public void testMissingIdempotencyKeyFails() {
        String numA = "ACC-NOKEY-A-" + UUID.randomUUID().toString().substring(0, 8);
        String numB = "ACC-NOKEY-B-" + UUID.randomUUID().toString().substring(0, 8);
        Account accA = accountRepository.save(new Account(numA, customerUser, new BigDecimal("500.00"), "INR"));
        Account accB = accountRepository.save(new Account(numB, adminUser, new BigDecimal("100.00"), "INR"));

        TransferRequest req = new TransferRequest(accA.getId(), accB.getId(), new BigDecimal("50.00"), "No key transfer");
        UsernamePasswordAuthenticationToken auth = createAuthToken(customerUser);
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);

        assertThrows(InvalidTransactionException.class, () -> {
            transferController.transfer("", req, auth);
        });

        assertThrows(InvalidTransactionException.class, () -> {
            transferController.transfer("   ", req, auth);
        });

        assertThrows(InvalidTransactionException.class, () -> {
            transferController.transfer(null, req, auth);
        });
    }

    @Test
    @DisplayName("5. RBAC: Auditor Role is strictly read-only and blocked from all financial writes")
    public void testAuditorCannotPerformFinancialWrites() {
        String numA = "ACC-AUDIT-A-" + UUID.randomUUID().toString().substring(0, 8);
        String numB = "ACC-AUDIT-B-" + UUID.randomUUID().toString().substring(0, 8);
        Account accA = accountRepository.save(new Account(numA, customerUser, new BigDecimal("500.00"), "INR"));
        Account accB = accountRepository.save(new Account(numB, customerUser, new BigDecimal("500.00"), "INR"));

        DepositRequest dep = new DepositRequest(accA.getId(), new BigDecimal("50.00"), "Audit deposit");
        WithdrawalRequest with = new WithdrawalRequest(accA.getId(), new BigDecimal("50.00"), "Audit withdraw");
        TransferRequest trf = new TransferRequest(accA.getId(), accB.getId(), new BigDecimal("50.00"), "Audit transfer");

        assertThrows(UnauthorizedAccessException.class, () -> {
            depositService.deposit(dep, UUID.randomUUID().toString(), auditorUser.getId());
        }, "Auditors must be blocked from deposits");

        assertThrows(UnauthorizedAccessException.class, () -> {
            withdrawalService.withdraw(with, UUID.randomUUID().toString(), auditorUser.getId());
        }, "Auditors must be blocked from withdrawals");

        assertThrows(UnauthorizedAccessException.class, () -> {
            transferService.transfer(trf, UUID.randomUUID().toString(), auditorUser.getId());
        }, "Auditors must be blocked from transfers");
    }

    @Test
    @DisplayName("6. RBAC: Admin cannot transfer or withdraw from accounts they do not own")
    public void testAdminCannotTransferFromCustomerAccounts() {
        String numCust = "ACC-CUST-VAULT-" + UUID.randomUUID().toString().substring(0, 8);
        String numAdmin = "ACC-ADMIN-VAULT-" + UUID.randomUUID().toString().substring(0, 8);
        Account custAcc = accountRepository.save(new Account(numCust, customerUser, new BigDecimal("1000.00"), "INR"));
        Account adminAcc = accountRepository.save(new Account(numAdmin, adminUser, new BigDecimal("100.00"), "INR"));

        TransferRequest trf = new TransferRequest(custAcc.getId(), adminAcc.getId(), new BigDecimal("200.00"), "Admin siphoning attempt");
        WithdrawalRequest with = new WithdrawalRequest(custAcc.getId(), new BigDecimal("100.00"), "Admin withdrawal attempt");

        assertThrows(UnauthorizedAccessException.class, () -> {
            transferService.transfer(trf, UUID.randomUUID().toString(), adminUser.getId());
        }, "Admins cannot transfer funds from accounts they do not own");

        assertThrows(UnauthorizedAccessException.class, () -> {
            withdrawalService.withdraw(with, UUID.randomUUID().toString(), adminUser.getId());
        }, "Admins cannot withdraw funds from accounts they do not own");
    }

    @Test
    @DisplayName("7. Refused Attempts Record Full Audit Trail In audit_logs Without Bogus Ledger Postings")
    public void testRefusedAttemptPersistedInAuditLogs() {
        String num = "ACC-REF-TEST-" + UUID.randomUUID().toString().substring(0, 8);
        Account acc = accountRepository.save(new Account(num, customerUser, new BigDecimal("30.00"), "INR"));

        BigDecimal overdrawAmount = new BigDecimal("500.00");
        String refusalKey = "REF-KEY-" + UUID.randomUUID();
        WithdrawalRequest req = new WithdrawalRequest(acc.getId(), overdrawAmount, "Overdraw attempt");

        assertThrows(InsufficientFundsException.class, () -> {
            withdrawalService.withdraw(req, refusalKey, customerUser.getId());
        });

        // 1. Assert NO ledger entries were created for this refused attempt
        List<LedgerEntry> entries = ledgerEntryRepository.findStatementEntriesByAccountId(acc.getId());
        assertEquals(0, entries.size(), "Refused attempts must NOT create financial ledger postings");

        // 2. Assert Audit Log captured the exact refusal with all 7 fields
        List<AuditLog> refusalLogs = auditLogRepository.findByAccountIdAndStatusOrderByCreatedAtDesc(acc.getId(), "REFUSED");
        assertFalse(refusalLogs.isEmpty(), "Refused attempt must be persisted in audit_logs");

        AuditLog log = refusalLogs.get(0);
        assertEquals(customerUser.getId(), log.getUserId());
        assertEquals(acc.getId(), log.getAccountId());
        assertEquals(0, overdrawAmount.compareTo(log.getAmount()));
        assertEquals("WITHDRAWAL", log.getOperationType());
        assertEquals("INSUFFICIENT_FUNDS", log.getFailureReason());
        assertEquals(refusalKey, log.getIdempotencyKey());
        assertNotNull(log.getCreatedAt());
    }

    @Test
    @DisplayName("8. Immutability: Direct SQL/JPA UPDATE and DELETE on LedgerEntry are blocked")
    public void testLedgerImmutabilityPreventUpdateDelete() {
        String num = "ACC-IMMUTABLE-" + UUID.randomUUID().toString().substring(0, 8);
        Account acc = accountRepository.save(new Account(num, customerUser, BigDecimal.ZERO, "INR"));

        DepositRequest dep = new DepositRequest(acc.getId(), new BigDecimal("100.00"), "Deposit for immutability check");
        depositService.deposit(dep, UUID.randomUUID().toString(), customerUser.getId());

        List<LedgerEntry> entries = ledgerEntryRepository.findStatementEntriesByAccountId(acc.getId());
        assertFalse(entries.isEmpty());
        LedgerEntry entry = entries.get(0);

        // Attempt direct UPDATE -> Forbidden
        entry.setAmount(new BigDecimal("999999.00"));
        assertThrows(Exception.class, () -> {
            ledgerEntryRepository.saveAndFlush(entry);
        }, "Updating an existing ledger entry must be strictly blocked");

        // Attempt direct DELETE -> Forbidden
        assertThrows(Exception.class, () -> {
            ledgerEntryRepository.delete(entry);
            ledgerEntryRepository.flush();
        }, "Deleting an existing ledger entry must be strictly blocked");
    }

    @Test
    @DisplayName("9. Balance Reconciliation: Account balance exactly matches sum(Credits) - sum(Debits)")
    public void testBalanceReconciliationAgainstLedger() {
        String numA = "ACC-REC-A-" + UUID.randomUUID().toString().substring(0, 8);
        String numB = "ACC-REC-B-" + UUID.randomUUID().toString().substring(0, 8);

        Account accA = accountRepository.save(new Account(numA, customerUser, BigDecimal.ZERO, "INR"));
        Account accB = accountRepository.save(new Account(numB, adminUser, BigDecimal.ZERO, "INR"));

        // 1. Deposit 500
        depositService.deposit(new DepositRequest(accA.getId(), new BigDecimal("500.00"), "Dep 1"), UUID.randomUUID().toString(), customerUser.getId());

        // 2. Deposit 300
        depositService.deposit(new DepositRequest(accA.getId(), new BigDecimal("300.00"), "Dep 2"), UUID.randomUUID().toString(), customerUser.getId());

        // 3. Transfer out 150 to B
        transferService.transfer(new TransferRequest(accA.getId(), accB.getId(), new BigDecimal("150.00"), "Trf out"), UUID.randomUUID().toString(), customerUser.getId());

        // 4. Withdrawal 100
        withdrawalService.withdraw(new WithdrawalRequest(accA.getId(), new BigDecimal("100.00"), "Wth 1"), UUID.randomUUID().toString(), customerUser.getId());

        // Account A ledger entries: 2 credits (500 + 300 = 800), 2 debits (150 + 100 = 250) -> net = 550.00
        List<LedgerEntry> entries = ledgerEntryRepository.findStatementEntriesByAccountId(accA.getId());

        BigDecimal sumCredits = entries.stream()
                .filter(e -> e.getEntryType() == EntryType.CREDIT)
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal sumDebits = entries.stream()
                .filter(e -> e.getEntryType() == EntryType.DEBIT)
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal ledgerNetBalance = sumCredits.subtract(sumDebits);

        Account refreshedA = accountRepository.findById(accA.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("550.0000").compareTo(refreshedA.getBalance()), "Balance must be 550.00");
        assertEquals(0, refreshedA.getBalance().compareTo(ledgerNetBalance), "Source-of-truth reconciliation: Account balance must equal sum(Credits) - sum(Debits)");
    }

    @Test
    @DisplayName("10. Crash Recovery: When process crashes before markCompleted, retry returns committed response without double debit")
    public void testIdempotencyCrashRecoveryReturnsCommittedResultWithoutReexecution() {
        String numA = "ACC-CRASH-A-" + UUID.randomUUID().toString().substring(0, 8);
        String numB = "ACC-CRASH-B-" + UUID.randomUUID().toString().substring(0, 8);

        Account accA = accountRepository.save(new Account(numA, customerUser, new BigDecimal("1000.00"), "INR"));
        Account accB = accountRepository.save(new Account(numB, adminUser, new BigDecimal("200.00"), "INR"));

        String crashKey = "CRASH-RETRY-" + UUID.randomUUID();
        BigDecimal transferAmount = new BigDecimal("250.00");
        TransferRequest req = new TransferRequest(accA.getId(), accB.getId(), transferAmount, "Crash simulation");

        UsernamePasswordAuthenticationToken auth = createAuthToken(customerUser);
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);

        // Step 1: Execute the business transfer directly to commit the financial transaction (DEBIT + CREDIT)
        TransactionResponse committedTx = transferService.transfer(req, crashKey, customerUser.getId());
        assertNotNull(committedTx);
        assertEquals(TransactionStatus.COMPLETED, committedTx.getStatus());

        // Step 2: Simulate JVM crash before markCompleted() by inserting an IN_PROGRESS record without response body
        String requestHash = idempotencyService.calculateFingerprint(req);
        IdempotencyRecord crashedRecord = new IdempotencyRecord(
                crashKey,
                customerUser.getId(),
                "TRANSFER",
                requestHash,
                IdempotencyStatus.IN_PROGRESS,
                null // Simulated crash: response was never cached
        );
        idempotencyRecordRepository.saveAndFlush(crashedRecord);

        // Verify balance after first execution
        Account balAfterFirstTx = accountRepository.findById(accA.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("750.00").compareTo(balAfterFirstTx.getBalance()),
                "Source balance must be 750.00 after initial transfer");

        // Step 3: Client retries with the SAME key and SAME payload via the controller
        ResponseEntity<TransactionResponse> retryRes = transferController.transfer(crashKey, req, auth);

        assertNotNull(retryRes);
        assertNotNull(retryRes.getBody());
        assertEquals(TransactionStatus.COMPLETED, retryRes.getBody().getStatus());
        assertEquals(committedTx.getTransactionId(), retryRes.getBody().getTransactionId(),
                "Retry must recover and return the original committed transaction ID");
        assertEquals(0, transferAmount.compareTo(retryRes.getBody().getAmount()),
                "Recovered response amount must match original");

        // Step 4: Verify balances DID NOT change on retry (NO DOUBLE DEBIT)
        Account balAfterRetry = accountRepository.findById(accA.getId()).orElseThrow();
        Account destAfterRetry = accountRepository.findById(accB.getId()).orElseThrow();

        assertEquals(0, new BigDecimal("750.00").compareTo(balAfterRetry.getBalance()),
                "Source balance must NOT be debited again on retry (must remain 750.00)");
        assertEquals(0, new BigDecimal("450.00").compareTo(destAfterRetry.getBalance()),
                "Destination balance must NOT be credited again on retry (must remain 450.00)");

        // Step 5: Verify that reusing the same key with an ALTERED payload is still rejected with 409
        TransferRequest alteredReq = new TransferRequest(accA.getId(), accB.getId(), new BigDecimal("999.00"), "Tampered payload");
        assertThrows(IdempotencyException.class, () ->
                transferController.transfer(crashKey, alteredReq, auth),
                "Altered payload with same key must still be rejected with 409 Conflict");
    }

    @Test
    @DisplayName("P2P-1. Person-to-person transfer resolves destination by Account Number or UUID without dropdown")
    public void testPersonToPersonTransferUsingAccountIdOrNumber() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Account alice = accountRepository.save(new Account("ACC-P2P-A-" + suffix, customerUser, new BigDecimal("1000.00"), "INR"));
        Account bob = accountRepository.save(new Account("ACC-P2P-B-" + suffix, adminUser, new BigDecimal("200.00"), "INR"));

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                customerUser.getId(), null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_ACCOUNT_HOLDER"))
        );
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);

        // 1. Send ₹150 using Bob's Account Number string ("ACC-P2P-B-...")
        TransferRequest reqByNum = new TransferRequest();
        reqByNum.setSourceAccountInput(alice.getId().toString());
        reqByNum.setDestinationAccount(bob.getAccountNumber());
        reqByNum.setAmount(new BigDecimal("150.00"));
        reqByNum.setDescription("P2P transfer by account number");

        ResponseEntity<TransactionResponse> res1 = transferController.transfer(
                "P2P-KEY-1-" + suffix, reqByNum, auth
        );

        assertNotNull(res1.getBody());
        assertEquals(TransactionStatus.COMPLETED, res1.getBody().getStatus());
        assertEquals(0, new BigDecimal("150.00").compareTo(res1.getBody().getAmount()));

        Account aliceAfter1 = accountRepository.findById(alice.getId()).orElseThrow();
        Account bobAfter1 = accountRepository.findById(bob.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("850.00").compareTo(aliceAfter1.getBalance()));
        assertEquals(0, new BigDecimal("350.00").compareTo(bobAfter1.getBalance()));

        // 2. Send ₹50 using Bob's Account UUID string
        TransferRequest reqByUuid = new TransferRequest();
        reqByUuid.setSourceAccountId(alice.getId());
        reqByUuid.setDestinationAccountInput(bob.getId().toString());
        reqByUuid.setAmount(new BigDecimal("50.00"));
        reqByUuid.setDescription("P2P transfer by UUID");

        ResponseEntity<TransactionResponse> res2 = transferController.transfer(
                "P2P-KEY-2-" + suffix, reqByUuid, auth
        );

        assertNotNull(res2.getBody());
        assertEquals(TransactionStatus.COMPLETED, res2.getBody().getStatus());

        Account aliceAfter2 = accountRepository.findById(alice.getId()).orElseThrow();
        Account bobAfter2 = accountRepository.findById(bob.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("800.00").compareTo(aliceAfter2.getBalance()));
        assertEquals(0, new BigDecimal("400.00").compareTo(bobAfter2.getBalance()));
    }

    @Test
    @DisplayName("ADMIN-DEP-1. System Administrator can add money to any customer account maintaining double-entry balance")
    public void testAdminCanAddMoneyToDifferentAccountsAndMaintainDoubleEntryBalance() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Account customerAcc = accountRepository.save(new Account("ACC-CUST-" + suffix, customerUser, new BigDecimal("100.00"), "INR"));

        UsernamePasswordAuthenticationToken adminAuth = new UsernamePasswordAuthenticationToken(
                adminUser.getId(), null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(adminAuth);

        BigDecimal depositAmount = new BigDecimal("750.00");
        DepositRequest req = new DepositRequest();
        req.setAccountIdentifier(customerAcc.getAccountNumber());
        req.setAmount(depositAmount);
        req.setDescription("Admin Treasury Liquidity Injection");

        ResponseEntity<TransactionResponse> res = transferController.deposit(
                "ADMIN-DEP-KEY-" + suffix, req, adminAuth
        );

        assertNotNull(res.getBody());
        assertEquals(TransactionStatus.COMPLETED, res.getBody().getStatus());
        assertEquals(0, depositAmount.compareTo(res.getBody().getAmount()));

        // Customer balance increased by ₹750 (100 -> 850)
        Account updatedAcc = accountRepository.findById(customerAcc.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("850.00").compareTo(updatedAcc.getBalance()));

        // Double-entry entries created
        List<LedgerEntry> entries = ledgerEntryRepository.findStatementEntriesByAccountId(customerAcc.getId());
        assertFalse(entries.isEmpty());
        LedgerEntry latest = entries.get(entries.size() - 1);
        assertEquals(EntryType.CREDIT, latest.getEntryType());
        assertEquals(0, depositAmount.compareTo(latest.getAmount()));
        assertEquals(0, new BigDecimal("850.00").compareTo(latest.getRunningBalanceAfter()));

        // Verify audit log recorded under ADMIN
        List<AuditLog> logs = auditLogRepository.findAll();
        boolean foundAudit = logs.stream().anyMatch(l ->
                "DEPOSIT_COMPLETED".equals(l.getOperationType()) &&
                customerAcc.getAccountNumber().equals(l.getResource()) &&
                "ADMIN".equals(l.getUserRole())
        );
        assertTrue(foundAudit, "Admin deposit must be recorded in audit log with role ADMIN");
    }

    @Test
    @DisplayName("PAGINATION-1. StatementService correctly paginates ledger entries")
    public void testStatementServicePagination() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Account acc = accountRepository.save(new Account("ACC-PAGE-" + suffix, customerUser, BigDecimal.ZERO, "INR"));

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                customerUser.getId(), null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_ACCOUNT_HOLDER"))
        );
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);

        // Perform 5 successive deposits
        for (int i = 1; i <= 5; i++) {
            DepositRequest dep = new DepositRequest(acc.getId(), new BigDecimal(i * 10 + ".00"), "Deposit #" + i);
            depositService.deposit(dep, "DEP-PAGE-" + suffix + "-" + i, customerUser.getId());
        }

        // 1. Fetch full statement without pagination
        List<com.ledgerline.dto.StatementItemResponse> fullStatement =
                statementService.getStatement(acc.getId(), customerUser.getId(), Role.ACCOUNT_HOLDER);
        assertEquals(5, fullStatement.size());

        // 2. Page 0, Size 2 -> returns 2 most recent items
        List<com.ledgerline.dto.StatementItemResponse> page0 =
                statementService.getStatement(acc.getId(), customerUser.getId(), Role.ACCOUNT_HOLDER, 0, 2);
        assertEquals(2, page0.size());
        assertEquals(fullStatement.get(0).getId(), page0.get(0).getId());
        assertEquals(fullStatement.get(1).getId(), page0.get(1).getId());

        // 3. Page 1, Size 2 -> returns next 2 items
        List<com.ledgerline.dto.StatementItemResponse> page1 =
                statementService.getStatement(acc.getId(), customerUser.getId(), Role.ACCOUNT_HOLDER, 1, 2);
        assertEquals(2, page1.size());
        assertEquals(fullStatement.get(2).getId(), page1.get(0).getId());
        assertEquals(fullStatement.get(3).getId(), page1.get(1).getId());

        // 4. Page 2, Size 2 -> returns 5th item
        List<com.ledgerline.dto.StatementItemResponse> page2 =
                statementService.getStatement(acc.getId(), customerUser.getId(), Role.ACCOUNT_HOLDER, 2, 2);
        assertEquals(1, page2.size());
        assertEquals(fullStatement.get(4).getId(), page2.get(0).getId());
    }
}
