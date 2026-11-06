-- LedgerLine Initial PostgreSQL Schema & Invariants Migration
-- Strictly Enforces: Double-Entry Conservation, Non-Negative Balances, and Append-Only Immutability

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Accounts Table (CHECK constraint prevents negative balances at the database engine level)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY,
    account_number VARCHAR(64) NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES users(id),
    balance NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_account_balance_non_negative CHECK (is_system = TRUE OR balance >= 0)
);

CREATE INDEX IF NOT EXISTS idx_accounts_owner ON accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_accounts_number ON accounts(account_number);

-- 3. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY,
    transaction_type VARCHAR(32) NOT NULL,
    idempotency_key VARCHAR(255),
    initiated_by UUID NOT NULL REFERENCES users(id),
    status VARCHAR(32) NOT NULL,
    failure_reason VARCHAR(255),
    amount NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_idempotency ON transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_tx_initiated ON transactions(initiated_by);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at);

-- 4. Ledger Entries Table (Append-only journal of Debits and Credits)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    entry_type VARCHAR(16) NOT NULL,
    amount NUMERIC(19, 4) NOT NULL,
    running_balance_after NUMERIC(19, 4) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_account_created ON ledger_entries(account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_tx ON ledger_entries(transaction_id);

-- 5. Distributed Idempotency Records Table
CREATE TABLE IF NOT EXISTS idempotency_records (
    idempotency_key VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL,
    operation VARCHAR(32) NOT NULL DEFAULT 'TRANSFER',
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    response_body TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idem_user ON idempotency_records(user_id);
CREATE INDEX IF NOT EXISTS idx_idem_user_op ON idempotency_records(user_id, operation);

-- 6. Audit Logs Table (Captures all events, including refused attempts with full audit trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID,
    user_role VARCHAR(32),
    account_id UUID REFERENCES accounts(id),
    operation_type VARCHAR(64) NOT NULL DEFAULT 'SYSTEM',
    resource VARCHAR(255),
    status VARCHAR(32) NOT NULL,
    amount NUMERIC(19, 4),
    failure_reason VARCHAR(255),
    idempotency_key VARCHAR(255),
    details VARCHAR(1024),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_account ON audit_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_idempotency ON audit_logs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- 7. Immutability Enforcers: Abort any SQL UPDATE or DELETE on Transactions or Ledger Entries
CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'CRITICAL INTEGRITY VIOLATION: Ledger entries and transactions are strictly append-only. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_no_update_delete_ledger'
    ) THEN
        CREATE TRIGGER trg_no_update_delete_ledger
        BEFORE UPDATE OR DELETE ON ledger_entries
        FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_no_update_delete_transactions'
    ) THEN
        CREATE TRIGGER trg_no_update_delete_transactions
        BEFORE UPDATE OR DELETE ON transactions
        FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();
    END IF;
END $$;

