-- =====================================================
-- Migration: Add Tag-Based Expense System
-- Run this in Supabase SQL Editor to migrate existing data
-- =====================================================

-- Step 1: Add new tag column
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tag TEXT DEFAULT 'lifestyle';

-- Step 2: Migrate existing data based on category
-- fixed -> rent, variable -> lifestyle
UPDATE expenses 
SET tag = CASE 
    WHEN category = 'fixed' THEN 'rent'
    ELSE 'lifestyle'
END
WHERE tag IS NULL OR tag = 'lifestyle';

-- Step 3: Add constraint for tag field (optional)
-- ALTER TABLE expenses ADD CONSTRAINT expenses_tag_check CHECK (tag IN ('rent', 'bills', 'lifestyle'));

-- =====================================================
-- Verification Query
-- Run to verify migration was successful
-- =====================================================
-- SELECT id, date, tag, amount_try, category FROM expenses LIMIT 10;
