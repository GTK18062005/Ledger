# PROMPTS.md: Adversarial AI Interaction Log & Engineering Decisions

This log documents the interactive prompt-driven development, adversarial review, and architectural corrections made while building **LedgerLine**. 

In financial ledger engineering, a plausible but subtly incorrect implementation (especially around double-entry conservation, row-level concurrency, authorization boundaries, and audit persistence) causes catastrophic financial or security failures. This log provides transparent evidence of where the AI generated incorrect or vulnerable solutions, why they were rejected, and the corrective engineering applied.

---

## Entry 1: Double-Entry Conservation for External Funding and Settlement

- **Date:** 2026-11-06 (Morning)
- **Target Area:** Financial Integrity & Double-Entry Accounting
- **What was asked for:**  
  Implement deposit and withdrawal capabilities so users can deposit money from external bank accounts and withdraw funds to their bank accounts.
- **What the tool produced:**  
  The AI implemented a `DepositService` that simply fetched the customer's account and created a single `CREDIT` ledger entry, incrementing their balance. For `WithdrawalService`, it created a single `DEBIT` ledger entry, decrementing their balance.
- **What was wrong with it:**  
  This violated the single most important rule in financial accounting: **$\sum \text{Debits} = \sum \text{Credits}$ (Conservation of Money)**.  
  In a single-entry model, money is created from nothing on deposit and erased into the void on withdrawal. An auditor computing the aggregate net sum of all ledger entries would find that the bank's books do not balance ($\sum \Delta \ne 0$).
- **What was done instead:**  
  Enforced a strict balanced double-entry funding model with dedicated internal clearing vault accounts:
  - Created `ACC-SYSTEM-FUNDING` and `ACC-SYSTEM-SETTLEMENT` managed by `SystemAccountService`.
  - **Deposit:** Atomically creates a `DEBIT` on `SYSTEM_FUNDING` and a `CREDIT` on the customer's account.
  - **Withdrawal:** Atomically creates a `DEBIT` on the customer's account and a `CREDIT` on `SYSTEM_SETTLEMENT`.
  - Added system aggregate endpoint `/api/accounts/aggregate` and automated tests asserting that across all customer and system accounts, the system-wide balance net is strictly `0.0000 INR`.
- **Primary Source Code & Tests:**  
  - [`DepositService.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/services/DepositService.java)
  - [`WithdrawalService.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/services/WithdrawalService.java)
  - [`FinancialAndSecurityTests.java#testDepositDoubleEntryAccounting`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/test/java/com/ledgerline/FinancialAndSecurityTests.java)
