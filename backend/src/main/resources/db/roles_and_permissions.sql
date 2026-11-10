-- ==============================================================================
-- BalanceVault / LedgerLine: Database Roles & Least-Privilege Access Control
-- ==============================================================================
-- This script provisions three distinct database roles to enforce separation of
-- duties and prevent runtime tampering with historical financial postings.
--
-- Roles:
-- 1. balancevault_migrator  : Full DDL permissions for Flyway migrations.
-- 2. balancevault_app       : Least-privilege runtime application user.
--                             CRITICAL: Append-only permissions on ledger_entries
--                             and transactions. UPDATE and DELETE are revoked!
-- 3. balancevault_auditor   : Read-only access for compliance and audit teams.
-- ==============================================================================

-- 1. Create Roles (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'balancevault_migrator') THEN
        CREATE ROLE balancevault_migrator WITH LOGIN PASSWORD 'ChangeMeInProd_Migrator987!';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'balancevault_app') THEN
        CREATE ROLE balancevault_app WITH LOGIN PASSWORD 'ChangeMeInProd_AppUser456!';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'balancevault_auditor') THEN
        CREATE ROLE balancevault_auditor WITH LOGIN PASSWORD 'ChangeMeInProd_Auditor123!';
    END IF;
END
$$;

-- 2. Schema Permissions
GRANT USAGE, CREATE ON SCHEMA public TO balancevault_migrator;
GRANT USAGE ON SCHEMA public TO balancevault_app;
GRANT USAGE ON SCHEMA public TO balancevault_auditor;

-- 3. Migrator Role (Full DDL & Migration History Management)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO balancevault_migrator;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO balancevault_migrator;

-- 4. Application Runtime Role (Least-Privilege & Append-Only Financial Enforcement)
-- Tables with standard CRUD: users, accounts, idempotency_records, audit_logs
GRANT SELECT, INSERT, UPDATE ON users TO balancevault_app;
GRANT SELECT, INSERT, UPDATE ON accounts TO balancevault_app;
GRANT SELECT, INSERT, UPDATE ON idempotency_records TO balancevault_app;
GRANT SELECT, INSERT, UPDATE ON audit_logs TO balancevault_app;

-- FINANCIAL TABLES: Strictly Append-Only (NO UPDATE, NO DELETE)
-- Even if an attacker gains full SQL injection into the application runtime,
-- PostgreSQL engine privileges prevent mutating or deleting historical postings!
GRANT SELECT, INSERT ON transactions TO balancevault_app;
REVOKE UPDATE, DELETE, TRUNCATE ON transactions FROM balancevault_app;

GRANT SELECT, INSERT ON ledger_entries TO balancevault_app;
REVOKE UPDATE, DELETE, TRUNCATE ON ledger_entries FROM balancevault_app;

-- 5. Auditor Role (Strictly Read-Only)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO balancevault_auditor;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM balancevault_auditor;

-- 6. Verification Queries (Run as Superuser to inspect privileges)
-- SELECT grantee, table_name, privilege_type 
-- FROM information_schema.role_table_grants 
-- WHERE grantee IN ('balancevault_app', 'balancevault_auditor')
-- ORDER BY table_name, privilege_type;
