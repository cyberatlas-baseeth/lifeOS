-- Migration: Add target_assets table
-- Run this in Supabase SQL Editor

CREATE TABLE target_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    target_value_try NUMERIC NOT NULL,
    target_value_usd NUMERIC NOT NULL,
    exchange_rate_usd_try NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for wallet-based queries
CREATE INDEX idx_target_assets_wallet ON target_assets(wallet_address);
