# THREATS.md: LedgerLine Adversarial Threat Model & Verification

This document outlines the core adversarial security threats to financial integrity, concurrency, and persistence in LedgerLine, along with cryptographic and architectural mitigations and automated verification test evidence.

---

## 1. Double Withdrawal (Concurrent Overdraft)

### Threat
Two or more concurrent withdrawal requests read the same initial balance simultaneously and both succeed, driving the account balance into an illegal negative state.

### Mitigation
1. **Pessimistic Row Locking:** Balance mutations execute `SELECT ... FOR UPDATE` via `accountRepository.findByIdWithLock(accountId)` as the very first operation inside the transaction.
2. **Lock-Guarded Validation:** Available balance is evaluated **strictly after holding the exclusive row lock**.
3. **Database Constraint Barrier:** Table-level constraint `CHECK (balance >= 0)` rejects any negative balance transition at the relational database engine level.
4. **Refusal Persistence Without Bogus Ledger Postings:** If funds are insufficient, no financial ledger entries are created. The refusal is recorded exclusively in `audit_logs` with the complete attempt metadata.

### Verification Tests
- **H2 Engine:** `ConcurrencyAndIntegrityTests.testConcurrentWithdrawalsCannotOverdraw()`
  - 20 parallel threads concurrently attempting to withdraw ₹10 each from an account with exactly ₹100.00.
  - Exactly 10 succeed, exactly 10 are refused. Final balance is ₹0.00. 10 refusal records in `audit_logs`.
- **PostgreSQL 18 Engine:** `PostgreSqlIntegrationTests.testPostgreSqlConcurrentWithdrawalsRowLocking()`
  - 20 parallel threads executing against live native PostgreSQL 18 using `SELECT ... FOR UPDATE`.
  - Exactly 10 succeed, exactly 10 refused. Account balance is exactly ₹0.00.

---

## 2. Duplicate Payment (Network Timeout Replay Attack & Key Reuse)

### Threat
A network hiccup causes a client or payment gateway to retry an HTTP transfer request that was already executed, resulting in double-charging or duplicate payouts. Alternatively, an attacker attempts to reuse an existing idempotency key with an altered amount or destination.

### Mitigation
1. **Mandatory Idempotency Keys:** Every financial write endpoint (`/api/transfers`, `/api/withdrawals`, `/api/deposits`) enforces a non-empty `Idempotency-Key` header.
2. **Canonical SHA-256 Fingerprinting:** Request payload is canonically serialized and hashed (`request_hash = SHA-256(canonicalPayload)`).
3. **Database-Backed Coordination (`Propagation.REQUIRES_NEW`):**
   - First arrival atomically claims the key by inserting an `IN_PROGRESS` row into `idempotency_records` using database uniqueness constraints (`PRIMARY KEY (idempotency_key)`).
   - Replays with identical key and payload await execution resolution and return the exact cached HTTP response without modifying balances.
   - Key reuse with an altered payload detects a fingerprint mismatch and immediately rejects the request with **HTTP 409 Conflict**.
   - Crash safety: In-progress records exceeding lease duration (60s) are safely transitioned to failed or recovered.

### Verification Tests
- **Test 1:** `ConcurrencyAndIntegrityTests.testIdempotentReplayReturnsSameResponse()`
  - 10 concurrent requests with the identical `Idempotency-Key` and payload. Exactly one transfer executes; source balance debited once; all 10 threads receive identical transaction IDs.
- **Test 2:** `FinancialAndSecurityTests.testIdempotencyKeyReuseDifferentPayloadReturns409()`
  - Reusing the same key with an altered transfer amount (₹200 instead of ₹100) throws `IdempotencyException` (HTTP 409 Conflict).
- **Test 3:** `FinancialAndSecurityTests.testMissingIdempotencyKeyFails()`
  - Blank or missing `Idempotency-Key` throws `InvalidTransactionException` (HTTP 400 Bad Request).
- **Test 4 (PostgreSQL 18):** `PostgreSqlIntegrationTests.testPostgreSqlUniqueIdempotencyConstraint()`
  - 10 concurrent racing threads against real PostgreSQL; database primary key constraint enforces single execution.

