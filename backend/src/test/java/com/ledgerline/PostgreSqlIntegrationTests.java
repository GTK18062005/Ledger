package com.ledgerline;

import com.ledgerline.controllers.TransferController;
import com.ledgerline.dto.DepositRequest;
import com.ledgerline.dto.TransactionResponse;
import com.ledgerline.dto.TransferRequest;
import com.ledgerline.dto.WithdrawalRequest;
import com.ledgerline.exceptions.InsufficientFundsException;
import com.ledgerline.models.*;
import com.ledgerline.repositories.*;
import com.ledgerline.services.DepositService;
import com.ledgerline.services.TransferService;
import com.ledgerline.services.WithdrawalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Real PostgreSQL Integration Tests.
 * Executes directly against live PostgreSQL instance (port 5432) with Flyway migrations.
 * Verifies:
 * - Flyway automatic migration execution (V1 + V2)
 * - PostgreSQL row-level pessimistic locking (SELECT ... FOR UPDATE)
 * - Concurrent withdrawal overdraw prevention
 * - Bidirectional opposite-direction transfer deadlock freedom
 * - Double-entry zero-sum balance conservation
 * - Real PostgreSQL triggers (prevent_ledger_modification)
 * - Crash recovery on real PostgreSQL
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:postgresql://localhost:5432/ledgerline",
    "spring.datasource.username=postgres",
    "spring.datasource.password=1235",
    "spring.datasource.driver-class-name=org.postgresql.Driver",
    "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
    "spring.jpa.hibernate.ddl-auto=validate",
    "spring.flyway.enabled=true",
    "spring.flyway.baseline-on-migrate=true",
    "spring.flyway.locations=classpath:db/migration",
    "jwt.secret=SuperSecretMissionCriticalLedgerLineKeyThatIsAtLeast32BytesLong!"
})
public class PostgreSqlIntegrationTests {

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
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private com.ledgerline.repositories.IdempotencyRecordRepository idempotencyRecordRepository;

    @Autowired
    private com.ledgerline.services.IdempotencyService idempotencyService;

    private User alice;
    private User bob;

