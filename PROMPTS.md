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