---

## 3. Crash Recovery After Financial Commit (Idempotency Window Vulnerability)

### Threat
The financial transaction (debit, credit, ledger entries) successfully commits to the database, but the application server terminates or crashes before the HTTP response is serialized and cached in `idempotency_records`. The record remains `IN_PROGRESS` with null `response_body`. When the client retries with the same key, a naive implementation might either re-execute the transfer (causing a catastrophic double-debit) or fail with HTTP 409 Conflict without confirming the transaction succeeded.

### Mitigation
1. **Committed Transaction Recovery (`tryRecoverCommittedTransaction`):**
   - When a retry encounters an existing `IN_PROGRESS` or uncompleted record, `IdempotencyService` queries `TransactionRepository` by `idempotencyKey`.
   - If a `COMPLETED` transaction is found, it loads the ledger entries, reconstructs the original `TransactionResponse`, caches the response in `idempotency_records` via `markCompleted()`, and returns the receipt to the caller.
   - Financial execution is strictly skipped: balance is untouched, and no additional ledger entries are created.
   - Payload fingerprint verification precedes recovery: retrying with an altered payload still produces HTTP 409 Conflict.

### Verification Tests
- **H2 Engine:** `FinancialAndSecurityTests.testIdempotencyCrashRecoveryReturnsCommittedResultWithoutReexecution()`
  - Simulates a crash immediately following transaction commit by setting `status = IN_PROGRESS` and `response_body = null`.
  - Retry with same key returns original transaction ID and status `COMPLETED`. Source balance is debited only once. Altered payload with same key returns HTTP 409 Conflict.
- **PostgreSQL 18 Engine:** `PostgreSqlIntegrationTests.testPostgreSqlCrashRecovery()`
  - Executes crash simulation against live PostgreSQL 18. Verified original receipt is returned, and balance reflects exactly one debit.

---

## 4. Unauthorised Account Access (IDOR & Privilege Escalation)

### Threat
An authenticated user attempts to initiate a transfer or withdrawal using a `sourceAccountId` owned by another user or an internal system vault. An Auditor attempts to initiate balance-modifying requests. An Admin attempts to siphon money from customer accounts they do not own.

### Mitigation
1. **Server-Side Ownership Verification:** The service layer asserts `sourceAccount.getOwner().getId().equals(authenticatedUserId)` using JWT claims before acquiring locks or debiting.
2. **Spring Security Role Boundaries:**
   - `ACCOUNT_HOLDER`: Can only transfer, withdraw, or deposit using accounts they own.
   - `AUDITOR`: Strictly read-only access across all accounts, statements, transaction logs, and refused attempts. Denied access to all write endpoints.
   - `ADMIN`: Can create accounts, assign ownership to users, view aggregate balances, and inspect system audit logs. Cannot move funds from accounts they do not own.
3. **Security Audit Logging:** Any unauthorized attempt triggers an `IDOR_TRANSFER_ATTEMPT` or `UNAUTHORIZED_ACCESS` audit entry with status `FORBIDDEN` / `REFUSED`.

### Verification Tests
- **Test 1:** `ConcurrencyAndIntegrityTests.testTenantIsolationAndIDOR()`
  - Attacker attempts transfer from victim Alice's account -> throws `UnauthorizedAccessException`, Alice's balance untouched, refusal logged.
- **Test 2:** `FinancialAndSecurityTests.testAuditorCannotPerformFinancialWrites()`
  - User with `Role.AUDITOR` blocked from transfers, withdrawals, and deposits with `UnauthorizedAccessException`.
- **Test 3:** `FinancialAndSecurityTests.testAdminCannotTransferFromCustomerAccounts()`
  - User with `Role.ADMIN` blocked from moving funds from customer accounts they do not own with `UnauthorizedAccessException`.

---

## 5. Double-Entry Accounting Violation ($\sum \text{Debits} \ne \sum \text{Credits}$)

### Threat
Money is created from nowhere or vanishes during external deposits or withdrawals because only one side of the ledger is credited or debited.

