# BalanceVault (formerly LedgerLine)
### Mission-Critical Financial Ledger & Double-Entry Transfer Engine

BalanceVault is an enterprise-grade, high-integrity financial ledger and money transfer engine engineered for strictly provable double-entry accounting, distributed exactly-once idempotency, adversarial race-condition resistance, multi-tier Redis rate limiting, and append-only cryptographic immutability.

---

## 🏛️ System Architecture & Financial Invariants

```
                             [ React 18 + Vite SPA ]
                             (Swiss-Nordic Dark UI)
                                        │
                         HTTP / JSON    │  Reverse Proxy
                        (Idempotency)   ▼
                         [ Nginx Edge Proxy ]
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                                                         ▼
[ Spring Boot 3.3.4 Engine ]                               [ Spring Actuator ]
(Pessimistic Lexicographical Locking)                     (/actuator/health & /api/health)
           │                                                         │
           ├─── Sliding-Window Quota ──────► [ Redis 7 Cache ]       │
           │                                 (15 / 30 / 120 rpm)     │
           │                                                         │
           ├─── Double-Entry Invariant ──────────────────────────────┘
           │    (SUM(Balances) == 0.0000 INR)
           ▼
[ PostgreSQL 16/18 Relational Core ]
  ├── accounts (CHECK balance >= 0)
  ├── transactions (COMPLETED, REFUSED)
  ├── ledger_entries (Append-Only, PL/pgSQL Triggers)
  ├── idempotency_records (PRIMARY KEY, SHA-256 Hash)
  └── audit_logs (REQUIRES_NEW Autonomous Audit Trail)
```

### 1. Conservation of Money Invariant (Strict Double-Entry)
- **Net-Zero Journaling:** Every financial transaction creates balanced ledger postings:
  - **Peer-to-Peer Transfer:** DEBIT Source, CREDIT Destination.
  - **External Deposit:** DEBIT `ACC-SYSTEM-FUNDING` clearing vault, CREDIT Customer Account.
  - **External Withdrawal:** DEBIT Customer Account, CREDIT `ACC-SYSTEM-SETTLEMENT` clearing vault.
  - Invariant: $\sum \text{Debits} = \sum \text{Credits}$ across every completed operation.
- **System Conservation Invariant:**
  $$\sum_{\text{all accounts}} \text{balance} \equiv 0.0000 \text{ INR}$$
- **Database Engine Check:** Unbypassable constraint prevents negative customer balances:
  ```sql
  CONSTRAINT chk_account_balance_non_negative CHECK (balance >= 0);
  ```

### 2. Concurrency Safety & Deadlock-Free Lexicographical Locking
- **Adversarial Race Condition Defense:** Balance modifications execute exclusively under `PESSIMISTIC_WRITE` row locks (`SELECT ... FOR UPDATE`).
- **Deterministic Lock Ordering:** To eliminate deadlock cycles, accounts are sorted lexicographically by UUID before lock acquisition:
  $$\text{Lock Order} = [\min(\text{UUID}_A, \text{UUID}_B), \max(\text{UUID}_A, \text{UUID}_B)]$$
  Bidirectional racing transfers ($A \rightarrow B$ and $B \rightarrow A$) acquire locks in identical sequence, mathematically preventing database deadlocks.
- **Lock-Guarded Balance Checks:** Balance availability is checked strictly after acquiring the exclusive row lock. Insufficient funds trigger an immutable audit refusal with zero ledger modifications.

### 3. Distributed Idempotency (Exactly-Once Semantics & Crash Recovery)
- Every financial write endpoint (`/api/transfers`, `/api/withdrawals`, `/api/deposits`) requires an `Idempotency-Key` UUID header.
- **Atomic Reservation:** Incoming keys claim an `IN_PROGRESS` row in `idempotency_records` using database primary key uniqueness (`SQLState 23505`).
- **SHA-256 Fingerprint Guard:** Validates request payload against stored `request_hash`. Key reuse with altered amounts/destinations returns **HTTP 409 Conflict**.
- **Crash Recovery Window:** If the application crashes after financial commit but before caching the response, retries query `TransactionRepository`, reconstruct the original receipt, and return it without re-executing debits or credits.

### 4. Distributed Redis Sliding-Window Rate Limiting
- Enforced by `RateLimitingFilter` and backed by distributed Redis (with resilient in-memory fallback):
  - **`AUTH` endpoints:** 15 requests/minute (brute-force defense).
  - **`FINANCIAL` endpoints:** 30 mutations/minute (lock contention throttling).
  - **`GENERAL` endpoints:** 120 queries/minute (resource conservation).
- Standard RFC compliance headers: `Retry-After: <sec>`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Category`.

### 5. Role-Based Access Control (RBAC) & IDOR Protection
- **`ACCOUNT_HOLDER`:** Operates only on owned vaults (`sourceAccount.ownerId == authenticatedUser.id`). Blocked from touching system clearing accounts or other users' vaults.
- **`ADMIN`:** Can provision accounts, freeze/suspend accounts with mandatory audited reason (`adminReason`), view system aggregate liquidity, and review audit logs. Prohibited from moving customer funds.
- **`AUDITOR`:** Strictly read-only access across all accounts, statements, and refusal records. All mutation endpoints blocked.

---

## 🚀 Getting Started & Deployment

### Prerequisites
- Docker Engine & Docker Compose
- Java 21+ and Maven 3.9+ (for native local execution)
- Node.js 20+ (for frontend development)

### Quick Start with Docker Compose
```bash
# Clone the repository
git clone https://github.com/GTK18062005/Ledger.git
cd Ledger

