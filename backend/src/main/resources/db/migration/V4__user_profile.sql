-- LedgerLine V4: User Profile & Security Attributes
-- Adds full_name and profile metadata for authenticated users

ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Seed natural names for default accounts
UPDATE users SET full_name = 'Tharun Kumar Gangavarapu' WHERE email LIKE '%tharun%' OR email = 'admin@ledgerline.io';
UPDATE users SET full_name = 'Alice Vance' WHERE email LIKE '%alice%';
UPDATE users SET full_name = 'Bob Smith' WHERE email LIKE '%bob%';
UPDATE users SET full_name = 'Auditor General' WHERE role = 'AUDITOR' AND (full_name IS NULL OR full_name = '');
UPDATE users SET full_name = 'Administrator' WHERE role = 'ADMIN' AND (full_name IS NULL OR full_name = '');
