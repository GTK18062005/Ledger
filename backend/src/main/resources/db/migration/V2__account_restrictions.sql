-- LedgerLine V2: Account Restrictions & Admin Reason Support
-- Extends V1 schema to enforce FROZEN status and admin adjustment auditing.
-- Compatible with both fresh installations (after V1) and V1 → V2 upgrades.

-- Add admin_reason column to transactions for ADMIN-initiated adjustments
-- Only populated when an admin performs an adjustment; NULL for normal operations
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS admin_reason VARCHAR(500);

-- Note: FROZEN account enforcement is handled at the application layer.
-- The 'status' column in accounts already supports VARCHAR(32) with DEFAULT 'ACTIVE',
-- so the FROZEN value is immediately usable without schema changes.
-- This migration documents the semantics:
--   ACTIVE    → Full financial operations permitted
--   FROZEN    → Financial operations blocked (by regulation or admin); read-only
--   SUSPENDED → Administrative hold; all operations blocked
--   CLOSED    → Account permanently closed; no operations permitted
COMMENT ON COLUMN accounts.status IS 'Account lifecycle state: ACTIVE, FROZEN, SUSPENDED, or CLOSED';

-- Index for quick lookup of non-active accounts (useful for admin dashboards)
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status) WHERE status <> 'ACTIVE';