# Deploy the complete cluster (PostgreSQL, Redis, Backend, Frontend)
docker compose up -d --build
```

The system will start with:
- **Frontend SPA (Nginx):** `http://localhost` (or `http://localhost:3000`)
- **Backend API:** `http://localhost:8080/api`
- **System Health Probe:** `http://localhost:8080/api/health`
- **Spring Actuator Health:** `http://localhost:8080/actuator/health`
- **PostgreSQL 16:** `localhost:5432` (`balancevault`)
- **Redis 7:** `localhost:6379`

### First-Admin Production Bootstrap
In production, demo accounts are never seeded. Bootstrap the root administrator:
```bash
# Windows
bootstrap-admin.bat

# Linux / macOS
chmod +x bootstrap-admin.sh
./bootstrap-admin.sh
```
Or via REST API:
```bash
curl -X POST http://localhost:8080/api/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@balancevault.io",
    "password": "SecureAdminPassword123!",
    "fullName": "Root Administrator",
    "bootstrapSecret": "SuperSecretBootstrapMasterToken2026!"
  }'
```
*Note: The bootstrap endpoint permanently locks out once the first administrator is created.*

---

## 🔑 Demo Personas (Development & Testing)

In `dev` and `test` profiles, `DataSeeder` provisions baseline test accounts:

| Role | Email | Password | Primary Vault Account |
| :--- | :--- | :--- | :--- |
| **`ADMIN`** | `admin@ledgerline.io` | `Password123!` | System Clearing Supervisor |
| **`ACCOUNT_HOLDER`** | `alice@ledgerline.io` | `Password123!` | `ACC-ALICE-1001` (₹10,000.0000 INR) |
| **`ACCOUNT_HOLDER`** | `bob@ledgerline.io` | `Password123!` | `ACC-BOB-2002` (₹5,000.0000 INR) |
| **`AUDITOR`** | `auditor@ledgerline.io` | `Password123!` | Read-Only Compliance Auditor |

---

## 🧪 Automated Test Suite (46 / 46 Passing)

Execute the full suite of unit, integration, concurrency, and PostgreSQL container tests:
```powershell
cd backend
$env:JAVA_HOME = "D:\Program Files\Java\jdk-23"
mvn test "-Dspring.profiles.active=test"
```

### Verified Test Matrix
1. **`ConcurrencyAndIntegrityTests` (7 Tests - PASS):** 20 parallel threads overdraft prevention, 10-thread idempotent replay, IDOR tenant isolation, 50-thread zero-sum random transfers, bidirectional deadlock-free transfers, concurrent double-entry deposits & withdrawals.
2. **`FinancialAndSecurityTests` (10 Tests - PASS):** Strict double-entry deposit & withdrawal balancing, 409 conflict on key reuse with altered payload, mandatory key enforcement, auditor write blocking, admin transfer blocking, refusal persistence in audit logs, JPA immutability hooks, balance reconciliation against ledger, crash recovery without re-execution.
3. **`ProductionRestrictionsTests` (13 Tests - PASS):** FROZEN source/dest blocks, FROZEN withdrawal/deposit blocks, SUSPENDED blocks, frozen refusal audit logging, system account exfiltration blocks (transfer, debit, credit), cross-currency transfer validation, active account baseline.
4. **`RateLimiterTests` (3 Tests - PASS):** Sliding-window quota conformance, HTTP 429 rejection with `Retry-After`, multi-tenant client IP and category isolation.
5. **`UserOnboardingAndAdminBootstrapTests` (7 Tests - PASS):** KYC user onboarding and primary account auto-provisioning, first-admin creation with master secret, rejection of invalid secret, permanent lockout when admin exists, mandatory audited reason for account freeze, secondary currency account opening, deployment health check zero-sum verification.
6. **`PostgreSqlIntegrationTests` (6 Tests - PASS against Native PostgreSQL 18):** Flyway V1 & V2 migration validation, native PostgreSQL row locking with concurrent overdraft blocking, bidirectional deadlock-free transfers, native primary key unique idempotency constraint, PL/pgSQL append-only immutability triggers, crash recovery verification.

---

## 🔒 Security & Least-Privilege Architecture

- **PostgreSQL Database Roles (`roles_and_permissions.sql`):**
  - `balancevault_migrator`: Dedicated DDL role for Flyway migrations.
  - `balancevault_app`: Minimal runtime DML role with `REVOKE UPDATE, DELETE ON ledger_entries, transactions`.
  - `balancevault_auditor`: Strictly read-only `SELECT` access.
- **Fail-Safe Startup:** Fails context initialization if `JWT_SECRET` is missing in production profile.
- **Zero Insecure Defaults:** Demo data seeder and H2 console are disabled outside development profiles.
- **Prisma Schema:** `prisma/schema.prisma` is provided for teams using Prisma ORM to inspect and interact with the database.

---

## 📄 Deliverables & References
- **Adversarial Threat Model:** [`THREATS.md`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/THREATS.md)
- **AI Prompt & Decision Log:** [`PROMPTS.md`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/PROMPTS.md)
- **Database Least-Privilege Script:** [`roles_and_permissions.sql`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/backend/src/main/resources/db/roles_and_permissions.sql)
- **Prisma Schema Definition:** [`schema.prisma`](file:///c:/Users/tharu/OneDrive/Desktop/snovasys/prisma/schema.prisma)
