-- =====================================================
-- Migration: Add Claim-Based Investment Lifecycle
-- Run this in Supabase SQL Editor to migrate existing data
-- =====================================================

-- Step 1: Add new columns to investments table
ALTER TABLE investments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE investments ADD COLUMN IF NOT EXISTS invested_try DECIMAL(15,2);
ALTER TABLE investments ADD COLUMN IF NOT EXISTS invested_usd DECIMAL(15,2);
ALTER TABLE investments ADD COLUMN IF NOT EXISTS realized_pl_try DECIMAL(15,2);
ALTER TABLE investments ADD COLUMN IF NOT EXISTS realized_pl_usd DECIMAL(15,2);
ALTER TABLE investments ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS exchange_rate_usd_try DECIMAL(10,4);
ALTER TABLE investments ADD COLUMN IF NOT EXISTS exchange_rate_date DATE;

-- Step 2: Migrate existing data
-- Copy amount values to invested_try/invested_usd
UPDATE investments 
SET invested_try = COALESCE(amount_try, amount, 0),
    invested_usd = COALESCE(amount_usd, 0)
WHERE invested_try IS NULL;

-- Set all existing records to 'active' status
UPDATE investments SET status = 'active' WHERE status IS NULL;

-- Step 3: Add constraint for status field
-- Note: Run this separately if constraint already exists
-- ALTER TABLE investments ADD CONSTRAINT investments_status_check CHECK (status IN ('active', 'claimed'));

-- Step 4: Optionally drop old columns (CAUTION - backup first!)
-- Only run after confirming migration is successful
-- ALTER TABLE investments DROP COLUMN IF EXISTS amount;
-- ALTER TABLE investments DROP COLUMN IF EXISTS amount_try;
-- ALTER TABLE investments DROP COLUMN IF EXISTS amount_usd;
-- ALTER TABLE investments DROP COLUMN IF EXISTS profit_loss;
-- ALTER TABLE investments DROP COLUMN IF EXISTS profit_loss_try;
-- ALTER TABLE investments DROP COLUMN IF EXISTS profit_loss_usd;
-- ALTER TABLE investments DROP COLUMN IF EXISTS notes;

-- =====================================================
-- Verification Query
-- Run to verify migration was successful
-- =====================================================
-- SELECT id, investment_type, invested_try, invested_usd, status, realized_pl_try, claimed_at FROM investments LIMIT 10;