### Mitigation
1. **Internal Transfers:** Atomically creates 2 ledger entries: 1 DEBIT on source, 1 CREDIT on destination ($\text{Debit} = \text{Credit} = \text{Amount}$).
2. **External Deposits:** Atomically debits `ACC-SYSTEM-FUNDING` clearing account and credits customer account.
3. **External Withdrawals:** Atomically debits customer account and credits `ACC-SYSTEM-SETTLEMENT` clearing account.
4. **Conservation Invariant:** Every completed transaction satisfies $\sum \text{DEBITS} = \sum \text{CREDITS}$. System aggregate balance net is always `0.0000 INR`.

### Verification Tests
- **Test 1:** `FinancialAndSecurityTests.testDepositDoubleEntryAccounting()`
  - Deposit of ₹500: Debits `SYSTEM_FUNDING` by 500, credits customer by 500, debits == credits.
- **Test 2:** `FinancialAndSecurityTests.testWithdrawalDoubleEntryAccounting()`
  - Withdrawal of ₹350: Debits customer by 350, credits `SYSTEM_SETTLEMENT` by 350, debits == credits.
- **Test 3:** `ConcurrencyAndIntegrityTests.testConcurrentDepositsDoubleEntry()`
  - 20 parallel deposits of ₹50 each: customer balance reaches ₹1,000.00; exactly 20 credit entries and 20 funding debit entries.
- **Test 4:** `ConcurrencyAndIntegrityTests.testConcurrentWithdrawalsDoubleEntry()`
  - 20 parallel withdrawals of ₹50 each: customer balance reaches ₹0.00; exactly 20 debit entries and 20 settlement credit entries.
- **Test 5:** `FinancialAndSecurityTests.testBalanceReconciliationAgainstLedger()`
  - Account balance independently reconciled: $\text{Balance} == \sum \text{Credits} - \sum \text{Debits}$.

---

## 6. Ledger Modification (Tampering with Historical Journal)

### Threat
An attacker, insider, or SQL injection payload attempts to modify (`UPDATE`) or erase (`DELETE`) historical postings to cover up embezzlement or alter running balances.

### Mitigation
1. **JPA Entity Immutability Enforcers:** `@PreUpdate` and `@PreRemove` lifecycle hooks on `LedgerEntry` throw `IllegalStateException` on any attempt to mutate or delete existing rows.
2. **Native PostgreSQL Immutability Triggers:** Relational database triggers abort any SQL `UPDATE` or `DELETE` statement at the database engine level:
   ```sql
   CREATE OR REPLACE FUNCTION prevent_ledger_modification()
   RETURNS TRIGGER AS $$
   BEGIN
       RAISE EXCEPTION 'CRITICAL INTEGRITY VIOLATION: Ledger entries and transactions are strictly append-only. UPDATE and DELETE operations are forbidden.';
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER trg_no_update_delete_ledger
   BEFORE UPDATE OR DELETE ON ledger_entries
   FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();
   ```

### Verification Tests
- **H2 Engine:** `FinancialAndSecurityTests.testLedgerImmutabilityPreventUpdateDelete()`
  - Direct call to `ledgerEntry.setAmount(...)` or `ledgerEntryRepository.delete(...)` triggers integrity exception.
- **PostgreSQL 18 Engine:** `PostgreSqlIntegrationTests.testPostgreSqlImmutabilityTriggers()`
  - Native raw SQL `UPDATE ledger_entries` and `DELETE FROM ledger_entries` directly executed against PostgreSQL 18. Both statements abort with PostgreSQL exception: `CRITICAL INTEGRITY VIOLATION: Ledger entries and transactions are strictly append-only`.

---

## 7. Deadlock Contention Under High Load

### Threat
Two concurrent transfers between the same two accounts in opposite directions (Account A $\rightarrow$ Account B and Account B $\rightarrow$ Account A) trigger relational database deadlocks.

