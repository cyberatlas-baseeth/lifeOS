-- =====================================================
-- Migration: Add 'shopping' tag to expenses
-- Run this in Supabase SQL Editor if you have constraints
-- =====================================================

-- If you have a tag constraint, update it:
-- ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_tag_check;
-- ALTER TABLE expenses ADD CONSTRAINT expenses_tag_check 
--   CHECK (tag IN ('rent', 'bills', 'lifestyle', 'shopping', 'family_support'));

-- Note: The tag field is TEXT without constraint by default
-- New 'shopping' records will work immediately after code deployment
-- No migration needed for existing data
