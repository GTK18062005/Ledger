-- BalanceVault V5: Persisted Account Opening Requests (Maker-Checker Onboarding)
-- Customers propose new account requests; Administrators review and approve/reject to open real vaults.

CREATE TABLE IF NOT EXISTS account_opening_requests (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    account_type VARCHAR(64) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    reason VARCHAR(500),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    reviewed_by UUID REFERENCES users(id),
    admin_notes VARCHAR(500),
    created_account_id UUID REFERENCES accounts(id),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acc_req_status ON account_opening_requests(status);
CREATE INDEX IF NOT EXISTS idx_acc_req_user ON account_opening_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_acc_req_created ON account_opening_requests(created_at);