### Mitigation
1. **Deterministic Lexicographical Lock Ordering:** The engine sorts the two account UUIDs lexicographically:
   $$\text{Lock 1} = \min(\text{UUID}_A, \text{UUID}_B), \quad \text{Lock 2} = \max(\text{UUID}_A, \text{UUID}_B)$$
2. Both transfers acquire exclusive row locks in the exact same sequence regardless of transfer direction.

### Verification Tests
- **Test 1:** `ConcurrencyAndIntegrityTests.testOppositeDirectionTransfersDeadlockFree()`
  - 15 threads transferring A $\rightarrow$ B and 15 threads transferring B $\rightarrow$ A concurrently (30 parallel racing threads).
  - Completes with 0 deadlocks, 0 worker exceptions, and exact balance preservation.
- **Test 2:** `ConcurrencyAndIntegrityTests.testZeroSumConservation()`
  - 50 random concurrent transfers across 5 accounts under parallel execution.
  - Completes with 0 deadlocks, aggregate balance mathematically conserved.
- **Test 3 (PostgreSQL 18):** `PostgreSqlIntegrationTests.testPostgreSqlOppositeDirectionTransfersDeadlockFree()`
  - 20 bidirectional parallel threads executing against live PostgreSQL 18. 0 deadlocks, 0 exceptions, perfect balance conservation.

---

## 8. Account State Bypass & Clearing Account Exfiltration

### Threat
1. An attacker attempts financial operations against a `FROZEN` or `SUSPENDED` account to withdraw trapped funds.
2. A malicious actor attempts to transfer funds directly from internal system accounts (`ACC-SYSTEM-FUNDING` or `ACC-SYSTEM-SETTLEMENT`), draining the bank's liquidity pool.
3. An attacker attempts cross-currency arbitrage by initiating transfers across incompatible currencies (e.g. INR to USD).

### Mitigation
1. **Account Lifecycle State Machine:** Financial operations verify `account.getStatus() == AccountStatus.ACTIVE` inside the pessimistic row-lock boundary. Inactive accounts trigger refusal audit entries (`ACCOUNT_NOT_ACTIVE`) and are rejected with `InvalidTransactionException`.
2. **System Account Protection:** Services assert `!account.isSystem()` on any caller-supplied account. User attempts to transfer from, deposit to, or withdraw from system accounts are rejected with `UnauthorizedAccessException` and logged under `SYSTEM_ACCOUNT_ACCESS`.
3. **Currency Invariant Guard:** Peer-to-peer transfers assert `source.getCurrency().equals(dest.getCurrency())`. Incompatible currencies trigger refusal and are rejected with `InvalidTransactionException`.

### Verification Tests
- 13 dedicated unit/integration tests in `ProductionRestrictionsTests` (all passing).

---

## 9. Flyway Migration & Schema Evolution

### Threat
Database migrations fail on deployment due to modified checksums of historical migrations or schema drift between JPA entity definitions and physical database tables.

### Mitigation
1. Historical migration `V1__init_schema.sql` is strictly preserved.
2. New schema alterations are isolated in `V2__account_restrictions.sql`.
3. Spring Boot Flyway execution is enabled (`spring.flyway.enabled=true`, `spring.flyway.baseline-on-migrate=true`).
4. Production Hibernate DDL mode is set to `validate` (`ddl-auto=validate`), ensuring the application refuses to boot if JPA entities drift from the Flyway-migrated schema.

### Verification Tests
- **PostgreSQL 18 Engine:** `PostgreSqlIntegrationTests.testFlywayMigrationAppliedOnPostgres()`
  - Validates `flyway_schema_history` table exists, V1 and V2 migrations are applied with `success = true`, and the `admin_reason` column from V2 is physically present in the PostgreSQL table.

---

## 10. High-Frequency Flooding & Distributed Denial of Service (Redis Rate Limiting)

### Threat
A malicious botnet or runaway microservice floods critical financial endpoints (`/api/transfers`, `/api/deposits`, `/api/withdrawals`) or authentication endpoints (`/api/auth/login`, `/api/auth/register`), causing resource exhaustion, lock starvation, and potential database degradation.

