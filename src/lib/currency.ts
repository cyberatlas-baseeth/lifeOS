// Currency utilities for TRY/USD conversion
// TRY is the primary currency, USD is for comparison only

export interface ExchangeRateData {
    rate: number;       // USD/TRY rate (e.g., 32.5 means 1 USD = 32.5 TRY)
    date: string;       // ISO date string
}

// Cache exchange rate for 1 hour
let cachedRate: ExchangeRateData | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// Default exchange rate for manual input
export const DEFAULT_USD_TRY_RATE = 36.5;

/**
 * Fetch current USD/TRY exchange rate
 * Uses exchangerate-api.com free tier
 */
export async function getUSDTRYRate(): Promise<ExchangeRateData> {
    const now = Date.now();

    // Return cached rate if valid
    if (cachedRate && (now - cacheTimestamp) < CACHE_DURATION_MS) {
        return cachedRate;
    }

    try {
        // Using exchangerate-api.com free tier
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');

        if (!response.ok) {
            throw new Error('Exchange rate API error');
        }

        const data = await response.json();
        const rate = data.rates?.TRY;

        if (!rate) {
            throw new Error('TRY rate not found');
        }

        cachedRate = {
            rate: rate,
            date: new Date().toISOString().split('T')[0],
        };
        cacheTimestamp = now;

        return cachedRate;
    } catch (error) {
        console.error('Failed to fetch exchange rate:', error);

        // Fallback rate if API fails
        return {
            rate: 32.5, // Approximate fallback
            date: new Date().toISOString().split('T')[0],
        };
    }
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