    @BeforeEach
    public void setup() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        alice = userRepository.save(new User("pg_alice_" + suffix + "@ledgerline.io", "pass", Role.ACCOUNT_HOLDER));
        bob = userRepository.save(new User("pg_bob_" + suffix + "@ledgerline.io", "pass", Role.ACCOUNT_HOLDER));
    }

    private UsernamePasswordAuthenticationToken createAuthToken(User user) {
        return new UsernamePasswordAuthenticationToken(
                user.getId(),
                user.getEmail(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }

    @Test
    @DisplayName("PG-1. Flyway Migration Verification: Schema exists and versioned in flyway_schema_history")
    public void testFlywayMigrationAppliedOnPostgres() {
        Integer historyCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE success = true", Integer.class);
        assertNotNull(historyCount, "Flyway schema history must exist");
        assertTrue(historyCount >= 2, "Both V1 and V2 migrations must have been successfully applied by Flyway");

        // Verify V2 column exists
        Integer columnCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'admin_reason'",
                Integer.class);
        assertEquals(1, columnCount, "V2 admin_reason column must exist in PostgreSQL transactions table");
    }

    @Test
    @DisplayName("PG-2. PostgreSQL Row Locking: 20 concurrent withdrawals against ₹100 cannot overdraw")
    public void testPostgreSqlConcurrentWithdrawalsRowLocking() throws InterruptedException {
        String num = "PG-WTH-" + UUID.randomUUID().toString().substring(0, 8);
        Account account = accountRepository.save(new Account(num, alice, new BigDecimal("100.00"), "INR"));

        int threadCount = 20;
        BigDecimal withdrawAmount = new BigDecimal("10.00");
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        List<TransactionResponse> successfulWithdrawals = Collections.synchronizedList(new ArrayList<>());
        ConcurrentLinkedQueue<Throwable> unexpectedExceptions = new ConcurrentLinkedQueue<>();

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    WithdrawalRequest req = new WithdrawalRequest(account.getId(), withdrawAmount, "PG Concurrent Withdraw");
                    TransactionResponse resp = withdrawalService.withdraw(req, UUID.randomUUID().toString(), alice.getId());
                    successfulWithdrawals.add(resp);
                } catch (InsufficientFundsException e) {
                    // Expected when funds are exhausted
                } catch (Throwable t) {
                    unexpectedExceptions.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean finished = doneLatch.await(30, TimeUnit.SECONDS);
        assertTrue(finished, "Postgres withdrawal threads must complete within timeout");
        executor.shutdown();

        assertTrue(unexpectedExceptions.isEmpty(), "Unexpected exceptions on Postgres: " + unexpectedExceptions);
        assertEquals(10, successfulWithdrawals.size(), "Exactly 10 of 20 withdrawals must succeed (10 * 10 = 100)");

        Account refreshed = accountRepository.findById(account.getId()).orElseThrow();
        assertEquals(0, BigDecimal.ZERO.compareTo(refreshed.getBalance()), "Postgres balance must be exactly 0.00");
    }

    @Test
    @DisplayName("PG-3. PostgreSQL Deadlock Freedom: Bidirectional concurrent transfers (A -> B and B -> A)")
    public void testPostgreSqlOppositeDirectionTransfersDeadlockFree() throws InterruptedException {
        String numA = "PG-OPP-A-" + UUID.randomUUID().toString().substring(0, 8);
        String numB = "PG-OPP-B-" + UUID.randomUUID().toString().substring(0, 8);

        Account accA = accountRepository.save(new Account(numA, alice, new BigDecimal("1000.00"), "INR"));
        Account accB = accountRepository.save(new Account(numB, bob, new BigDecimal("1000.00"), "INR"));

        int threadsPerDirection = 10;
        int totalThreads = threadsPerDirection * 2;
        ExecutorService executor = Executors.newFixedThreadPool(totalThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(totalThreads);
        ConcurrentLinkedQueue<Throwable> exceptions = new ConcurrentLinkedQueue<>();

        // A -> B
        for (int i = 0; i < threadsPerDirection; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    TransferRequest req = new TransferRequest(accA.getId(), accB.getId(), new BigDecimal("10.00"), "A to B");
                    transferService.transfer(req, UUID.randomUUID().toString(), alice.getId());
                } catch (Throwable t) {
                    exceptions.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // B -> A
        for (int i = 0; i < threadsPerDirection; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    TransferRequest req = new TransferRequest(accB.getId(), accA.getId(), new BigDecimal("10.00"), "B to A");
                    transferService.transfer(req, UUID.randomUUID().toString(), bob.getId());
                } catch (Throwable t) {
                    exceptions.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = doneLatch.await(30, TimeUnit.SECONDS);
        assertTrue(completed, "Bidirectional transfers must complete without deadlock");
        executor.shutdown();

        assertTrue(exceptions.isEmpty(), "Postgres deadlock occurred: " + exceptions);

        Account finalA = accountRepository.findById(accA.getId()).orElseThrow();
        Account finalB = accountRepository.findById(accB.getId()).orElseThrow();

        assertEquals(0, new BigDecimal("1000.0000").compareTo(finalA.getBalance()), "A balance must net to 1000.00");
        assertEquals(0, new BigDecimal("1000.0000").compareTo(finalB.getBalance()), "B balance must net to 1000.00");
    }

    @Test
    @DisplayName("PG-4. PostgreSQL Unique Idempotency Constraint: 10 parallel identical requests execute once")
    public void testPostgreSqlUniqueIdempotencyConstraint() throws InterruptedException {
        String numA = "PG-IDEM-A-" + UUID.randomUUID().toString().substring(0, 8);
        String numB = "PG-IDEM-B-" + UUID.randomUUID().toString().substring(0, 8);

        Account accA = accountRepository.save(new Account(numA, alice, new BigDecimal("1000.00"), "INR"));
        Account accB = accountRepository.save(new Account(numB, bob, BigDecimal.ZERO, "INR"));

        String sharedKey = "PG-KEY-" + UUID.randomUUID();
        TransferRequest req = new TransferRequest(accA.getId(), accB.getId(), new BigDecimal("150.00"), "PG Idempotent");

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        List<TransactionResponse> responses = Collections.synchronizedList(new ArrayList<>());
        ConcurrentLinkedQueue<Throwable> exceptions = new ConcurrentLinkedQueue<>();
        UsernamePasswordAuthenticationToken auth = createAuthToken(alice);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    startLatch.await();
                    ResponseEntity<TransactionResponse> res = transferController.transfer(sharedKey, req, auth);
                    if (res.getBody() != null) {
                        responses.add(res.getBody());
                    }
                } catch (Throwable t) {
                    exceptions.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = doneLatch.await(30, TimeUnit.SECONDS);
        assertTrue(completed, "Replay threads must complete");
        executor.shutdown();

        assertTrue(exceptions.isEmpty(), "Unexpected exceptions on Postgres replay: " + exceptions);
        assertEquals(threadCount, responses.size(), "All 10 calls must receive responses");

        Account refreshedA = accountRepository.findById(accA.getId()).orElseThrow();
        Account refreshedB = accountRepository.findById(accB.getId()).orElseThrow();

        assertEquals(0, new BigDecimal("850.0000").compareTo(refreshedA.getBalance()),
                "Postgres: Source balance must decrease exactly once to 850.00");
        assertEquals(0, new BigDecimal("150.0000").compareTo(refreshedB.getBalance()),
                "Postgres: Dest balance must increase exactly once to 150.00");
    }

    @Test
    @DisplayName("PG-5. PostgreSQL Database Trigger: Immutability enforcer aborts direct UPDATE and DELETE")
    public void testPostgreSqlImmutabilityTriggers() {
        String num = "PG-TRIG-" + UUID.randomUUID().toString().substring(0, 8);
        Account acc = accountRepository.save(new Account(num, alice, BigDecimal.ZERO, "INR"));

        DepositRequest dep = new DepositRequest(acc.getId(), new BigDecimal("500.00"), "Deposit for trigger test");
        TransactionResponse res = depositService.deposit(dep, UUID.randomUUID().toString(), alice.getId());

        List<LedgerEntry> entries = ledgerEntryRepository.findByTransactionId(res.getTransactionId());
        assertFalse(entries.isEmpty());
        UUID entryId = entries.get(0).getId();

        // 1. Direct native SQL UPDATE on PostgreSQL -> Trigger aborts
        Exception updateEx = assertThrows(Exception.class, () -> {
            jdbcTemplate.update("UPDATE ledger_entries SET amount = 999999.00 WHERE id = ?", entryId);
        }, "PostgreSQL trigger trg_no_update_delete_ledger must block UPDATE statements");

        assertTrue(updateEx.getMessage().contains("strictly append-only") || updateEx.getMessage().contains("CRITICAL INTEGRITY VIOLATION"),
                "Exception message must come from prevent_ledger_modification trigger");

        // 2. Direct native SQL DELETE on PostgreSQL -> Trigger aborts
        Exception deleteEx = assertThrows(Exception.class, () -> {
            jdbcTemplate.update("DELETE FROM ledger_entries WHERE id = ?", entryId);
        }, "PostgreSQL trigger trg_no_update_delete_ledger must block DELETE statements");

        assertTrue(deleteEx.getMessage().contains("strictly append-only") || deleteEx.getMessage().contains("CRITICAL INTEGRITY VIOLATION"),
                "Exception message must come from prevent_ledger_modification trigger");
    }

    @Test
    @DisplayName("PG-6. PostgreSQL Crash Recovery: Simulated crash recovery restores committed response without double debit")
    public void testPostgreSqlCrashRecovery() {
        String numA = "PG-CRASH-A-" + UUID.randomUUID().toString().substring(0, 8);
        String numB = "PG-CRASH-B-" + UUID.randomUUID().toString().substring(0, 8);

        Account accA = accountRepository.save(new Account(numA, alice, new BigDecimal("500.00"), "INR"));
        Account accB = accountRepository.save(new Account(numB, bob, BigDecimal.ZERO, "INR"));

        String crashKey = "PG-CRASH-" + UUID.randomUUID();
        TransferRequest req = new TransferRequest(accA.getId(), accB.getId(), new BigDecimal("100.00"), "PG Crash Test");

        UsernamePasswordAuthenticationToken auth = createAuthToken(alice);
        SecurityContextHolder.getContext().setAuthentication(auth);

        // Execute transfer directly -> commits to Postgres
        TransactionResponse originalTx = transferService.transfer(req, crashKey, alice.getId());
        assertNotNull(originalTx);

        // Simulate crash: IdempotencyRecord was created IN_PROGRESS before the crash, response never saved
        String requestHash = idempotencyService.calculateFingerprint(req);
        IdempotencyRecord crashedRecord = new IdempotencyRecord(
                crashKey,
                alice.getId(),
                "TRANSFER",
                requestHash,
                IdempotencyStatus.IN_PROGRESS,
                null
        );
        idempotencyRecordRepository.saveAndFlush(crashedRecord);

        // Client retries via controller -> IdempotencyService recovers from Postgres ledger
        ResponseEntity<TransactionResponse> retryRes = transferController.transfer(crashKey, req, auth);
        assertNotNull(retryRes.getBody());
        assertEquals(originalTx.getTransactionId(), retryRes.getBody().getTransactionId(),
                "Recovered transaction ID must match on PostgreSQL");

        Account refreshedA = accountRepository.findById(accA.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("400.0000").compareTo(refreshedA.getBalance()),
                "Postgres: Balance must NOT decrease again on retry (must be 400.00)");
    }
}
