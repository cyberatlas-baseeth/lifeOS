-- Migration: Add new columns to health_metrics table for 7-category scoring system
-- Run this migration in Supabase SQL Editor

-- Sleep Timing & Regularity
ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS bedtime TEXT;
ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS sleep_regularity TEXT;

-- Mental State (merged from psychology_metrics)
ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS stress_level TEXT;
ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS motivation_level TEXT;
ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS mental_fatigue TEXT;

-- Extras
ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS alcohol_units TEXT;
ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS smoking BOOLEAN;
ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS screen_time TEXT;

-- Note: The psychology_metrics table is kept for historical data
-- but the Psychology page has been removed from the application
