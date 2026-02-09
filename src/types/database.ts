// Database types for LifeOS - MetaMask wallet-based auth

export interface WalletNonce {
    wallet_address: string;
    nonce: string;
    created_at: string;
    updated_at: string;
}

export interface Profile {
    id: string;
    wallet_address: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

// Nutrition types (English only)
export type MealQuality = 'poor' | 'normal' | 'good';
export type ProcessedFoodLevel = 'high' | 'medium' | 'low';
export type WaterIntake = 'low' | 'adequate' | 'good';
export type IllnessStatus = 'none' | 'mild' | 'severe';
export type ActivityLevel = 1 | 2 | 3 | 4 | 5;

// Psychology types (English only)
export type StressLevel = 'calm' | 'mild' | 'high';
export type MotivationLevel = 'high' | 'medium' | 'low';
export type FatigueLevel = 'fresh' | 'tired' | 'exhausted';

export interface HealthMetric {
    id: string;
    wallet_address: string;
    date: string;
    sleep_hours: number | null;
    activity_level: ActivityLevel | null;
    health_score: number | null;
    meal_quality: MealQuality | null;
    processed_food_level: ProcessedFoodLevel | null;
    water_intake: WaterIntake | null;
    illness_status: IllnessStatus | null;
    notes: string | null;
    created_at: string;
}

export interface PsychologyMetric {
    id: string;
    wallet_address: string;
    date: string;
    // New dropdown-based fields
    stress_level: StressLevel | null;
    motivation_level: MotivationLevel | null;
    mental_fatigue: FatigueLevel | null;
    mental_score: number | null;
    created_at: string;
    // Legacy fields (for backwards compatibility)
    mood: number | null;
    stress: number | null;
    motivation: number | null;
}

export interface NetWorth {
    id: string;
    wallet_address: string;
    date: string;
    // Currency fields (TRY primary)
    total_assets_try: number | null;
    total_assets_usd: number | null;
    cash_try: number | null;
    cash_usd: number | null;
    exchange_rate_usd_try: number | null;
    exchange_rate_date: string | null;
    notes: string | null;
    created_at: string;
    // Legacy fields
    total_assets: number | null;
    cash: number | null;
}

export interface Income {
    id: string;
    wallet_address: string;
    date: string;
    category: 'regular' | 'additional';
    tag: string;                         // Required: 'salary' for regular, 'crypto' for additional
    // Currency fields
    amount_try: number;                  // Primary value (TRY)
    amount_usd: number;                  // Calculated (USD)
    exchange_rate_usd_try: number;       // Rate used at record time
    exchange_rate_date: string;          // Date of exchange rate
    created_at: string;
    // Legacy field (for backwards compatibility)
    amount: number;
}

// Expense tag types
export type ExpenseTag = 'rent' | 'bills' | 'lifestyle' | 'shopping' | 'family_support';

export interface Expense {
    id: string;
    wallet_address: string;
    date: string;
    tag: ExpenseTag;
    // Currency fields
    amount_try: number;              // Primary value (TRY)
    amount_usd: number;              // Calculated (USD)
    exchange_rate_usd_try: number;   // Rate used at record time
    exchange_rate_date: string;      // Date of exchange rate
    created_at: string;
    // Legacy fields (for backwards compatibility)
    amount: number;
    category?: 'fixed' | 'variable';
    description?: string | null;
}

// Investment status type
export type InvestmentStatus = 'active' | 'claimed';

export interface Investment {
    id: string;
    wallet_address: string;
    date: string;
    investment_type: string;
    // Primary investment amount (locked capital)
    invested_try: number;
    invested_usd: number;
    // Lifecycle status
    status: InvestmentStatus;
    // Only populated when claimed
    realized_pl_try: number | null;
    realized_pl_usd: number | null;
    claimed_at: string | null;
    // Exchange rate at creation
    exchange_rate_usd_try: number;
    exchange_rate_date: string;
    created_at: string;
    // Legacy fields (for backwards compatibility)
    amount?: number;
    amount_try?: number;
    amount_usd?: number;
}

// Form input types (for creating/updating)
export type HealthMetricInput = Omit<HealthMetric, 'id' | 'wallet_address' | 'created_at'>;
export type PsychologyMetricInput = Omit<PsychologyMetric, 'id' | 'wallet_address' | 'created_at'>;
export type NetWorthInput = Omit<NetWorth, 'id' | 'wallet_address' | 'created_at'>;
export type IncomeInput = Omit<Income, 'id' | 'wallet_address' | 'created_at'>;
export type ExpenseInput = Omit<Expense, 'id' | 'wallet_address' | 'created_at'>;
export type InvestmentInput = Omit<Investment, 'id' | 'wallet_address' | 'created_at'>;

// Avatar state types
export type AvatarStatus = 'thriving' | 'energetic' | 'stable' | 'tired' | 'stressed' | 'critical' | 'sick';

export interface AvatarState {
    energy: number;      // 0-100
    morale: number;      // 0-100
    balance: number;     // 0-100
    overallScore: number; // 0-100
    status: AvatarStatus;
    statusMessage: string;
}

// Aggregated metrics for calculations
export interface AggregatedMetrics {
    health: {
        avgSleep: number;
        avgActivity: number;
        avgHealthScore: number;
    } | null;
    psychology: {
        avgMood: number;
        avgStress: number;
        avgMotivation: number;
        avgMentalScore: number;
    } | null;
    finance: {
        totalIncome: number;
        totalExpenses: number;
        netCashFlow: number;
        latestNetWorth: number;
        investmentProfitLoss: number;
    } | null;
}

// Alert types
export interface Alert {
    id: string;
    type: 'warning' | 'info' | 'success' | 'danger';
    title: string;
    message: string;
    metric: string;
}

// Wallet Auth types
export interface WalletSession {
    walletAddress: string;
    displayName: string | null;
    isConnected: boolean;
}

// Database type definition for Supabase
export interface Database {
    public: {
        Tables: {
            wallet_nonces: {
                Row: WalletNonce;
                Insert: Omit<WalletNonce, 'created_at' | 'updated_at'>;
                Update: Partial<Omit<WalletNonce, 'wallet_address' | 'created_at'>>;
            };
            profiles: {
                Row: Profile;
                Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Profile, 'id' | 'wallet_address' | 'created_at'>>;
            };
            health_metrics: {
                Row: HealthMetric;
                Insert: Omit<HealthMetric, 'id' | 'created_at'>;
                Update: Partial<Omit<HealthMetric, 'id' | 'wallet_address' | 'created_at'>>;
            };
            psychology_metrics: {
                Row: PsychologyMetric;
                Insert: Omit<PsychologyMetric, 'id' | 'created_at'>;
                Update: Partial<Omit<PsychologyMetric, 'id' | 'wallet_address' | 'created_at'>>;
            };
            net_worth: {
                Row: NetWorth;
                Insert: Omit<NetWorth, 'id' | 'created_at'>;
                Update: Partial<Omit<NetWorth, 'id' | 'wallet_address' | 'created_at'>>;
            };
            income: {
                Row: Income;
                Insert: Omit<Income, 'id' | 'created_at'>;
                Update: Partial<Omit<Income, 'id' | 'wallet_address' | 'created_at'>>;
            };
            expenses: {
                Row: Expense;
                Insert: Omit<Expense, 'id' | 'created_at'>;
                Update: Partial<Omit<Expense, 'id' | 'wallet_address' | 'created_at'>>;
            };
            investments: {
                Row: Investment;
                Insert: Omit<Investment, 'id' | 'created_at'>;
                Update: Partial<Omit<Investment, 'id' | 'wallet_address' | 'created_at'>>;
            };
        };
    };
}
