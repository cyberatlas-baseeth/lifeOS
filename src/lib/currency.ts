// Currency utilities for TRY/USD conversion
// TRY is the primary currency, USD is for comparison only
// Uses MoneyConvert API for live exchange rates

export interface ExchangeRateData {
    rate: number;       // USD/TRY rate (e.g., 36.5 means 1 USD = 36.5 TRY)
    timestamp: string;  // ISO timestamp
}

// Cache settings
let cachedRate: ExchangeRateData | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes for live display
const FALLBACK_RATE = 36.5; // Fallback if API fails

/**
 * Fetch live USD/TRY exchange rate from MoneyConvert API
 * Used for both live display and record saving
 * Results are cached for 15 minutes
 */
export async function getUSDTRYRate(): Promise<ExchangeRateData> {
    const now = Date.now();

    // Return cached rate if valid
    if (cachedRate && (now - cacheTimestamp) < CACHE_DURATION_MS) {
        return cachedRate;
    }

    try {
        // Using MoneyConvert API (no API key required)
        const response = await fetch('https://cdn.moneyconvert.net/api/latest.json');

        if (!response.ok) {
            throw new Error('Exchange rate API error');
        }

        const data = await response.json();
        // MoneyConvert returns rates relative to USD
        const rate = data.rates?.TRY;

        if (!rate) {
            throw new Error('TRY rate not found');
        }

        cachedRate = {
            rate: rate,
            timestamp: new Date().toISOString(),
        };
        cacheTimestamp = now;

        return cachedRate;
    } catch (error) {
        console.error('Failed to fetch exchange rate:', error);

        // Return cached rate if available, otherwise fallback
        if (cachedRate) {
            return cachedRate;
        }

        return {
            rate: FALLBACK_RATE,
            timestamp: new Date().toISOString(),
        };
    }
}

/**
 * Get cached rate synchronously (for UI display)
 * Returns null if no rate is cached yet
 */
export function getCachedRate(): ExchangeRateData | null {
    return cachedRate;
}

/**
 * Check if cache is stale (older than 15 minutes)
 */
export function isCacheStale(): boolean {
    if (!cachedRate) return true;
    return (Date.now() - cacheTimestamp) >= CACHE_DURATION_MS;
}

/**
 * Convert TRY to USD
 * @param amountTRY Amount in Turkish Lira
 * @param rate USD/TRY exchange rate
 * @returns Amount in USD
 */
export function convertTRYtoUSD(amountTRY: number, rate: number): number {
    if (rate <= 0) return 0;
    return Math.round((amountTRY / rate) * 100) / 100; // Round to 2 decimals
}

/**
 * Format amount as Turkish Lira
 * @param amount Amount in TRY
 * @returns Formatted string like "₺25,000"
 */
export function formatTRY(amount: number): string {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Format amount as US Dollars (secondary display)
 * @param amount Amount in USD
 * @returns Formatted string like "≈ $780"
 */
export function formatUSDSecondary(amount: number): string {
    const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
    return `≈ ${formatted}`;
}

/**
 * Format dual currency display
 * @param amountTRY Amount in TRY (primary)
 * @param amountUSD Amount in USD (secondary)
 * @returns Object with primary and secondary formatted strings
 */
export function formatDualCurrency(amountTRY: number, amountUSD: number): {
    primary: string;
    secondary: string;
} {
    return {
        primary: formatTRY(amountTRY),
        secondary: formatUSDSecondary(amountUSD),
    };
}