### Mitigation
1. **Sliding-Window Distributed Rate Limiting:**
   - Enforced by `RateLimitingFilter` and backed by distributed `RedisTemplate`.
   - Distinct tiered quota categories per minute window:
     - `AUTH` endpoints: **15 requests/minute** (brute-force defense).
     - `FINANCIAL` mutations: **30 requests/minute** (liquidity protection & lock throttling).
     - `GENERAL` queries: **120 requests/minute** (resource conservation).
2. **Standardized HTTP 429 Payload & RFC Headers:**
   - Exceeded quotas return HTTP 429 Too Many Requests.
   - Emits RFC compliance headers: `Retry-After: <seconds>`, `X-RateLimit-Limit: <limit>`, `X-RateLimit-Remaining: 0`, and `X-RateLimit-Category`.
3. **Resilient In-Memory Fallback:**
   - If Redis connection is interrupted, the rate limiter automatically falls back to an atomic in-memory sliding-window bucket without degrading availability or failing open unsafely.

### Verification Tests
- `RateLimiterTests.testRequestsWithinQuotaAllowed()`: Quota permitted up to tier boundary.
- `RateLimiterTests.testRequestsExceedingQuotaBlocked()`: Rejection with HTTP 429 and `retryAfterSeconds > 0`.
- `RateLimiterTests.testClientAndCategoryIsolation()`: Strict quota isolation between IP clients and between endpoint categories.

---

## 11. Production Bootstrap Backdoors & Administrator Hijacking

### Threat
Attackers exploit insecure seeded demo administrator accounts or unauthenticated registration endpoints to gain root administrative privileges, or an unauthorized party repeatedly invokes bootstrap APIs to overwrite system administrators.

### Mitigation
1. **Zero-Seeded Admin in Production:**
   - `DataSeeder` is strictly restricted to `@Profile({"dev", "test"})`. Production environments boot with zero pre-seeded user accounts.
2. **Master Secret Gated Bootstrap (`ADMIN_BOOTSTRAP_SECRET`):**
   - First administrator creation requires submitting the cryptographically strong `ADMIN_BOOTSTRAP_SECRET` via `POST /api/admin/bootstrap` or interactive CLI scripts (`bootstrap-admin.bat` / `bootstrap-admin.sh`).
3. **Atomic Permanent Lockout:**
   - Once the database registers `countByRole(Role.ADMIN) > 0`, the bootstrap endpoint permanently locks out further calls and throws `UnauthorizedAccessException: Administrator bootstrap is locked`.
4. **Mandatory Audited Reason for Status Changes:**
   - When administrators freeze or suspend user accounts, `adminReason` is mandatory and persisted to immutable audit logs.

### Verification Tests
- `UserOnboardingAndAdminBootstrapTests.testAdminBootstrapCreatesAdmin()`: First admin successfully provisioned using valid secret.
- `UserOnboardingAndAdminBootstrapTests.testAdminBootstrapBlockedWithInvalidSecret()`: Invalid secret immediately rejected with HTTP 401.
- `UserOnboardingAndAdminBootstrapTests.testAdminBootstrapBlockedWhenAdminAlreadyExists()`: Second bootstrap attempt permanently blocked with HTTP 401.
- `UserOnboardingAndAdminBootstrapTests.testAccountStatusChangeRequiresAdminReason()`: Missing admin reason rejected with HTTP 400.

---

## 12. Silent Ledger Drift & Double-Entry Zero-Sum Corruption

### Threat
A latent calculation defect, unhandled rounding error, or manual DBA tampering silently introduces unbacked balance creation into the system, causing the aggregate net balance across all customer and system clearing accounts to diverge from zero.

### Mitigation
1. **Automated Spring Actuator Health Indicator (`LedgerIntegrityHealthIndicator`):**
   - Interrogates `AccountRepository.sumAllBalances()` across all accounts (customer vaults + `ACC-SYSTEM-FUNDING` + `ACC-SYSTEM-SETTLEMENT`).
   - If $\sum \text{balances} \ne 0$, flags Actuator `/actuator/health` as **DOWN** with `CRITICAL_DRIFT_DETECTED`.
