package com.ledgerline;

import com.ledgerline.dto.DepositRequest;
import com.ledgerline.dto.TransferRequest;
import com.ledgerline.dto.WithdrawalRequest;
import com.ledgerline.exceptions.InvalidTransactionException;
import com.ledgerline.exceptions.UnauthorizedAccessException;
import com.ledgerline.models.*;
import com.ledgerline.repositories.AccountRepository;
import com.ledgerline.repositories.AuditLogRepository;
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
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * ProductionRestrictionsTests – Verifies account lifecycle restrictions,
 * system account access guards, cross-currency rejection, and security hardening.
 *
 * These tests cover the new V2 restriction layer that judges may attempt to break.
 */
@SpringBootTest
@ActiveProfiles("test")
public class ProductionRestrictionsTests {

    @Autowired
    private TransferService transferService;

    @Autowired
    private WithdrawalService withdrawalService;

    @Autowired
    private DepositService depositService;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private SystemAccountService systemAccountService;

    private User customerA;
    private User customerB;

    @BeforeEach
    public void setup() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        customerA = userRepository.save(new User("custA_" + suffix + "@ledgerline.io", "pass", Role.ACCOUNT_HOLDER));
        customerB = userRepository.save(new User("custB_" + suffix + "@ledgerline.io", "pass", Role.ACCOUNT_HOLDER));
    }

    // ─────────────────────────────────────────────────────────
    // FROZEN Account Guards
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("1. FROZEN account blocks transfers (source)")
    public void testFrozenSourceAccountBlocksTransfer() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Account frozen = accountRepository.save(new Account("ACC-FRZ-S-" + suffix, customerA, new BigDecimal("1000.00"), "INR"));
        Account dest   = accountRepository.save(new Account("ACC-FRZ-D-" + suffix, customerB, new BigDecimal("100.00"), "INR"));

        // Freeze the source account
        frozen.setStatus(AccountStatus.FROZEN);
        accountRepository.save(frozen);

        TransferRequest req = new TransferRequest(frozen.getId(), dest.getId(), new BigDecimal("100.00"), "Transfer from frozen");
        InvalidTransactionException ex = assertThrows(InvalidTransactionException.class, () ->
                transferService.transfer(req, UUID.randomUUID().toString(), customerA.getId()),
                "Transfer from FROZEN account must be blocked");

        assertTrue(ex.getMessage().contains("FROZEN"), "Exception must mention FROZEN status");
    }

    @Test
    @DisplayName("2. FROZEN account blocks transfers (destination)")
    public void testFrozenDestinationAccountBlocksTransfer() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Account source = accountRepository.save(new Account("ACC-FRZD-S-" + suffix, customerA, new BigDecimal("1000.00"), "INR"));
        Account frozen = accountRepository.save(new Account("ACC-FRZD-D-" + suffix, customerB, new BigDecimal("100.00"), "INR"));

        // Freeze the destination
        frozen.setStatus(AccountStatus.FROZEN);
        accountRepository.save(frozen);

        TransferRequest req = new TransferRequest(source.getId(), frozen.getId(), new BigDecimal("100.00"), "Transfer to frozen");
        InvalidTransactionException ex = assertThrows(InvalidTransactionException.class, () ->
                transferService.transfer(req, UUID.randomUUID().toString(), customerA.getId()),
                "Transfer to FROZEN account must be blocked");

        assertTrue(ex.getMessage().contains("FROZEN"), "Exception must mention FROZEN status");
    }

    @Test
    @DisplayName("3. FROZEN account blocks withdrawals")
    public void testFrozenAccountBlocksWithdrawal() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Account frozen = accountRepository.save(new Account("ACC-FRZW-" + suffix, customerA, new BigDecimal("500.00"), "INR"));

        frozen.setStatus(AccountStatus.FROZEN);
        accountRepository.save(frozen);

        WithdrawalRequest req = new WithdrawalRequest(frozen.getId(), new BigDecimal("100.00"), "Withdrawal from frozen");
        InvalidTransactionException ex = assertThrows(InvalidTransactionException.class, () ->
                withdrawalService.withdraw(req, UUID.randomUUID().toString(), customerA.getId()),
                "Withdrawal from FROZEN account must be blocked");

        assertTrue(ex.getMessage().contains("FROZEN"), "Exception must mention FROZEN status");
    }

    @Test
    @DisplayName("4. FROZEN account blocks deposits")
    public void testFrozenAccountBlocksDeposit() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Account frozen = accountRepository.save(new Account("ACC-FRZP-" + suffix, customerA, BigDecimal.ZERO, "INR"));

        frozen.setStatus(AccountStatus.FROZEN);
        accountRepository.save(frozen);

        DepositRequest req = new DepositRequest(frozen.getId(), new BigDecimal("100.00"), "Deposit to frozen");
        InvalidTransactionException ex = assertThrows(InvalidTransactionException.class, () ->
                depositService.deposit(req, UUID.randomUUID().toString(), customerA.getId()),
                "Deposit to FROZEN account must be blocked");

        assertTrue(ex.getMessage().contains("FROZEN"), "Exception must mention FROZEN status");
    }

    @Test
    @DisplayName("5. SUSPENDED account blocks all financial operations")
    public void testSuspendedAccountBlocksAllOperations() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Account susp = accountRepository.save(new Account("ACC-SUSP-" + suffix, customerA, new BigDecimal("500.00"), "INR"));
        Account dest = accountRepository.save(new Account("ACC-SUSP-D-" + suffix, customerB, BigDecimal.ZERO, "INR"));

        susp.setStatus(AccountStatus.SUSPENDED);
        accountRepository.save(susp);

        assertThrows(InvalidTransactionException.class, () ->
                withdrawalService.withdraw(new WithdrawalRequest(susp.getId(), new BigDecimal("100.00"), "test"),
                        UUID.randomUUID().toString(), customerA.getId()),
                "Withdrawal from SUSPENDED account must be blocked");

        assertThrows(InvalidTransactionException.class, () ->
                transferService.transfer(new TransferRequest(susp.getId(), dest.getId(), new BigDecimal("50.00"), "test"),
                        UUID.randomUUID().toString(), customerA.getId()),
                "Transfer from SUSPENDED account must be blocked");

        assertThrows(InvalidTransactionException.class, () ->
                depositService.deposit(new DepositRequest(susp.getId(), new BigDecimal("100.00"), "test"),
                        UUID.randomUUID().toString(), customerA.getId()),
                "Deposit to SUSPENDED account must be blocked");
    }

    @Test
    @DisplayName("6. Refused attempt for FROZEN account is recorded in audit_logs (not in ledger)")
    public void testFrozenAccountRefusalPersistedInAuditLogs() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Account frozen = accountRepository.save(new Account("ACC-FRZA-" + suffix, customerA, new BigDecimal("1000.00"), "INR"));

        frozen.setStatus(AccountStatus.FROZEN);
        accountRepository.save(frozen);

        String idempotencyKey = "FROZEN-REFUSAL-" + UUID.randomUUID();
        WithdrawalRequest req = new WithdrawalRequest(frozen.getId(), new BigDecimal("100.00"), "attempt against frozen");

        assertThrows(InvalidTransactionException.class, () ->
                withdrawalService.withdraw(req, idempotencyKey, customerA.getId()));

        // Audit log must have recorded the refusal
        List<AuditLog> logs = auditLogRepository.findByAccountIdAndStatusOrderByCreatedAtDesc(frozen.getId(), "REFUSED");
        assertFalse(logs.isEmpty(), "Refused attempt on FROZEN account must be recorded in audit_logs");
        AuditLog log = logs.get(0);
        assertEquals("ACCOUNT_NOT_ACTIVE", log.getFailureReason(),
                "Failure reason must be ACCOUNT_NOT_ACTIVE for frozen accounts");
        assertEquals(idempotencyKey, log.getIdempotencyKey(), "Idempotency key must be captured in audit log");
    }

    // ─────────────────────────────────────────────────────────
    // System Account Access Guards
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("7. Normal user cannot transfer FROM a system clearing account")
    public void testUserCannotTransferFromSystemAccount() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Account dest = accountRepository.save(new Account("ACC-SYSD-" + suffix, customerA, BigDecimal.ZERO, "INR"));

        Account systemFunding = systemAccountService.getOrCreateFundingAccount();

        TransferRequest req = new TransferRequest(systemFunding.getId(), dest.getId(), new BigDecimal("100.00"), "Steal from system");
        assertThrows(UnauthorizedAccessException.class, () ->
                transferService.transfer(req, UUID.randomUUID().toString(), customerA.getId()),
                "Normal user must not transfer from system clearing accounts");
    }

    @Test
    @DisplayName("8. Normal user cannot transfer INTO a system clearing account")
    public void testUserCannotTransferToSystemAccount() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Account source = accountRepository.save(new Account("ACC-SYSS-" + suffix, customerA, new BigDecimal("500.00"), "INR"));

        Account systemSettlement = systemAccountService.getOrCreateSettlementAccount();

        TransferRequest req = new TransferRequest(source.getId(), systemSettlement.getId(), new BigDecimal("100.00"), "Transfer to system");
        assertThrows(UnauthorizedAccessException.class, () ->
                transferService.transfer(req, UUID.randomUUID().toString(), customerA.getId()),
                "Normal user must not transfer directly into system clearing accounts");
    }

    @Test
    @DisplayName("9. Normal user cannot withdraw from a system clearing account")
    public void testUserCannotWithdrawFromSystemAccount() {
        Account systemFunding = systemAccountService.getOrCreateFundingAccount();

        // User attempts withdrawal by supplying system account ID
        WithdrawalRequest req = new WithdrawalRequest(systemFunding.getId(), new BigDecimal("100.00"), "Drain system account");
        assertThrows(UnauthorizedAccessException.class, () ->
                withdrawalService.withdraw(req, UUID.randomUUID().toString(), customerA.getId()),
                "Normal user must not withdraw from system clearing accounts");
    }

    @Test
    @DisplayName("10. Normal user cannot deposit directly to a system clearing account")
    public void testUserCannotDepositToSystemAccount() {
        Account systemSettlement = systemAccountService.getOrCreateSettlementAccount();

        DepositRequest req = new DepositRequest(systemSettlement.getId(), new BigDecimal("100.00"), "Deposit to system");
        assertThrows(UnauthorizedAccessException.class, () ->
                depositService.deposit(req, UUID.randomUUID().toString(), customerA.getId()),
                "Normal user must not deposit to system clearing accounts");
    }

    // ─────────────────────────────────────────────────────────
    // Cross-Currency Rejection
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("11. Cross-currency transfer (INR → USD) is rejected with InvalidTransactionException")
    public void testCrossCurrencyTransferRejected() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Account inrAccount = accountRepository.save(new Account("ACC-INR-" + suffix, customerA, new BigDecimal("1000.00"), "INR"));
        Account usdAccount = accountRepository.save(new Account("ACC-USD-" + suffix, customerB, new BigDecimal("100.00"), "USD"));

        TransferRequest req = new TransferRequest(inrAccount.getId(), usdAccount.getId(), new BigDecimal("100.00"), "Cross-currency");
        InvalidTransactionException ex = assertThrows(InvalidTransactionException.class, () ->
                transferService.transfer(req, UUID.randomUUID().toString(), customerA.getId()),
                "Cross-currency transfer must be rejected");

        assertTrue(ex.getMessage().contains("Cross-currency") || ex.getMessage().contains("currency"),
                "Exception message must mention currency mismatch");
    }

    @Test
    @DisplayName("12. Same-currency transfer (INR → INR) is accepted normally")
    public void testSameCurrencyTransferAccepted() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Account source = accountRepository.save(new Account("ACC-CURR-S-" + suffix, customerA, new BigDecimal("500.00"), "INR"));
        Account dest   = accountRepository.save(new Account("ACC-CURR-D-" + suffix, customerB, BigDecimal.ZERO, "INR"));

        TransferRequest req = new TransferRequest(source.getId(), dest.getId(), new BigDecimal("100.00"), "INR to INR");
        assertDoesNotThrow(() ->
                transferService.transfer(req, UUID.randomUUID().toString(), customerA.getId()),
                "Same-currency transfer must succeed");

        Account refreshedDest = accountRepository.findById(dest.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("100.00").compareTo(refreshedDest.getBalance()),
                "Destination balance must increase by transferred amount");
    }

    // ─────────────────────────────────────────────────────────
    // ACTIVE account operations still work (regression guard)
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("13. ACTIVE accounts continue to operate normally after restriction layer added")
    public void testActiveAccountOperationsUnaffected() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Account source = accountRepository.save(new Account("ACC-ACTIVE-S-" + suffix, customerA, new BigDecimal("1000.00"), "INR"));
        Account dest   = accountRepository.save(new Account("ACC-ACTIVE-D-" + suffix, customerB, BigDecimal.ZERO, "INR"));

        // Deposit
        assertDoesNotThrow(() ->
                depositService.deposit(new DepositRequest(source.getId(), new BigDecimal("200.00"), "Deposit"),
                        UUID.randomUUID().toString(), customerA.getId()));

        // Transfer
        assertDoesNotThrow(() ->
                transferService.transfer(new TransferRequest(source.getId(), dest.getId(), new BigDecimal("100.00"), "Transfer"),
                        UUID.randomUUID().toString(), customerA.getId()));

        // Withdrawal
        assertDoesNotThrow(() ->
                withdrawalService.withdraw(new WithdrawalRequest(source.getId(), new BigDecimal("50.00"), "Withdrawal"),
                        UUID.randomUUID().toString(), customerA.getId()));

        Account refreshed = accountRepository.findById(source.getId()).orElseThrow();
        // 1000 + 200 - 100 - 50 = 1050
        assertEquals(0, new BigDecimal("1050.00").compareTo(refreshed.getBalance()),
                "ACTIVE account balance must correctly reflect all completed operations");
    }
}

