-- LedgerLine V3: Deposit Approval Requests (Maker-Checker / Separation of Duties)
-- Enforces Dual-Control Authorization: Customers propose deposit requests; Admins verify & fund.

CREATE TABLE IF NOT EXISTS deposit_approval_requests (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id),
    user_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(19, 4) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    reference_memo VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    reviewed_by UUID REFERENCES users(id),
    admin_notes VARCHAR(500),
    transaction_id UUID REFERENCES transactions(id),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_deposit_approval_amount_positive CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_dep_approval_status ON deposit_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_dep_approval_user ON deposit_approval_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dep_approval_account ON deposit_approval_requests(account_id);
CREATE INDEX IF NOT EXISTS idx_dep_approval_created ON deposit_approval_requests(created_at);