2. **Public Deployment Health Probe (`/api/health`):**
   - Returns JSON telemetry including `database: CONNECTED`, `doubleEntryIntegrity: CONSERVED_ZERO_SUM`, and `netSystemBalance: "0.0000 INR"`.
3. **Database Least-Privilege Architecture (`roles_and_permissions.sql`):**
   - Explicit PostgreSQL database roles:
     - `balancevault_app`: DML access with `REVOKE UPDATE, DELETE ON ledger_entries, transactions`.
     - `balancevault_migrator`: Dedicated DDL execution for Flyway migrations.
     - `balancevault_auditor`: Strictly read-only `SELECT` access.

### Verification Tests
- `UserOnboardingAndAdminBootstrapTests.testHealthCheckEndpointReportsUpAndZeroSum()`: Asserts `/api/health` reports HTTP 200, status `UP`, and `CONSERVED_ZERO_SUM`.

---

## 13. Unauthorized Self-Funding & Direct Ledger Minting (Maker-Checker Defense)

### Threat
If a regular account holder can simply invoke a deposit endpoint to instantly credit their own balance with arbitrary sums, untrusted clients can "mint money out of thin air". Even if offset against a clearing account mathematically, business authorization is completely subverted without external settlement proof.

### Mitigation
1. **Maker-Checker Workflow (Dual-Control Authorization):**
   - Account holders submit a `DepositApprovalRequest` with requested amount, destination account, and bank wire/UTR settlement reference.
   - Initial request state is strictly **`PENDING`**. The customer's account balance **remains untouched**.
2. **Administrative Verification & Treasury Settlement:**
   - Only users with `ROLE_ADMIN` can review and execute `POST /api/deposit-requests/{id}/approve`.
   - Upon admin approval, the system atomically posts the double-entry transactions:
     - $\text{DEBIT: } \texttt{ACC-SYSTEM-FUNDING}$
     - $\text{CREDIT: Customer Target Account}$
   - Mathematical zero-sum invariant ($\sum \text{Debits} = \sum \text{Credits}$) is conserved.
3. **Fraudulent Request Rejection:**
   - Unverified or suspicious requests are rejected via `POST /api/deposit-requests/{id}/reject`.
   - Immutable audit logs record the admin review decision, timestamp, and notes.

### Verification Tests
- `DepositApprovalWorkflowTests.testCustomerDepositRequestDoesNotImmediatelyCreditBalance()`: Confirms balance stays 0.00 until approved.
- `DepositApprovalWorkflowTests.testAdminApprovalCreditsAccountAndPreservesZeroSum()`: Confirms double-entry execution and zero-sum conservation upon admin approval.
- `DepositApprovalWorkflowTests.testNonAdminCannotApproveDepositRequest()`: Asserts regular customers receive 403 / `UnauthorizedAccessException`.
- `DepositApprovalWorkflowTests.testAdminCanRejectDepositRequest()`: Confirms rejection leaves account balances untouched.

---

## Complete Test Execution Matrix (50 / 50 PASSED)

