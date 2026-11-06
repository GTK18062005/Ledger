# LedgerLine: Mission-Critical Financial Ledger & Transfer Engine

LedgerLine is an enterprise-grade, high-integrity concurrent financial ledger and transfer engine engineered for strictly provable double-entry accounting, distributed exactly-once idempotency, adversarial race-condition resistance, and append-only immutability.

---

## 🏛️ System Architecture & Core Invariants

### 1. Conservation of Money Invariant (Strict Double-Entry)
- **Net-Zero Journaling:** Every internal transfer creates exactly one `Transaction` record and two atomic `LedgerEntry` rows:
  - **DEBIT** on the source account (`amount`, `running_balance_after = balance - amount`)
  - **CREDIT** on the destination account (`amount`, `running_balance_after = balance + amount`)
  - $\sum \text{Delta} = 0$: Money is never created or destroyed.
- **Database Engine Check:** Accounts feature an unbypassable engine-level constraint:
  ```sql
  CONSTRAINT chk_account_balance_non_negative CHECK (balance >= 0)
  ```

### 2. Concurrency Safety & Deadlock-Free Deterministic Locking
- **Adversarial Race Condition Defense:** Account balances are read and updated exclusively under `PESSIMISTIC_WRITE` row locks (`SELECT ... FOR UPDATE`).
- **Deadlock-Free Deterministic Ordering:** When transferring funds between two accounts $A$ and $B$, the system sorts their UUIDs lexicographically:
  $$\text{Lock Order} = [\min(UUID_A, UUID_B), \max(UUID_A, UUID_B)]$$
  Even if concurrent reverse transfers ($A \rightarrow B$ and $B \rightarrow A$) fire in identical milliseconds, they acquire row locks in the exact same order, mathematically eliminating database deadlocks.
- **Lock-Guarded Balance Checks:** Account balance verification is executed strictly **after** the pessimistic lock is held. If funds are insufficient, the transfer is refused, the account balance is untouched, and a `REFUSED` ledger journal entry is committed.

### 3. Distributed Idempotency (Exactly-Once Semantics)
- Every fund-movement endpoint (`/api/transfers`, `/api/withdrawals`, `/api/deposits`) requires an `Idempotency-Key` header (UUID).
- **Idempotency Lifecycle Table:** `idempotency_records` (`idempotency_key`, `user_id`, `request_hash`, `status`, `response_body`, `created_at`).
  1. Incoming requests attempt atomic reservation with status `IN_PROGRESS`.
  2. If replayed after completion (`COMPLETED`), the cached HTTP 200 JSON payload is returned immediately without executing balance logic.
  3. If duplicate requests race concurrently in the same millisecond, waiting threads synchronize on key completion, ensuring exactly **one** execution occurs while all callers receive identical responses.

### 4. Append-Only Statements & Immutability Triggers
- Ledger entries and transactions are provably immutable.
- **PostgreSQL Database Triggers:**
  ```sql
  CREATE OR REPLACE FUNCTION prevent_ledger_modification()
  RETURNS TRIGGER AS $$
  BEGIN
      RAISE EXCEPTION 'CRITICAL INTEGRITY VIOLATION: Ledger entries and transactions are strictly append-only. UPDATE and DELETE are prohibited.';
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trg_no_update_delete_ledger
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();
  ```
- **Provable Statements:** `GET /api/accounts/{id}/statement` returns a complete chronological sequence of DEBITs, CREDITs, and REFUSED overdraw attempts with running balances and failure reasons.

### 5. Role-Based Access Control (RBAC) & IDOR Protection
- **`ADMIN`:** Can provision accounts, assign legal ownership to users, inspect aggregate system liquidity, and review audit logs. Cannot move funds from accounts they do not own.
- **`ACCOUNT_HOLDER`:** Can view only their owned accounts and statements. Can transfer, deposit, and withdraw **only** from accounts where `sourceAccount.ownerId == authenticatedUser.id`. Any attempt to move funds from another user's account triggers an IDOR violation and returns `403 Forbidden`.
- **`AUDITOR`:** Strictly read-only access across all accounts, transaction logs, and refusal records. All write endpoints (`POST /api/transfers`, `POST /api/accounts`, etc.) are blocked by Spring Security.

---

## 🛠️ Tech Stack
- **Backend:** Spring Boot 3.3.4 (Java 21/23), Spring Data JPA, Spring Security 6 (Stateless JWT), Maven.
- **Database:** PostgreSQL (production profile) + H2 in PostgreSQL compatibility mode (`MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH`) for sub-second integration testing.
- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons.

---

## 🚀 Seed Credentials (Auto-Populated)

| Role | Email | Password | Initial Vault Accounts |
| :--- | :--- | :--- | :--- |
| **`ADMIN`** | `admin@ledgerline.io` | `Password123!` | System Supervisor |
| **`ACCOUNT_HOLDER`** | `alice@ledgerline.io` | `Password123!` | `ACC-ALICE-1001` (₹10,000.00) |
| **`ACCOUNT_HOLDER`** | `bob@ledgerline.io` | `Password123!` | `ACC-BOB-2002` (₹5,000.00) |
| **`AUDITOR`** | `auditor@ledgerline.io` | `Password123!` | System Auditor (Read-Only) |

---

## 🧪 Multi-Threaded Concurrency Test Suite

All tests are verified and automated under JUnit 5 (`ConcurrencyAndIntegrityTests.java`):

1. **`testConcurrentWithdrawalsCannotOverdraw()`**
   - 20 parallel racing threads attempt to withdraw ₹10 each from an account with exactly ₹100.
   - **Result:** Exactly 10 succeed, exactly 10 are recorded as `REFUSED` with `INSUFFICIENT_FUNDS`, final balance is ₹0.00, database `CHECK (balance >= 0)` constraint is never breached.
2. **`testIdempotentReplayReturnsSameResponse()`**
   - 10 concurrent racing requests fired with the identical `Idempotency-Key`.
   - **Result:** Transfer executes exactly once, source balance decreases exactly once, and all 10 threads receive identical transaction payloads.
3. **`testTenantIsolationAndIDOR()`**
   - An authenticated account holder attempts to transfer money from an account owned by another user.
   - **Result:** Intercepted with `403 Forbidden` and logged in the immutable `audit_logs` security trail.
4. **`testZeroSumConservation()`**
   - 50 random concurrent transfers across 5 accounts under high thread contention.
   - **Result:** $\sum \text{Balances}_{\text{before}} = \sum \text{Balances}_{\text{after}}$. Zero-sum conservation invariant preserved.

---

## 💻 Running the Application

### 1. Run Backend
```powershell
cd backend
mvn spring-boot:run
```
Backend runs on `http://localhost:8080`.

### 2. Run Integration Tests
```powershell
cd backend
mvn test
```

### 3. Run Frontend
```powershell
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.
