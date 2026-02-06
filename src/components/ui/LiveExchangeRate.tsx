'use client';

import { useEffect, useState, useCallback } from 'react';
import { getUSDTRYRate, ExchangeRateData } from '@/lib/currency';
import { RefreshCw } from 'lucide-react';

interface LiveExchangeRateProps {
    className?: string;
}

/**
 * Live Exchange Rate Badge Component
 * Displays current USD/TRY rate, auto-refreshes every 15 minutes
 * For display only - does not affect stored records
 */
export default function LiveExchangeRate({ className = '' }: LiveExchangeRateProps) {
    const [rateData, setRateData] = useState<ExchangeRateData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchRate = useCallback(async () => {
        try {
            setLoading(true);
            setError(false);
            const data = await getUSDTRYRate();
            setRateData(data);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial fetch
        fetchRate();

        // Refresh every 15 minutes
        const interval = setInterval(fetchRate, 15 * 60 * 1000);

        return () => clearInterval(interval);
    }, [fetchRate]);

    if (loading && !rateData) {
        return (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 text-slate-400 text-xs ${className}`}>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Loading rate...</span>
            </div>
        );
    }

    if (error && !rateData) {
        return (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs ${className}`}>
                <span>Rate unavailable</span>
            </div>
        );
    }

    return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-xs ${className}`}>
            <span className="text-slate-400">USD/TRY:</span>
            <span className="font-semibold text-primary-400">
                {rateData?.rate.toFixed(2)}
            </span>
            <span className="text-slate-500">(live)</span>
            {loading && <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />}
        </div>
    );
}