| Suite | Test Name | Target Engine | Threat / Invariant | Status |
| :--- | :--- | :---: | :--- | :---: |
| `ConcurrencyAndIntegrityTests` | `testConcurrentWithdrawalsCannotOverdraw` | H2 | Threat 1: Double Withdrawal | **PASS** |
| `ConcurrencyAndIntegrityTests` | `testIdempotentReplayReturnsSameResponse` | H2 | Threat 2: Duplicate Payment | **PASS** |
| `ConcurrencyAndIntegrityTests` | `testTenantIsolationAndIDOR` | H2 | Threat 4: IDOR / Privilege Escalation | **PASS** |
| `ConcurrencyAndIntegrityTests` | `testZeroSumConservation` | H2 | Threat 5: Aggregate Balance Conservation | **PASS** |
| `ConcurrencyAndIntegrityTests` | `testOppositeDirectionTransfersDeadlockFree` | H2 | Threat 7: Bidirectional Deadlock Safety | **PASS** |
| `ConcurrencyAndIntegrityTests` | `testConcurrentDepositsDoubleEntry` | H2 | Threat 5: Double-Entry Deposit Integrity | **PASS** |
| `ConcurrencyAndIntegrityTests` | `testConcurrentWithdrawalsDoubleEntry` | H2 | Threat 5: Double-Entry Withdrawal Integrity | **PASS** |
| `FinancialAndSecurityTests` | `testDepositDoubleEntryAccounting` | H2 | Threat 5: External Deposit Double-Entry | **PASS** |
| `FinancialAndSecurityTests` | `testWithdrawalDoubleEntryAccounting` | H2 | Threat 5: External Withdrawal Double-Entry | **PASS** |
| `FinancialAndSecurityTests` | `testIdempotencyKeyReuseDifferentPayloadReturns409` | H2 | Threat 2: Fingerprint Tampering Check | **PASS** |
| `FinancialAndSecurityTests` | `testMissingIdempotencyKeyFails` | H2 | Threat 2: Mandatory Key Enforcement | **PASS** |
| `FinancialAndSecurityTests` | `testAuditorCannotPerformFinancialWrites` | H2 | Threat 4: Auditor Read-Only Boundary | **PASS** |
| `FinancialAndSecurityTests` | `testAdminCannotTransferFromCustomerAccounts` | H2 | Threat 4: Admin Ownership Boundary | **PASS** |
| `FinancialAndSecurityTests` | `testRefusedAttemptPersistedInAuditLogs` | H2 | Threat 1: Refusal Audit Persistence | **PASS** |
| `FinancialAndSecurityTests` | `testLedgerImmutabilityPreventUpdateDelete` | H2 | Threat 6: JPA Immutability Hooks | **PASS** |
| `FinancialAndSecurityTests` | `testBalanceReconciliationAgainstLedger` | H2 | Threat 5: Ledger Balance Reconciliation | **PASS** |
| `FinancialAndSecurityTests` | `testIdempotencyCrashRecoveryReturnsCommittedResultWithoutReexecution` | H2 | Threat 3: Crash Recovery Safety | **PASS** |
| `ProductionRestrictionsTests` | `testFrozenSourceAccountBlocksTransfer` | H2 | Threat 8: FROZEN Source Block | **PASS** |
| `ProductionRestrictionsTests` | `testFrozenDestinationAccountBlocksTransfer` | H2 | Threat 8: FROZEN Destination Block | **PASS** |
| `ProductionRestrictionsTests` | `testFrozenAccountBlocksWithdrawal` | H2 | Threat 8: FROZEN Withdrawal Block | **PASS** |
| `ProductionRestrictionsTests` | `testFrozenAccountBlocksDeposit` | H2 | Threat 8: FROZEN Deposit Block | **PASS** |
| `ProductionRestrictionsTests` | `testSuspendedAccountBlocksAllOperations` | H2 | Threat 8: SUSPENDED Account Block | **PASS** |
| `ProductionRestrictionsTests` | `testFrozenAccountRefusalPersistedInAuditLogs` | H2 | Threat 8: Frozen Refusal Audit Trail | **PASS** |
| `ProductionRestrictionsTests` | `testUserCannotTransferFromSystemAccount` | H2 | Threat 8: System Account Direct Transfer | **PASS** |
| `ProductionRestrictionsTests` | `testUserCannotTransferToSystemAccount` | H2 | Threat 8: System Account Direct Inbound | **PASS** |
| `ProductionRestrictionsTests` | `testUserCannotWithdrawFromSystemAccount` | H2 | Threat 8: System Account Direct Debit | **PASS** |
| `ProductionRestrictionsTests` | `testUserCannotDepositToSystemAccount` | H2 | Threat 8: System Account Direct Credit | **PASS** |
| `ProductionRestrictionsTests` | `testCrossCurrencyTransferRejected` | H2 | Threat 8: Cross-Currency Validation | **PASS** |
| `ProductionRestrictionsTests` | `testSameCurrencyTransferAccepted` | H2 | Threat 8: Same-Currency Continuity | **PASS** |
| `ProductionRestrictionsTests` | `testActiveAccountOperationsUnaffected` | H2 | Threat 8: Active Account Operational Baseline | **PASS** |
| `RateLimiterTests` | `testRequestsWithinQuotaAllowed` | In-Memory / Redis | Threat 10: Sliding-Window Quota Conformance | **PASS** |
| `RateLimiterTests` | `testRequestsExceedingQuotaBlocked` | In-Memory / Redis | Threat 10: 429 Rejection & Retry-After | **PASS** |
| `RateLimiterTests` | `testClientAndCategoryIsolation` | In-Memory / Redis | Threat 10: Multi-Tenant Category Isolation | **PASS** |
| `UserOnboardingAndAdminBootstrapTests` | `testUserRegistrationProvisionsPrimaryAccount` | H2 | Requirement 1: KYC Onboarding & Auto-Provision | **PASS** |
| `UserOnboardingAndAdminBootstrapTests` | `testAdminBootstrapCreatesAdmin` | H2 | Threat 11: First-Admin Root Provisioning | **PASS** |
| `UserOnboardingAndAdminBootstrapTests` | `testAdminBootstrapBlockedWithInvalidSecret` | H2 | Threat 11: Invalid Secret Rejection | **PASS** |
| `UserOnboardingAndAdminBootstrapTests` | `testAdminBootstrapBlockedWhenAdminAlreadyExists` | H2 | Threat 11: Permanent Lockout Guard | **PASS** |
| `UserOnboardingAndAdminBootstrapTests` | `testAccountStatusChangeRequiresAdminReason` | H2 | Threat 11: Mandatory Audited Reason | **PASS** |
| `UserOnboardingAndAdminBootstrapTests` | `testAccountHolderCanOpenSecondaryAccount` | H2 | Requirement 1: Secondary Currency Vaults | **PASS** |
| `UserOnboardingAndAdminBootstrapTests` | `testHealthCheckEndpointReportsUpAndZeroSum` | H2 | Threat 12: Deployment Health & Zero-Sum Probe | **PASS** |
| `DepositApprovalWorkflowTests` | `testCustomerDepositRequestDoesNotImmediatelyCreditBalance` | H2 | Threat 13: Maker-Checker Deposit Pending State | **PASS** |
| `DepositApprovalWorkflowTests` | `testAdminApprovalCreditsAccountAndPreservesZeroSum` | H2 | Threat 13: Admin Dual-Control Double-Entry Settlement | **PASS** |
| `DepositApprovalWorkflowTests` | `testNonAdminCannotApproveDepositRequest` | H2 | Threat 13: RBAC Approval Access Control | **PASS** |
| `DepositApprovalWorkflowTests` | `testAdminCanRejectDepositRequest` | H2 | Threat 13: Admin Fraudulent Request Rejection | **PASS** |
| `PostgreSqlIntegrationTests` | `testFlywayMigrationAppliedOnPostgres` | **PostgreSQL 18** | Threat 9: Flyway Migration Integrity | **PASS** |
| `PostgreSqlIntegrationTests` | `testPostgreSqlConcurrentWithdrawalsRowLocking` | **PostgreSQL 18** | Threat 1: Native Row Locking & Overdraft Block | **PASS** |
| `PostgreSqlIntegrationTests` | `testPostgreSqlOppositeDirectionTransfersDeadlockFree` | **PostgreSQL 18** | Threat 7: Native Bidirectional Deadlock Safety | **PASS** |
| `PostgreSqlIntegrationTests` | `testPostgreSqlUniqueIdempotencyConstraint` | **PostgreSQL 18** | Threat 2: Native Primary Key Idempotency | **PASS** |
| `PostgreSqlIntegrationTests` | `testPostgreSqlImmutabilityTriggers` | **PostgreSQL 18** | Threat 6: Native PL/pgSQL Immutability Triggers | **PASS** |
| `PostgreSqlIntegrationTests` | `testPostgreSqlCrashRecovery` | **PostgreSQL 18** | Threat 3: Native Crash Recovery Verification | **PASS** |