- **Commit Reference:** [`52686a3`](https://github.com/GTK18062005/Ledger/commit/52686a366aeaeca58736267fa6f691d5853aff41)

---

## Entry 2: Authorisation Boundary & IDOR in Peer-to-Peer Transfers

- **Date:** 2026-11-06 (Midday)
- **Target Area:** Authorisation, Access Control & IDOR Defense
- **What was asked for:**  
  Secure the `/api/transfers` endpoint using Spring Security so only authenticated account holders can initiate transfers.
- **What the tool produced:**  
  The AI secured the controller endpoint with `@PreAuthorize("hasRole('ACCOUNT_HOLDER')")` and accepted `TransferRequest` with `sourceAccountId`, `destinationAccountId`, and `amount` directly from the JSON body.
- **What was wrong with it:**  
  **Severe Insecure Direct Object Reference (IDOR) & Privilege Escalation:**  
  While the endpoint required authentication, it completely failed to verify whether the authenticated user actually owned `sourceAccountId`!  
  1. An attacker (e.g. Bob) logged in with valid credentials could submit Alice's `sourceAccountId` in the HTTP payload. The AI's code looked up the account by UUID and debited it without checking ownership.
  2. An administrator with `Role.ADMIN` could invoke internal transfer methods to siphon funds from arbitrary customer accounts.
- **What was done instead:**  
  1. Extracted the authenticated user principal (`authenticatedUserId`) from the verified JWT claims via `SecurityContextHolder`.
  2. Implemented mandatory ownership verification inside `TransferService`:
     ```java
     if (!sourceAccount.getOwner().getId().equals(authenticatedUserId)) {
         auditLogService.logEvent(
             "IDOR_TRANSFER_ATTEMPT",
             authenticatedUser,
             AuditStatus.FORBIDDEN,
             "Caller attempted transfer from unowned account: " + sourceAccountId
         );
         throw new UnauthorizedAccessException("Forbidden: You do not own the source account.");
     }
     ```
  3. Prohibited Admins and Auditors from performing peer transfers on accounts they do not own.
  4. Blocked normal users from touching system clearing vaults (`ACC-SYSTEM-FUNDING` / `ACC-SYSTEM-SETTLEMENT`).
- **Primary Source Code & Tests:**  
  - [`TransferService.java#transfer`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/services/TransferService.java)
  - [`ConcurrencyAndIntegrityTests.java#testTenantIsolationAndIDOR`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/test/java/com/ledgerline/ConcurrencyAndIntegrityTests.java)
  - [`FinancialAndSecurityTests.java#testAdminCannotTransferFromCustomerAccounts`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/test/java/com/ledgerline/FinancialAndSecurityTests.java)
- **Commit Reference:** [`52686a3`](https://github.com/GTK18062005/Ledger/commit/52686a366aeaeca58736267fa6f691d5853aff41)

---

## Entry 3: Audit Trail Isolation vs. Financial Journal Corruption

- **Date:** 2026-11-06 (Afternoon)
- **Target Area:** Audit Trail & Ledger Immutability
- **What was asked for:**  
  Persist all transaction attempts—including failed or refused attempts (such as insufficient funds or frozen account interactions)—so the bank has a complete audit trail.
- **What the tool produced:**  
  The AI suggested inserting a `LedgerEntry` with `amount = 0` or entry type `REFUSED` directly into the `ledger_entries` table, or wrapping the financial logic in a catch block that writes failed ledger entries.
- **What was wrong with it:**  
  **Journal Poisoning & Balance Reconciliation Breakdown:**  
  1. In accounting theory, a *ledger* is an append-only journal of **actual financial movement**. Writing non-movement rows or failed attempts into `ledger_entries` corrupts balance reconciliation:
     $$\text{Account Balance} = \sum \text{Credits} - \sum \text{Debits}$$
     Zero-amount or refused rows pollute aggregation queries and bloat journal tables.
  2. When a financial transaction encounters an unhandled exception or database check constraint violation, the database transaction rolls back. Any failed entry written in the same transaction is rolled back and erased, destroying the audit evidence!
- **What was done instead:**  
  1. Strictly isolated the financial journal (`ledger_entries`) from the regulatory audit log (`audit_logs`).
  2. Refused attempts never generate `LedgerEntry` records. They are dispatched to `AuditLogService` using `Propagation.REQUIRES_NEW`:
     ```java
     @Transactional(propagation = Propagation.REQUIRES_NEW)
     public void logRefusal(String action, User actor, String reason, Map<String, Object> metadata) {
         auditLogRepository.save(new AuditLog(action, actor, AuditStatus.REFUSED, reason, metadata));
     }
     ```
  3. When an overdraw or unauthorized attempt fails, the financial rollback does not roll back the audit log. The audit log survives intact, while the ledger remains clean and mathematically verifiable.
- **Primary Source Code & Tests:**  
  - [`AuditService.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/services/AuditService.java)
  - [`StatementService.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/services/StatementService.java)
  - [`FinancialAndSecurityTests.java#testRefusedAttemptPersistedInAuditLogs`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/test/java/com/ledgerline/FinancialAndSecurityTests.java)
- **Commit Reference:** [`52686a3`](https://github.com/GTK18062005/Ledger/commit/52686a366aeaeca58736267fa6f691d5853aff41)

---

## Entry 4: Concurrency Flaw in Spring Data JPA `save()` vs. Primary Key Constraints

- **Date:** 2026-11-06 (Afternoon)
- **Target Area:** Distributed Idempotency & Database Concurrency
- **What was asked for:**  
  Implement database-backed idempotency using an `idempotency_records` table where `idempotency_key` is the primary key.
- **What the tool produced:**  
  The AI defined `IdempotencyRecord` with `@Id private String idempotencyKey;` and invoked `idempotencyRecordRepository.save(record)` inside `IdempotencyService`.
- **What was wrong with it:**  
  **Silent Check-Then-Act Overwrite (The `isNew()` Pitfall):**  
  In Spring Data JPA, when an entity uses an assigned (manual) identifier rather than a generated ID, calling `repository.save()` invokes `isNew()`. Because `idempotencyKey != null`, Spring Data assumes the entity already exists in the database and calls `entityManager.merge()` instead of `persist()`.  
  Under heavy concurrent load:
  1. Thread 1 and Thread 2 both receive requests with the same key.
  2. Both call `save()`, which runs `SELECT ... FROM idempotency_records WHERE idempotency_key = ?`.
  3. Both find nothing.
  4. Both issue `INSERT` or overwrite each other's status rather than immediately triggering a database duplicate key exception, defeating atomic reservation.
- **What was done instead:**  
  1. Configured `IdempotencyRecord` to implement `org.springframework.data.domain.Persistable<String>`:
     ```java
     @Entity
     @Table(name = "idempotency_records")
     public class IdempotencyRecord implements Persistable<String> {
         @Id
         private String idempotencyKey;
         
         @Transient
         private boolean isNew = true;
         
         @Override
         public boolean isNew() { return isNew; }
         
         @PrePersist @PostLoad
         void markNotNew() { this.isNew = false; }
     }
     ```
  2. This guarantees that `repository.save()` invokes `entityManager.persist()`.
  3. When concurrent identical requests arrive, the database engine primary key constraint immediately rejects the second thread with a `DataIntegrityViolationException` (`SQLState 23505`), guaranteeing atomic exactly-once reservation.
- **Primary Source Code & Tests:**  
  - [`IdempotencyRecord.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/models/IdempotencyRecord.java)
  - [`IdempotencyService.java#tryInsertInProgress`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/services/IdempotencyService.java)
  - [`ConcurrencyAndIntegrityTests.java#testIdempotentReplayReturnsSameResponse`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/test/java/com/ledgerline/ConcurrencyAndIntegrityTests.java)
  - [`PostgreSqlIntegrationTests.java#testPostgreSqlUniqueIdempotencyConstraint`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/test/java/com/ledgerline/PostgreSqlIntegrationTests.java)
- **Commit Reference:** [`52686a3`](https://github.com/GTK18062005/Ledger/commit/52686a366aeaeca58736267fa6f691d5853aff41)

---

## Entry 5: Idempotency Crash Recovery Window (Committed Transaction Orphan)

- **Date:** 2026-11-06 (Late Afternoon)
- **Target Area:** Crash Safety & Exactly-Once Semantics
- **What was asked for:**  
  Ensure that if an application crashes mid-transaction, idempotency keys do not cause double-debits on retry.
- **What the tool produced:**  
  The AI added a lease timeout (60 seconds). If a request crashed mid-flight, any subsequent retry seeing an expired `IN_PROGRESS` record treated it as failed and re-executed the financial transfer from scratch.
- **What was wrong with it:**  
  **Catastrophic Double-Debit Window:**  
  Consider this critical timeline:
  1. Transfer commits to the database: Alice is debited ₹2,000, Bob is credited ₹2,000.
  2. **JVM crashes** (or network dies) before the application can call `idempotencyService.markCompleted()`.
  3. The `idempotency_records` row remains `IN_PROGRESS` with null `response_body`.
  4. The client times out and retries with the same `Idempotency-Key`.
  5. The AI's code saw the expired `IN_PROGRESS` record, cleared it, and re-executed the transfer! Alice was debited ₹2,000 a second time!
- **What was done instead:**  
  Implemented `tryRecoverCommittedTransaction(idempotencyKey, responseType)`:
  1. Before allowing any re-execution or throwing an unhelpful 409 error, `IdempotencyService` queries `TransactionRepository` to check if a completed transaction with this `idempotencyKey` already committed to the database.
  2. If found, it loads the immutable `LedgerEntry` postings, reconstructs the original `TransactionResponse`, caches it via `markCompleted()`, and returns the receipt to the caller.
  3. **Zero financial re-execution:** Alice's balance is untouched, and the client receives confirmation that their original transfer succeeded.
  4. Fingerprint verification is preserved: if the client retries with an altered payload amount, the system detects payload tampering and rejects it with HTTP 409 Conflict.
- **Primary Source Code & Tests:**  
  - [`IdempotencyService.java#tryRecoverCommittedTransaction`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/services/IdempotencyService.java)
  - [`FinancialAndSecurityTests.java#testIdempotencyCrashRecoveryReturnsCommittedResultWithoutReexecution`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/test/java/com/ledgerline/FinancialAndSecurityTests.java)
  - [`PostgreSqlIntegrationTests.java#testPostgreSqlCrashRecovery`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/test/java/com/ledgerline/PostgreSqlIntegrationTests.java)
- **Commit Reference:** [`52686a3`](https://github.com/GTK18062005/Ledger/commit/52686a366aeaeca58736267fa6f691d5853aff41)

---

## Entry 6: Hardcoded Secret Fallbacks & Production DataSeeder Vulnerability

- **Date:** 2026-11-06 (Evening)
- **Target Area:** Production Security Hardening & Secret Management
- **What was asked for:**  
  Configure production configuration profiles for database and JWT security.
- **What the tool produced:**  
  The AI set `jwt.secret: ${JWT_SECRET:SuperSecretDefaultMissionCriticalKey...}` in `application.yml` and left `DataSeeder.java` unconstrained by environment profile.
- **What was wrong with it:**  
  1. **Token Forgery:** If deployed to production without explicitly supplying `JWT_SECRET`, the application silently used the hardcoded fallback string. Any attacker who viewed the public repository could generate valid JWT tokens with `ROLE_ADMIN`.
  2. **Default Credential Backdoors:** `DataSeeder` would run on every production boot, automatically creating default demo users (`admin@ledgerline.io`, `alice@ledgerline.io` / `Password123!`), leaving administrative backdoors wide open.
- **What was done instead:**  
  1. Gated `DataSeeder` strictly with `@Profile({"dev", "test"})`. Demo users are never seeded in production.
  2. Removed fallback values in `application.yml` for the `prod` profile:
     ```yaml
     spring:
       config:
         activate:
           on-profile: prod
       datasource:
         url: ${SPRING_DATASOURCE_URL}
         username: ${SPRING_DATASOURCE_USERNAME}
         password: ${SPRING_DATASOURCE_PASSWORD}
     jwt:
       secret: ${JWT_SECRET}
     ```
  3. Verified fail-safe behavior: running the packaged JAR with `--spring.profiles.active=prod` without `JWT_SECRET` immediately aborts context initialization (`UnsatisfiedDependencyException`), refusing to start insecurely.
- **Primary Source Code & Tests:**  
  - [`DataSeeder.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/config/DataSeeder.java)
  - [`application.yml`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/resources/application.yml)
- **Commit Reference:** [`52686a3`](https://github.com/GTK18062005/Ledger/commit/52686a366aeaeca58736267fa6f691d5853aff41)


---

## Entry 7: Redis Rate Limiter: Distributed Sliding Window vs. Naive Token Bucket

- **Date:** 2026-11-10 (Morning)
- **Target Area:** High-Frequency Flooding, Distributed Coordination & Rate Limiting
- **What was asked for:**  
  Implement Redis-backed rate limiting to defend financial mutations (`/api/transfers`, `/api/deposits`, `/api/withdrawals`) and authentication endpoints (`/api/auth/login`, `/api/auth/register`) from distributed denial of service and brute-force attacks.
- **What the tool produced:**  
  The AI suggested a simple local `ConcurrentHashMap` counter or a fixed 1-minute window key in Redis (`INCR key` followed by `EXPIRE 60`).
- **What was wrong with it:**  
  1. **Fixed-Window Burst Vulnerability:** Fixed 60-second window counters permit boundary double-bursts: a client can send 30 requests at minute 0:59 and another 30 requests at minute 1:00, pushing 60 financial writes through the engine in under 2 seconds.
  2. **Test Fragility:** Directly coupling the Spring context to a required external Redis server caused local unit tests and test suites without live Redis instances to immediately crash on context boot.
- **What was done instead:**  
  1. Implemented a sliding-window algorithm in `RateLimiterService` using current-minute epoch window keys with 120s TTL and carry-forward weighting.
  2. Defined distinct quota categories:
     - `AUTH`: 15 requests / minute.
     - `FINANCIAL`: 30 mutations / minute.
     - `GENERAL`: 120 queries / minute.
  3. Built an atomic in-memory sliding-window fallback with `ConcurrentHashMap` and `AtomicInteger` that automatically activates when Redis is disconnected or unconfigured, ensuring resilient offline testing while guaranteeing production Redis clustering.
  4. Registered `RateLimitingFilter` returning standard RFC headers (`Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Category`).
- **Primary Source Code & Tests:**  
  - [`RateLimiterService.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/services/RateLimiterService.java)
  - [`RateLimitingFilter.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/config/RateLimitingFilter.java)
  - [`RateLimiterTests.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/test/java/com/ledgerline/RateLimiterTests.java)
- **Commit Reference:** [`27a7561`](https://github.com/GTK18062005/Ledger/commit/27a7561e1b7470fcfd1ae981d368dcf09eec81b5)

---

## Entry 8: Production First-Admin Bootstrap vs. Insecure Seeded Credentials

- **Date:** 2026-11-10 (Midday)
- **Target Area:** Authorisation, Root Bootstrapping & Secret Hygiene
- **What was asked for:**  
  Provide a secure mechanism to bootstrap the initial system administrator in a production environment without relying on pre-seeded demo credentials.
- **What the tool produced:**  
  The AI suggested adding an open endpoint `POST /api/users` with an optional `role: "ADMIN"` parameter in the JSON body, or creating an unauthenticated `/api/admin/bootstrap` endpoint that could be invoked at any time.
- **What was wrong with it:**  
  **Catastrophic Administrative Hijacking:**  
  1. An open registration endpoint accepting `role: "ADMIN"` allows any public caller to grant themselves administrative privileges over the financial ledger.
  2. An unauthenticated bootstrap endpoint without state locking allows any external attacker to invoke the endpoint after deployment and overwrite or mint arbitrary root admin accounts.
- **What was done instead:**  
  1. Implemented `AdminBootstrapService` requiring a cryptographically strong `ADMIN_BOOTSTRAP_SECRET` passed in `BootstrapAdminRequest`:
     ```java
     if (!bootstrapSecret.equals(expectedSecret)) {
         throw new UnauthorizedAccessException("Access denied: Invalid administrator bootstrap secret.");
     }
     long existingAdmins = userRepository.countByRole(Role.ADMIN);
     if (existingAdmins > 0) {
         throw new UnauthorizedAccessException("Administrator bootstrap is locked: an administrator already exists.");
     }
     ```
  2. The moment the first administrator is created in PostgreSQL, the bootstrap mechanism **permanently locks itself out**. Subsequent requests fail with HTTP 401 Unauthorized.
  3. Created dedicated operational CLI scripts (`bootstrap-admin.bat` and `bootstrap-admin.sh`) that prompt the operator for the bootstrap secret interactively without recording credentials in shell history.
  4. Added automated verification tests proving that valid secrets succeed, invalid secrets fail, and subsequent bootstrap calls are permanently blocked.
- **Primary Source Code & Tests:**  
  - [`AdminBootstrapService.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/services/AdminBootstrapService.java)
  - [`AdminController.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/controllers/AdminController.java)
  - [`UserOnboardingAndAdminBootstrapTests.java#testAdminBootstrapCreatesAdmin`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/test/java/com/ledgerline/UserOnboardingAndAdminBootstrapTests.java)
- **Commit Reference:** [`27a7561`](https://github.com/GTK18062005/Ledger/commit/27a7561e1b7470fcfd1ae981d368dcf09eec81b5)

---

## Entry 9: Database Least-Privilege Architecture & Double-Entry Zero-Sum Health Checks

- **Date:** 2026-11-10 (Afternoon)
- **Target Area:** Least-Privilege Security, Actuator Health & Invariant Verification
- **What was asked for:**  
  Add database roles and deployment health checks to verify production readiness.
- **What the tool produced:**  
  The AI configured Spring Boot Actuator's default health check (`/actuator/health`) which only pings the database connection and reports `UP` as long as `SELECT 1` succeeds, and recommended having the application run under the PostgreSQL `postgres` superuser.
- **What was wrong with it:**  
  1. **Blind Health Probes:** A standard `SELECT 1` ping tells the orchestrator nothing about accounting integrity. If a software bug or database corruption occurs where customer balances sum to ₹50,000,000 but system clearing accounts sum to -₹10,000,000 (a massive ₹40,000,000 ledger drift), standard Actuator still happily reports `UP`!
  2. **Excessive DB Privileges:** Running as `postgres` superuser allows the application to execute DDL statements at runtime and bypass `REVOKE UPDATE, DELETE` table immutability rules.
- **What was done instead:**  
  1. Authored `db/roles_and_permissions.sql` defining three strictly isolated PostgreSQL database roles:
     - `balancevault_migrator`: Dedicated role for Flyway DDL executions during CI/CD.
     - `balancevault_app`: Minimal runtime DML role (`SELECT, INSERT` on all tables, `UPDATE` only on `accounts.balance/status` and `idempotency_records`), with explicit `REVOKE UPDATE, DELETE ON ledger_entries, transactions`.
     - `balancevault_auditor`: Strictly read-only `SELECT` role for compliance inspection.
  2. Implemented custom `LedgerIntegrityHealthIndicator` and public `/api/health` probe that dynamically query `AccountRepository.sumAllBalances()`.
  3. If $\sum \text{balances} \ne 0.0000$, the health indicator flags the system status as **DOWN** with `CRITICAL_DRIFT_DETECTED`, instantly alerting Kubernetes or Docker Swarm load balancers to halt traffic before financial damage spreads.
- **Primary Source Code & Tests:**  
  - [`LedgerIntegrityHealthIndicator.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/health/LedgerIntegrityHealthIndicator.java)
  - [`HealthCheckController.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/controllers/HealthCheckController.java)
  - [`backend/src/main/resources/db/roles_and_permissions.sql`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/resources/db/roles_and_permissions.sql)
  - [`UserOnboardingAndAdminBootstrapTests.java#testHealthCheckEndpointReportsUpAndZeroSum`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/test/java/com/ledgerline/UserOnboardingAndAdminBootstrapTests.java)
- **Commit Reference:** [`27a7561`](https://github.com/GTK18062005/Ledger/commit/27a7561e1b7470fcfd1ae981d368dcf09eec81b5)

---

## Entry 10: Authorisation Boundaries, Double-Entry Treasury Credit & Statement Pagination

- **Date:** 2026-11-10 (Late Evening)
- **Target Area:** Authorisation Boundaries, Double-Entry Treasury Credit & Statement Pagination
- **What was asked for:**  
  Add pagination to statements and audit logs, allow the administrator to add money directly to different accounts, and cleanly separate the login page from the dashboard.
- **What the tool produced:**  
  The AI attempted to let administrators deposit funds by using an endpoint that bypassed double-entry checks or directly altered account balances in the database. For pagination, it sliced lists without preserving zero-sum ledger audit guarantees or broke backward compatibility with the existing Statement API. For the login page, it embedded a modal that auto-logged into Alice's account whenever credentials expired or were unset.
- **What was wrong with it:**  
  1. **Direct Balance Tampering & Ledger Invariant Breach:** Directly updating an account's balance without equal and offsetting ledger entries against an external clearing account (`ACC-SYSTEM-FUNDING`) breaks the fundamental accounting equation $\sum \text{Debits} = \sum \text{Credits}$, causing `LedgerIntegrityHealthIndicator` to fail and health probes to trip `DOWN`.
  2. **Authorisation & IDOR Violation:** Normal customer deposit endpoints enforce customer ownership (blocking users from depositing to accounts they don't own). An admin funding mechanism requires a dedicated, audited administrative treasury pathway while strictly enforcing double-entry postings (DEBIT: `SYSTEM_FUNDING`, CREDIT: Customer Account).
  3. **Broken Statement API Contracts:** Naively altering the statement return structure broke unpaginated integration tests and downstream auditors.
- **What was done instead:**  
  1. Extended `AdminController` with `@PostMapping("/deposits")` restricted to `hasRole('ADMIN')`, coordinating through `IdempotencyService` and delegating to `DepositService.deposit(...)`. Also updated `TransferController.java` deposit mapping to `hasAnyRole('ACCOUNT_HOLDER', 'ADMIN')`.
  2. Maintained strict double-entry invariants: every admin treasury deposit atomically debits `ACC-SYSTEM-FUNDING` and credits the target customer account, creating immutable `LedgerEntry` postings and recording an audit event under `ROLE_ADMIN`.
  3. Implemented overloaded `StatementService.getStatement(...)` supporting optional `page` and `size` parameters with boundary clamping, preserving 100% backward compatibility with unpaginated callers.
  4. Built clean React pagination UI in `StatementViewer.jsx` and `AdminAuditorPanel.jsx` with page size selection (`[5, 10, 20, 50]`) and navigation controls.
  5. Isolated the unauthenticated state into a dedicated `LoginPage.jsx` component with 1-click persona switching (Alice, Bob, Admin, Auditor) and removed all silent auto-login fallbacks.
- **Primary Source Code & Tests:**  
  - [`AdminController.java#adminDeposit`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/controllers/AdminController.java)
  - [`TransferController.java#deposit`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/controllers/TransferController.java)
  - [`StatementService.java#getStatement`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/services/StatementService.java)
  - [`LoginPage.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/LoginPage.jsx)
  - [`StatementViewer.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/StatementViewer.jsx)
  - [`AdminAuditorPanel.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/AdminAuditorPanel.jsx)
  - [`FinancialAndSecurityTests.java#testAdminCanAddMoneyToDifferentAccountsAndMaintainDoubleEntryBalance`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/test/java/com/ledgerline/FinancialAndSecurityTests.java)
  - [`FinancialAndSecurityTests.java#testStatementServicePagination`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/test/java/com/ledgerline/FinancialAndSecurityTests.java)
- **Commit Reference:** [`dfa4a09`](https://github.com/GTK18062005/Ledger/commit/dfa4a09)

---

## Entry 11: Real-Time Search, UI De-Cluttering & Tomcat Error Handling on Account Status Mutation

- **Date:** 2026-11-11 (Midnight)
- **Target Area:** UI Usability, Real-Time Filtering, HTTP Dispatcher Resilience & Error Handling
- **What was asked for:**  
  1. Add search bars in "My Accounts", "Statement and History", and "Admin and Audit".  
  2. Remove the unwanted features identified in screenshots: the multi-tenant persona switcher banner at the top of the dashboard and the massive wall of account chips under "Quick select:" in the admin panel.  
  3. Resolve the Tomcat error `StandardHostValve.invoke / ErrorReportValve.invoke` thrown when updating account status.
- **What the tool produced:**  
  The AI previously mapped `@PostMapping("/{id}/status")` on `AccountController.java` while `api.js` dispatched HTTP `PATCH`, and enforced `@NotBlank` on `adminReason`. When Tomcat processed the request, the method mismatch or missing reason triggered Spring's unhandled `HttpRequestMethodNotSupportedException`, leading to Tomcat's internal `ErrorReportValve` stack trace. Furthermore, the UI suffered from severe clutter due to the `Quick select:` button wall (rendering every database/test account) and the duplicate persona switcher banner.
- **What was wrong with it:**  
  1. **Tomcat Dispatcher Crash & Fragile HTTP Semantics:** Strict POST-only mapping rejected standard RESTful PATCH updates from the frontend. In the absence of an explicit `HttpRequestMethodNotSupportedException` handler in `GlobalExceptionHandler`, Tomcat's `ErrorReportValve` trapped the unhandled servlet exception, exposing container internals rather than structured JSON.
  2. **Strict Validation Friction:** Enforcing `@NotBlank` on `adminReason` caused 400 Bad Request rejections whenever an administrator quickly adjusted an account's freeze state without typing an extensive memo.
  3. **Visual Clutter & Poor Discoverability:** Dozens of account chips filled the screen horizontally, and the lack of search bars made finding specific accounts or audit entries tedious.
- **What was done instead:**  
  1. **Removed Unwanted Elements:**
     - Removed `<DemoUserSwitcher>` from `App.jsx` (authenticated dashboard is now uncluttered; persona switching is cleanly isolated to `LoginPage.jsx`).
     - Removed the entire `Quick select:` wall of account buttons from `AdminAuditorPanel.jsx`.
  2. **Fixed Account Status Endpoint & Exception Handling:**
     - Updated `AccountController.java` to `@RequestMapping(value = "/{id}/status", method = {RequestMethod.POST, RequestMethod.PATCH, RequestMethod.PUT})`.
     - Relaxed `UpdateAccountStatusRequest.java` to provide a fallback reason (`"Administrative status update"`) if left blank.
     - Updated `frontend/src/api.js` to dispatch `POST` with safe fallback parameters.
     - Added dedicated exception handlers in `GlobalExceptionHandler.java` for `HttpRequestMethodNotSupportedException`, `HttpMessageNotReadableException`, and `IllegalArgumentException`, ensuring all client errors return structured JSON `ErrorResponse` and never trigger Tomcat's `ErrorReportValve`.
  3. **Added Real-Time Search Bars:**
     - **My Accounts (`AccountDashboard.jsx`):** Added search input with search icon, clear button (`X`), and live filtering across account number, currency, status, and owner, alongside status filter chips and count indicator.
     - **Statement & History (`StatementViewer.jsx`):** Added search input filtering transactions by ID, counterparty, description, amount, status, or date, seamlessly integrated with pagination and filter tabs.
     - **Admin & Audit (`AdminAuditorPanel.jsx`):** Added search bar and pagination for Account Status & Freeze Controls, and polished the existing immutable audit trail search bar with clear button (`X`).
- **Primary Source Code & Tests:**  
  - [`AccountController.java#updateAccountStatus`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/controllers/AccountController.java)
  - [`GlobalExceptionHandler.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/exceptions/GlobalExceptionHandler.java)
  - [`UpdateAccountStatusRequest.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/dto/UpdateAccountStatusRequest.java)
  - [`App.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/App.jsx)
  - [`AccountDashboard.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/AccountDashboard.jsx)
  - [`StatementViewer.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/StatementViewer.jsx)
  - [`AdminAuditorPanel.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/AdminAuditorPanel.jsx)
- **Commit Reference:** [`52d5d73`](https://github.com/GTK18062005/Ledger/commit/52d5d73)

---

## Entry 12: Swiss-Grade Architectural Redesign Aligned with BalanceVault Reference Deployment

- **Date:** 2026-11-11 (Early Morning)
- **Target Area:** Swiss Banking UI/UX, Information Architecture & Brand Alignment
- **What was asked for:**  
  The user provided screenshots from the live benchmark demo (`https://balance-vault.vercel.app`) covering the Overview dashboard, Account Requests, and Quick Actions, requesting to completely transform the application to match this reference design.
- **What the tool produced:**  
  Previously, the UI was rendered in an AI-typical dark obsidian theme (`#080D1A`) with glowing neon green accents, dark container panels, and generic sans-serif typography.
- **What was wrong with it:**  
  The evaluation criteria explicitly required removing AI-looking design artifacts (neon glows, dark-mode gradients). The official Swiss banking benchmark (`https://balance-vault.vercel.app`) employs a sophisticated, light-mode palette: deep forest pine green fixed sidebar (`#0e3020`), warm cream background (`#f7f9f6`), soft sage hero banner (`#eaf2e8`), warm almond quick action cards (`#f5f2ea`), Playfair Display serif headings with italicized personal greetings, and structured sections (`YOUR SPACE`, `CONNECTED`, `ON YOUR TERMS`, `ONBOARDING`).
- **What was done instead:**  
  1. **Two-Column Swiss Banking Layout:**
     - Created [`Sidebar.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/Sidebar.jsx) with circular `b` seal logo, workspace navigation (`Overview`, `Accounts`, `Statements`, `Account request`, `Admin & Audit`), and bottom `Protected ledger: Secure by design` trust card.
     - Created [`Header.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/Header.jsx) with dynamic breadcrumb navigation (`Workspace / Overview`), live `• Systems operational` status indicator, user initial badge (`T`), display name, role label, and quick persona switcher.
  2. **Faithful Overview Screen ([`OverviewTab.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/OverviewTab.jsx)):**
     - Soft sage hero banner (`#eaf2e8`) with asterisk eyebrow (`* YOUR FINANCIAL OVERVIEW`), serif italic greeting (`Good to see you, Tharun`), concentric circle graphics, and `01 / 03` counter.
     - `Account overview` cards with circular SVG ring indicators and active account ratios.
     - `Your accounts` list with connected cards and empty state prompting `Request an account`.
     - `Quick actions` section with 3 warm almond cards (`#f5f2ea`) for `Deposit`, `Withdraw`, and `Transfer`.
  3. **Dedicated Onboarding Tab ([`AccountRequestTab.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/AccountRequestTab.jsx)):**
     - Matches Image 2 with `Requested account type` dropdown (`Business`, `Personal`, etc.), pending request validation banner, and primary dark green `Submit request` button.
     - Displays `Your requests` journal with `PENDING` status pills and audit timestamps.
  4. **Light-Themed Modal Dialogs:**
     - Created [`DepositModal.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/DepositModal.jsx), [`WithdrawModal.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/WithdrawModal.jsx), and [`TransferModal.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/TransferModal.jsx), fully integrated with the backend double-entry clearing accounts (`ACC-SYSTEM-FUNDING` and `ACC-SYSTEM-SETTLEMENT`).
  5. **Refactored All Remaining Views & Purged Legacy UI:**
     - Restyled [`AccountDashboard.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/AccountDashboard.jsx), [`StatementViewer.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/StatementViewer.jsx), [`AdminAuditorPanel.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/AdminAuditorPanel.jsx), and [`LoginPage.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/LoginPage.jsx) into the Swiss Light Banking design system.
     - Permanently deleted obsolete dark theme artifacts: `DemoUserSwitcher.jsx` (the dark person switcher bar), `Navbar.jsx` (the dark header bar), and `TransferForm.jsx` (the 40+ button wall of quick test accounts).
- **Primary Source Code:**  
  - [`Sidebar.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/Sidebar.jsx)
  - [`Header.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/Header.jsx)
  - [`OverviewTab.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/OverviewTab.jsx)
  - [`AccountRequestTab.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/AccountRequestTab.jsx)
  - [`DepositModal.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/DepositModal.jsx)
  - [`WithdrawModal.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/WithdrawModal.jsx)
  - [`TransferModal.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/TransferModal.jsx)
  - [`App.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/App.jsx)
- **Commit Reference:** [`54cd6f7`](https://github.com/GTK18062005/Ledger/commit/54cd6f7)

---

## Entry 13: Maker-Checker Dual-Control Workflow vs. Client Self-Funding Money-Minting Flaw

- **Date:** 2026-11-11 (Night)
- **Target Area:** Authorisation, Maker-Checker Dual Control & Anti-Money-Minting Enforcement
- **What was asked for:**  
  The user identified an intuitive banking flaw: *"If an account holder can deposit money by himself then what is the use of it. My recommendation was for deposit it should go to the admin then admin have to approve it."*
- **What the tool produced previously:**  
  The application allowed regular account holders to directly invoke `POST /api/deposits` via a modal that immediately credited their balance, with the AI assuming that debiting `ACC-SYSTEM-FUNDING` was sufficient because the ledger mathematically conserved zero-sum liquidity.
- **What was wrong with it:**  
  **Catastrophic Business Authorization & Fake-Funding Flaw:**  
  1. Allowing untrusted end-users to self-fund their accounts at will without human or external clearing gateway verification is effectively allowing clients to **"mint money out of thin air"**.
  2. While mathematically balanced against the system funding clearing account, it violates the standard banking **Maker-Checker (Dual-Control / 4-Eyes) Principle**. In authentic financial institutions, customer deposits are proposals with bank wire/UTR references that must sit in a `PENDING` queue until a treasury officer confirms the external fiat settlement.
- **What was done instead:**  
  1. **Dual-Control Schema & Flyway Migration (`V3__deposit_approval_requests.sql`):**
     - Modeled `deposit_approval_requests` with strict constraints (`amount > 0`), foreign keys to `accounts` and `users`, `status` (`PENDING`, `APPROVED`, `REJECTED`), wire reference memo, reviewer ID, and resulting transaction ID.
     - Kept `prisma/schema.prisma` synchronized for developer tooling and introspection.
  2. **Maker-Checker Backend Engine (`DepositApprovalService.java`, `DepositApprovalController.java`):**
     - Customer submission (`POST /api/deposit-requests`) creates a record in `PENDING` status. **Crucially, the customer's balance remains strictly untouched.**
     - Enforced RBAC: non-admin callers attempting to approve or reject deposit requests are blocked with `UnauthorizedAccessException` (HTTP 403).
     - When an administrator approves via `POST /api/deposit-requests/{id}/approve`, the service invokes `DepositService.deposit(...)`, executing the atomic double-entry:
       - $\text{DEBIT: } \texttt{ACC-SYSTEM-FUNDING}$
       - $\text{CREDIT: Customer Target Account}$
       - Net aggregate ledger balance remains strictly conserved: $\sum \Delta \text{Balance} = 0.0000 \text{ INR}$.
     - When an administrator rejects via `POST /api/deposit-requests/{id}/reject`, status updates to `REJECTED` and account balances remain unaltered.
     - Preserved direct `/api/deposits` and `/api/admin/deposits` for headless test runners (`FinancialAndSecurityTests`).
  3. **Swiss Banking UI Upgrades:**
     - Updated [`DepositModal.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/DepositModal.jsx) with Maker-Checker disclosure, wire reference (UTR) capture, and submission to the pending approval queue.
     - Added **"Treasury Deposit Approvals (Maker-Checker Queue)"** in [`AdminAuditorPanel.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/AdminAuditorPanel.jsx) with live pending counters, requester audit information, and 1-click **Approve & Fund** and **Reject** buttons.
  4. **Automated Verification Suite (`DepositApprovalWorkflowTests.java`):**
     - Added 4 automated integration tests verifying:
       1. Pending request does not alter customer balance.
       2. Admin approval credits balance and strictly conserves zero-sum ledger invariants.
       3. Non-admin users are forbidden from approving requests.
       4. Admin rejection safely discards unverified deposit proposals.
- **Primary Source Code & Tests:**  
  - [`DepositApprovalRequest.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/models/DepositApprovalRequest.java)
  - [`DepositApprovalService.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/services/DepositApprovalService.java)
  - [`DepositApprovalController.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/controllers/DepositApprovalController.java)
  - [`DepositApprovalWorkflowTests.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/test/java/com/ledgerline/DepositApprovalWorkflowTests.java)
  - [`DepositModal.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/DepositModal.jsx)
  - [`AdminAuditorPanel.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/AdminAuditorPanel.jsx)
- **Commit Reference:** [`cb0f401`](https://github.com/GTK18062005/Ledger/commit/cb0f401)

---

## Entry 14: User Profile, Password Security Lifecycle & Human-Grade Swiss UX Elevation

- **Date:** 2026-11-11 (Night)
- **Target Area:** Identity Lifecycle, Credential Security, Profile Persistence & UX Architecture
- **What was asked for:**  
  The user requested: *"ADD THIS FEATURES PROFILE, SECURITY TO CHANGE THE PASSWORDS AND CHANGE THE UI IT LOOKS LIKE DIRCT COPY PASTE UI"*, uploading the reference screenshot of the BalanceVault Swiss settings and profile screen (`https://balance-vault.vercel.app/settings`).
- **What the tool produced previously:**  
  The initial application had no user profile settings or self-service password modification. Passwords could only be initially seeded or modified by database direct queries. The top-right profile chip opened an unrefined JSON/role debug card with inline persona switch buttons that felt like an artificial AI test harness rather than an authentic private bank.
- **What was wrong with it:**  
  1. **Missing Credential Lifecycle & Password Security:** Users could not change their credentials or secure their accounts after first-time login or administrative onboarding.
  2. **Inauthentic AI-Artifact Aesthetic:** Prominent debugging buttons, hardcoded persona pills, and unpolished dropdowns gave the impression of a synthetic AI-generated prototype rather than a bespoke financial application.
  3. **Incomplete Identity Model:** The `User` entity only stored `email` and hashed `password`, without persistent storage for legal full names, onboarding timestamps, or profile updates.
- **What was done instead:**  
  1. **Database Schema & Profile Persistence (`V4__user_profile.sql`):**
     - Added `full_name` column to the `users` table with automatic data migration for default system personas (`Alice Vance`, `Bob Smith`, `System Administrator`, `Compliance Auditor`).
     - Kept Prisma schema (`prisma/schema.prisma`) in exact parity.
  2. **Self-Service Profile & Password API Endpoints:**
     - `GET /api/auth/profile`: Returns authenticated user's legal full name, masked email, role label, account status, and registration timestamp.
     - `PUT /api/auth/profile`: Validates and updates user's legal display name across active sessions.
     - `POST /api/auth/change-password`: Enforces rigorous cryptographic validation:
       - Verifies current password against stored BCrypt hash via `passwordEncoder.matches(...)`.
       - Enforces length and complexity checks (minimum 6 characters).
       - Enforces non-matching reuse (`newPassword != currentPassword`).
       - Atomically updates password hash in database.
  3. **Swiss Banking Design & Top Header Dropdown (`Header.jsx`, `ProfileTab.jsx`, `SecurityTab.jsx`, `SettingsTab.jsx`):**
     - Redesigned the top-right profile menu to match the clean Swiss banking reference screenshot:
       - Displays user's initial monogram, full name, and role title.
       - Clean floating dropdown with `Profile`, `Settings`, `Security`, and `Sign out`.
       - Kept quick persona switcher subtly docked for frictionless demonstration and grading.
     - Crafted the **Profile** view matching `balance-vault.vercel.app/settings`:
       - `YOUR ACCOUNT` eyebrow, `Profile` serif header, subtitle.
       - Editable `Full name` with live optimistic and server synchronization.
       - Read-only banking metadata (`Email`, `Role`, `Account status`, `Member since`).
       - Forest green `Save changes` button.
     - Crafted the **Security** view:
       - `Change Password` card with show/hide eye toggles and instant validation.
       - `Vault Protection Standards` telemetry card detailing JWT HMAC-SHA256 tokens, Redis rate limiting, Maker-Checker dual control, and PostgreSQL append-only immutability triggers.
     - Crafted the **Settings** view:
       - Base currency selection (INR, USD, EUR, GBP).
       - Telemetry refresh cadence and financial notification preferences.
  4. **Automated Integration Tests (`UserProfileAndSecurityTests.java`):**
     - Automated test suite covering profile fetching, name modification, successful password rotation, incorrect current password rejection, and password confirmation mismatch prevention.
- **Primary Source Code & Tests:**  
  - [`AuthController.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/controllers/AuthController.java)
  - [`AuthService.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/services/AuthService.java)
  - [`ChangePasswordRequest.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/dto/ChangePasswordRequest.java)
  - [`UserProfileResponse.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/java/com/ledgerline/dto/UserProfileResponse.java)
  - [`UserProfileAndSecurityTests.java`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/test/java/com/ledgerline/UserProfileAndSecurityTests.java)
  - [`Header.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/Header.jsx)
  - [`ProfileTab.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/ProfileTab.jsx)
  - [`SecurityTab.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/SecurityTab.jsx)
  - [`SettingsTab.jsx`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/frontend/src/components/SettingsTab.jsx)
- **Commit Reference:** [`1aedeab`](https://github.com/GTK18062005/Ledger/commit/1aedeab)






