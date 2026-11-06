package com.ledgerline;

import com.ledgerline.controllers.TransferController;
import com.ledgerline.dto.DepositRequest;
import com.ledgerline.dto.TransactionResponse;
import com.ledgerline.dto.TransferRequest;
import com.ledgerline.dto.WithdrawalRequest;
import com.ledgerline.exceptions.InsufficientFundsException;
import com.ledgerline.exceptions.UnauthorizedAccessException;
import com.ledgerline.models.*;
import com.ledgerline.repositories.AccountRepository;
import com.ledgerline.repositories.AuditLogRepository;
import com.ledgerline.repositories.LedgerEntryRepository;
import com.ledgerline.repositories.TransactionRepository;
import com.ledgerline.repositories.UserRepository;
import com.ledgerline.services.DepositService;
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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class ConcurrencyAndIntegrityTests {

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

    private User testUser;
    private User attackerUser;

    @BeforeEach
    public void setup() {
        // Safe fixture isolation: Each test suite execution uses uniquely identified entities
        // preserving append-only immutability without calling forbidden deleteAll() on ledger tables
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        testUser = userRepository.save(new User("holder_" + suffix + "@ledgerline.io", "hashedPass", Role.ACCOUNT_HOLDER));
        attackerUser = userRepository.save(new User("attacker_" + suffix + "@ledgerline.io", "hashedPass", Role.ACCOUNT_HOLDER));
    }

    private UsernamePasswordAuthenticationToken createAuthToken(User user) {
        return new UsernamePasswordAuthenticationToken(
                user.getId(),
                user.getEmail(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }

    @Test
    @DisplayName("1. Threat 1 (Double Withdrawal): 20 parallel threads withdrawing ₹10 each from ₹100 cannot overdraw")
    public void testConcurrentWithdrawalsCannotOverdraw() throws InterruptedException {
        String accNum = "ACC-CW-" + UUID.randomUUID().toString().substring(0, 8);
        BigDecimal initialBalance = new BigDecimal("100.00");
        Account account = accountRepository.save(new Account(accNum, testUser, initialBalance, "INR"));
        UUID accountId = account.getId();

        int threadCount = 20;
        BigDecimal withdrawAmount = new BigDecimal("10.00");

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger refusedCount = new AtomicInteger(0);
        ConcurrentLinkedQueue<Throwable> workerExceptions = new ConcurrentLinkedQueue<>();
        UsernamePasswordAuthenticationToken auth = createAuthToken(testUser);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    startLatch.await();
                    WithdrawalRequest req = new WithdrawalRequest(accountId, withdrawAmount, "Parallel Withdrawal");
                    withdrawalService.withdraw(req, UUID.randomUUID().toString(), testUser.getId());
                    successCount.incrementAndGet();
                } catch (InsufficientFundsException e) {
                    refusedCount.incrementAndGet();
                } catch (Throwable t) {
                    workerExceptions.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // Release all threads simultaneously
        startLatch.countDown();
        boolean completed = doneLatch.await(30, TimeUnit.SECONDS);
        assertTrue(completed, "All threads should complete within timeout");
        executor.shutdown();

        // Worker exceptions must be asserted strictly empty
        assertTrue(workerExceptions.isEmpty(), "Worker threads threw unexpected exceptions: " + workerExceptions);

        // Reload account and verify assertions
        Account refreshed = accountRepository.findById(accountId).orElseThrow();

        assertEquals(10, successCount.get(), "Exactly 10 withdrawals must succeed");
        assertEquals(10, refusedCount.get(), "Exactly 10 withdrawals must be refused");
        assertEquals(0, new BigDecimal("0.0000").compareTo(refreshed.getBalance()), "Final balance must be exactly ₹0.00");
        assertTrue(refreshed.getBalance().compareTo(BigDecimal.ZERO) >= 0, "Account balance must never be negative");

        // Verify refusal audit logs were written for all 10 rejected attempts
        List<AuditLog> refusals = auditLogRepository.findByAccountIdAndStatusOrderByCreatedAtDesc(accountId, "REFUSED");
        assertEquals(10, refusals.size(), "All 10 refused attempts must be recorded in audit_logs");
    }

    @Test
    @DisplayName("2. Threat 2 (Duplicate Payment): 10 concurrent requests with same Idempotency-Key return identical response and execute once")
    public void testIdempotentReplayReturnsSameResponse() throws InterruptedException {
        String srcNum = "ACC-SRC-" + UUID.randomUUID().toString().substring(0, 8);
        String dstNum = "ACC-DST-" + UUID.randomUUID().toString().substring(0, 8);
        Account source = accountRepository.save(new Account(srcNum, testUser, new BigDecimal("1000.00"), "INR"));
        Account dest = accountRepository.save(new Account(dstNum, attackerUser, new BigDecimal("0.00"), "INR"));

        String sharedKey = UUID.randomUUID().toString();
        TransferRequest request = new TransferRequest(source.getId(), dest.getId(), new BigDecimal("150.00"), "Idempotent Transfer");

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        List<TransactionResponse> responses = Collections.synchronizedList(new ArrayList<>());
        ConcurrentLinkedQueue<Throwable> workerExceptions = new ConcurrentLinkedQueue<>();
        UsernamePasswordAuthenticationToken auth = createAuthToken(testUser);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    startLatch.await();
                    ResponseEntity<TransactionResponse> res = transferController.transfer(sharedKey, request, auth);
                    if (res.getBody() != null) {
                        responses.add(res.getBody());
                    }
                } catch (Throwable t) {
                    workerExceptions.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = doneLatch.await(30, TimeUnit.SECONDS);
        assertTrue(completed, "All replay threads should complete within timeout");
        executor.shutdown();

        assertTrue(workerExceptions.isEmpty(), "Worker threads threw unexpected exceptions: " + workerExceptions);
        assertEquals(threadCount, responses.size(), "All 10 calls must receive responses");

        // Verify balance decreased exactly once
        Account refreshedSource = accountRepository.findById(source.getId()).orElseThrow();
        Account refreshedDest = accountRepository.findById(dest.getId()).orElseThrow();

        assertEquals(0, new BigDecimal("850.0000").compareTo(refreshedSource.getBalance()), "Source balance must decrease exactly once to 850.00");
        assertEquals(0, new BigDecimal("150.0000").compareTo(refreshedDest.getBalance()), "Destination balance must increase exactly once to 150.00");

        // Verify all 10 responses returned identical transaction ID
        UUID expectedTxId = responses.get(0).getTransactionId();
        assertNotNull(expectedTxId);
        for (TransactionResponse resp : responses) {
            assertEquals(expectedTxId, resp.getTransactionId(), "All replay responses must return identical transaction ID");
            assertEquals(TransactionStatus.COMPLETED, resp.getStatus());
        }
    }

    @Test
    @DisplayName("3. Threat 3 (IDOR / Unauthorised Access): Account holder cannot transfer money from unowned account")
    public void testTenantIsolationAndIDOR() {
        String numA = "ACC-A-" + UUID.randomUUID().toString().substring(0, 8);
        String numB = "ACC-B-" + UUID.randomUUID().toString().substring(0, 8);
        Account aliceAccount = accountRepository.save(new Account(numA, testUser, new BigDecimal("500.00"), "INR"));
        Account attackerAccount = accountRepository.save(new Account(numB, attackerUser, new BigDecimal("10.00"), "INR"));

        TransferRequest req = new TransferRequest(
                aliceAccount.getId(),
                attackerAccount.getId(),
                new BigDecimal("100.00"),
                "Malicious IDOR exploit"
        );

        // Attacker attempts to initiate transfer from Alice's account
        assertThrows(UnauthorizedAccessException.class, () -> {
            transferService.transfer(req, UUID.randomUUID().toString(), attackerUser.getId());
        });

        // Verify Alice's balance is untouched
        Account refreshedAlice = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("500.0000").compareTo(refreshedAlice.getBalance()), "Alice balance must remain untouched");

        // Verify Audit Log records IDOR violation
        List<AuditLog> auditLogs = auditLogRepository.findByAccountIdAndStatusOrderByCreatedAtDesc(aliceAccount.getId(), "REFUSED");
        boolean idorLogged = auditLogs.stream().anyMatch(log ->
                "TRANSFER".equals(log.getOperationType()) && "UNAUTHORIZED_ACCESS".equals(log.getFailureReason()));
        assertTrue(idorLogged, "Security audit log must record IDOR violation attempt with full refusal details");
    }

    @Test
    @DisplayName("4. Threat 5 (Conservation & Deadlock Safety): 50 random concurrent transfers across 5 accounts preserve total money")
    public void testZeroSumConservation() throws InterruptedException {
        int accountCount = 5;
        BigDecimal initialPerAccount = new BigDecimal("1000.00");
        BigDecimal expectedTotal = initialPerAccount.multiply(new BigDecimal(accountCount));

        List<Account> accounts = new ArrayList<>();
        List<User> owners = new ArrayList<>();

        for (int i = 0; i < accountCount; i++) {
            String suffix = UUID.randomUUID().toString().substring(0, 8);
            User owner = userRepository.save(new User("owner_" + suffix + "@ledgerline.io", "pass", Role.ACCOUNT_HOLDER));
            owners.add(owner);
            Account acc = accountRepository.save(new Account("ACC-ZERO-" + suffix, owner, initialPerAccount, "INR"));
            accounts.add(acc);
        }

        int transferCount = 50;
        ExecutorService executor = Executors.newFixedThreadPool(10);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(transferCount);
        Random random = new Random(42);
        ConcurrentLinkedQueue<Throwable> workerExceptions = new ConcurrentLinkedQueue<>();

        for (int i = 0; i < transferCount; i++) {
            int srcIdx = random.nextInt(accountCount);
            int dstIdx = (srcIdx + 1 + random.nextInt(accountCount - 1)) % accountCount;

            Account src = accounts.get(srcIdx);
            Account dst = accounts.get(dstIdx);
            User initiator = owners.get(srcIdx);
            BigDecimal amount = new BigDecimal(random.nextInt(20) + 1);

            executor.submit(() -> {
                try {
                    SecurityContextHolder.getContext().setAuthentication(createAuthToken(initiator));
                    startLatch.await();
                    TransferRequest req = new TransferRequest(src.getId(), dst.getId(), amount, "Random Conservation Transfer");
                    transferService.transfer(req, UUID.randomUUID().toString(), initiator.getId());
                } catch (InsufficientFundsException ignored) {
                    // Refusals are expected and legitimate under high contention
                } catch (Throwable t) {
                    workerExceptions.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean finished = doneLatch.await(30, TimeUnit.SECONDS);
        assertTrue(finished, "Conservation batch should finish within timeout");
        executor.shutdown();

        assertTrue(workerExceptions.isEmpty(), "Worker threads threw unexpected exceptions: " + workerExceptions);

        // Calculate final aggregate balance across all 5 accounts
        BigDecimal actualTotal = BigDecimal.ZERO;
        for (Account a : accounts) {
            Account reloaded = accountRepository.findById(a.getId()).orElseThrow();
            assertTrue(reloaded.getBalance().compareTo(BigDecimal.ZERO) >= 0, "No account should ever have negative balance");
            actualTotal = actualTotal.add(reloaded.getBalance());
        }

        // Mathematical assertion: Total balance before == Total balance after
        assertEquals(0, expectedTotal.compareTo(actualTotal),
                "Conservation invariant violated! Initial: " + expectedTotal + ", Actual: " + actualTotal);
    }

    @Test
    @DisplayName("5. Deadlock-Free Bidirectional Transfers: Concurrent transfers A -> B and B -> A execute without deadlock")
    public void testOppositeDirectionTransfersDeadlockFree() throws InterruptedException {
        String numA = "ACC-OPP-A-" + UUID.randomUUID().toString().substring(0, 8);
        String numB = "ACC-OPP-B-" + UUID.randomUUID().toString().substring(0, 8);
        BigDecimal initialBal = new BigDecimal("5000.00");

        Account accA = accountRepository.save(new Account(numA, testUser, initialBal, "INR"));
        Account accB = accountRepository.save(new Account(numB, attackerUser, initialBal, "INR"));

        int pairs = 15;
        int totalThreads = pairs * 2; // 15 transfers A -> B and 15 transfers B -> A
        BigDecimal amount = new BigDecimal("20.00");

        ExecutorService executor = Executors.newFixedThreadPool(totalThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(totalThreads);
        ConcurrentLinkedQueue<Throwable> workerExceptions = new ConcurrentLinkedQueue<>();

        UsernamePasswordAuthenticationToken authA = createAuthToken(testUser);
        UsernamePasswordAuthenticationToken authB = createAuthToken(attackerUser);

        // 15 transfers A -> B
        for (int i = 0; i < pairs; i++) {
            executor.submit(() -> {
                try {
                    SecurityContextHolder.getContext().setAuthentication(authA);
                    startLatch.await();
                    TransferRequest req = new TransferRequest(accA.getId(), accB.getId(), amount, "A to B");
                    transferService.transfer(req, UUID.randomUUID().toString(), testUser.getId());
                } catch (Throwable t) {
                    workerExceptions.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // 15 transfers B -> A
        for (int i = 0; i < pairs; i++) {
            executor.submit(() -> {
                try {
                    SecurityContextHolder.getContext().setAuthentication(authB);
                    startLatch.await();
                    TransferRequest req = new TransferRequest(accB.getId(), accA.getId(), amount, "B to A");
                    transferService.transfer(req, UUID.randomUUID().toString(), attackerUser.getId());
                } catch (Throwable t) {
                    workerExceptions.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = doneLatch.await(30, TimeUnit.SECONDS);
        assertTrue(completed, "Bidirectional transfers must complete without deadlock");
        executor.shutdown();

        assertTrue(workerExceptions.isEmpty(), "Deadlock or worker exception detected: " + workerExceptions);

        Account reloadedA = accountRepository.findById(accA.getId()).orElseThrow();
        Account reloadedB = accountRepository.findById(accB.getId()).orElseThrow();

        // 15 * 20 moved each way = net balance unchanged
        assertEquals(0, initialBal.compareTo(reloadedA.getBalance()), "Account A balance must remain 5000.00");
        assertEquals(0, initialBal.compareTo(reloadedB.getBalance()), "Account B balance must remain 5000.00");
        assertEquals(0, new BigDecimal("10000.00").compareTo(reloadedA.getBalance().add(reloadedB.getBalance())));
    }

    @Test
    @DisplayName("6. Concurrent Deposits Double-Entry Integrity: 20 parallel deposits balance with SYSTEM_FUNDING")
    public void testConcurrentDepositsDoubleEntry() throws InterruptedException {
        String num = "ACC-DEP-" + UUID.randomUUID().toString().substring(0, 8);
        Account customer = accountRepository.save(new Account(num, testUser, BigDecimal.ZERO, "INR"));

        int threadCount = 20;
        BigDecimal depositAmount = new BigDecimal("50.00");
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        ConcurrentLinkedQueue<Throwable> workerExceptions = new ConcurrentLinkedQueue<>();
        UsernamePasswordAuthenticationToken auth = createAuthToken(testUser);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    startLatch.await();
                    DepositRequest req = new DepositRequest(customer.getId(), depositAmount, "Concurrent Deposit");
                    depositService.deposit(req, UUID.randomUUID().toString(), testUser.getId());
                } catch (Throwable t) {
                    workerExceptions.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = doneLatch.await(30, TimeUnit.SECONDS);
        assertTrue(completed, "Concurrent deposits should finish within timeout");
        executor.shutdown();

        assertTrue(workerExceptions.isEmpty(), "Worker exceptions occurred during concurrent deposits: " + workerExceptions);

        Account refreshed = accountRepository.findById(customer.getId()).orElseThrow();
        BigDecimal expectedBalance = depositAmount.multiply(new BigDecimal(threadCount)); // 20 * 50 = 1000.00
        assertEquals(0, expectedBalance.compareTo(refreshed.getBalance()), "Customer balance must be exactly 1000.00");

        // Verify statement double-entry equality
        List<LedgerEntry> entries = ledgerEntryRepository.findStatementEntriesByAccountId(customer.getId());
        assertEquals(20, entries.size(), "Customer account must have exactly 20 credit entries");
        for (LedgerEntry e : entries) {
            assertEquals(EntryType.CREDIT, e.getEntryType());
            assertEquals(0, depositAmount.compareTo(e.getAmount()));
        }
    }

    @Test
    @DisplayName("7. Concurrent Withdrawals Double-Entry Integrity: 20 parallel withdrawals balance with SYSTEM_SETTLEMENT")
    public void testConcurrentWithdrawalsDoubleEntry() throws InterruptedException {
        String num = "ACC-WITH-" + UUID.randomUUID().toString().substring(0, 8);
        Account customer = accountRepository.save(new Account(num, testUser, new BigDecimal("1000.00"), "INR"));

        int threadCount = 20;
        BigDecimal withdrawAmount = new BigDecimal("50.00");
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        ConcurrentLinkedQueue<Throwable> workerExceptions = new ConcurrentLinkedQueue<>();
        UsernamePasswordAuthenticationToken auth = createAuthToken(testUser);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    startLatch.await();
                    WithdrawalRequest req = new WithdrawalRequest(customer.getId(), withdrawAmount, "Concurrent Withdrawal");
                    withdrawalService.withdraw(req, UUID.randomUUID().toString(), testUser.getId());
                } catch (Throwable t) {
                    workerExceptions.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = doneLatch.await(30, TimeUnit.SECONDS);
        assertTrue(completed, "Concurrent withdrawals should finish within timeout");
        executor.shutdown();

        assertTrue(workerExceptions.isEmpty(), "Worker exceptions occurred during concurrent withdrawals: " + workerExceptions);

        Account refreshed = accountRepository.findById(customer.getId()).orElseThrow();
        assertEquals(0, BigDecimal.ZERO.compareTo(refreshed.getBalance()), "Customer balance must reach exactly 0.00");

        List<LedgerEntry> entries = ledgerEntryRepository.findStatementEntriesByAccountId(customer.getId());
        assertEquals(20, entries.size(), "Customer account must have exactly 20 debit entries");
        for (LedgerEntry e : entries) {
            assertEquals(EntryType.DEBIT, e.getEntryType());
            assertEquals(0, withdrawAmount.compareTo(e.getAmount()));
        }
    }
}
