-- =====================================================
-- LifeOS Database Schema for Supabase (MetaMask Auth)
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Drop existing tables if migrating (CAUTION: This will delete all data)
-- Uncomment these lines only if you want to reset the database
-- DROP TABLE IF EXISTS investments CASCADE;
-- DROP TABLE IF EXISTS expenses CASCADE;
-- DROP TABLE IF EXISTS income CASCADE;
-- DROP TABLE IF EXISTS net_worth CASCADE;
-- DROP TABLE IF EXISTS psychology_metrics CASCADE;
-- DROP TABLE IF EXISTS health_metrics CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;
-- DROP TABLE IF EXISTS wallet_nonces CASCADE;

-- Wallet nonces for signature verification
CREATE TABLE IF NOT EXISTS wallet_nonces (
  wallet_address TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users profile (linked to wallet address)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health Metrics
CREATE TABLE IF NOT EXISTS health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sleep_hours DECIMAL(4,2) CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
  activity_level INTEGER CHECK (activity_level BETWEEN 1 AND 10),
  health_score INTEGER CHECK (health_score BETWEEN 0 AND 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallet_address, date)
);

-- Psychology Metrics
CREATE TABLE IF NOT EXISTS psychology_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood INTEGER CHECK (mood BETWEEN 1 AND 10),
  stress INTEGER CHECK (stress BETWEEN 1 AND 10),
  motivation INTEGER CHECK (motivation BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallet_address, date)
);

-- Net Worth (Money)
CREATE TABLE IF NOT EXISTS net_worth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_assets DECIMAL(15,2) DEFAULT 0,
  cash DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallet_address, date)
);

-- Income
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL CHECK (category IN ('regular', 'additional')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL CHECK (category IN ('fixed', 'variable')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Investments (Claim-Based Lifecycle)
-- Active investments = locked capital (negative to net worth)
-- Claimed investments = realized returns (principal + P/L added to net worth)
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  investment_type TEXT NOT NULL,
  -- Invested amount (locked capital)
  invested_try DECIMAL(15,2) NOT NULL,
  invested_usd DECIMAL(15,2) NOT NULL,
  -- Lifecycle status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'claimed')),
  -- Only set when claimed
  realized_pl_try DECIMAL(15,2),
  realized_pl_usd DECIMAL(15,2),
  claimed_at TIMESTAMPTZ,
  -- Exchange rate at creation
  exchange_rate_usd_try DECIMAL(10,4),
  exchange_rate_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_wallet_date ON health_metrics(wallet_address, date DESC);
CREATE INDEX IF NOT EXISTS idx_psychology_wallet_date ON psychology_metrics(wallet_address, date DESC);
CREATE INDEX IF NOT EXISTS idx_networth_wallet_date ON net_worth(wallet_address, date DESC);
CREATE INDEX IF NOT EXISTS idx_income_wallet_date ON income(wallet_address, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_wallet_date ON expenses(wallet_address, date DESC);
CREATE INDEX IF NOT EXISTS idx_investments_wallet_date ON investments(wallet_address, date DESC);

-- =====================================================
-- Row Level Security Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE wallet_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychology_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_worth ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- For wallet auth, we'll use anon key with service role for nonce management
-- Public access for wallet nonces (needed for auth flow)
CREATE POLICY "Anyone can read nonces" ON wallet_nonces
  FOR SELECT USING (true);
CREATE POLICY "Anyone can insert nonces" ON wallet_nonces
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update nonces" ON wallet_nonces
  FOR UPDATE USING (true);

-- Profiles - public insert for registration, select/update by wallet
CREATE POLICY "Anyone can create profile" ON profiles
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view profiles" ON profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (true);

-- For metric tables, we'll validate wallet ownership in the application layer
-- Since we're not using Supabase Auth, we allow authenticated operations
-- The API routes will validate the wallet signature

-- Health Metrics policies
CREATE POLICY "Public read health data" ON health_metrics FOR SELECT USING (true);
CREATE POLICY "Public insert health data" ON health_metrics FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update health data" ON health_metrics FOR UPDATE USING (true);
CREATE POLICY "Public delete health data" ON health_metrics FOR DELETE USING (true);

-- Psychology Metrics policies
CREATE POLICY "Public read psychology data" ON psychology_metrics FOR SELECT USING (true);
CREATE POLICY "Public insert psychology data" ON psychology_metrics FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update psychology data" ON psychology_metrics FOR UPDATE USING (true);
CREATE POLICY "Public delete psychology data" ON psychology_metrics FOR DELETE USING (true);

-- Net Worth policies
CREATE POLICY "Public read net worth data" ON net_worth FOR SELECT USING (true);
CREATE POLICY "Public insert net worth data" ON net_worth FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update net worth data" ON net_worth FOR UPDATE USING (true);
CREATE POLICY "Public delete net worth data" ON net_worth FOR DELETE USING (true);

-- Income policies
CREATE POLICY "Public read income data" ON income FOR SELECT USING (true);
CREATE POLICY "Public insert income data" ON income FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update income data" ON income FOR UPDATE USING (true);
CREATE POLICY "Public delete income data" ON income FOR DELETE USING (true);

-- Expenses policies
CREATE POLICY "Public read expenses data" ON expenses FOR SELECT USING (true);
CREATE POLICY "Public insert expenses data" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update expenses data" ON expenses FOR UPDATE USING (true);
CREATE POLICY "Public delete expenses data" ON expenses FOR DELETE USING (true);

-- Investments policies
CREATE POLICY "Public read investments data" ON investments FOR SELECT USING (true);
CREATE POLICY "Public insert investments data" ON investments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update investments data" ON investments FOR UPDATE USING (true);
CREATE POLICY "Public delete investments data" ON investments FOR DELETE USING (true);

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to generate random nonce
CREATE OR REPLACE FUNCTION generate_nonce()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to get or create nonce for wallet
CREATE OR REPLACE FUNCTION get_or_create_nonce(p_wallet_address TEXT)
RETURNS TEXT AS $$
DECLARE
  v_nonce TEXT;
BEGIN
  -- Try to get existing nonce
  SELECT nonce INTO v_nonce FROM wallet_nonces WHERE wallet_address = LOWER(p_wallet_address);
  
  IF v_nonce IS NULL THEN
    -- Create new nonce
    v_nonce := generate_nonce();
    INSERT INTO wallet_nonces (wallet_address, nonce) 
    VALUES (LOWER(p_wallet_address), v_nonce);
  END IF;
  
  RETURN v_nonce;
END;
$$ LANGUAGE plpgsql;

-- Function to rotate nonce after successful auth
CREATE OR REPLACE FUNCTION rotate_nonce(p_wallet_address TEXT)
RETURNS TEXT AS $$
DECLARE
  v_new_nonce TEXT;
BEGIN
  v_new_nonce := generate_nonce();
  UPDATE wallet_nonces 
  SET nonce = v_new_nonce, updated_at = NOW()
  WHERE wallet_address = LOWER(p_wallet_address);
  RETURN v_new_nonce;
END;
$$ LANGUAGE plpgsql;
