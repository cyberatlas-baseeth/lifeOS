'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@/lib/wallet/WalletContext';
import { calculateNetWorth, NetWorthSummary, NetWorthSnapshot } from '@/lib/networth-calculator';
import { formatTRY, formatUSDSecondary } from '@/lib/currency';
import { formatDate } from '@/lib/utils';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import LiveExchangeRate from '@/components/ui/LiveExchangeRate';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, PiggyBank, Receipt, Loader2 } from 'lucide-react';

export default function NetWorthPage() {
    const { session } = useWallet();
    const [summary, setSummary] = useState<NetWorthSummary | null>(null);
    const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNetWorth = useCallback(async () => {
        if (!session?.walletAddress) return;

        setLoading(true);
        try {
            const result = await calculateNetWorth(session.walletAddress);
            setSummary(result.summary);
            setSnapshots(result.snapshots);
        } catch (error) {
            console.error('Error calculating net worth:', error);
        }
        setLoading(false);
    }, [session?.walletAddress]);

    useEffect(() => {
        fetchNetWorth();
    }, [fetchNetWorth]);

    // Prepare chart data
    const netWorthChartData = snapshots.map(s => ({
        date: s.date,
        netWorth: s.total_try,
    }));

    const incomeExpenseChartData = snapshots.map(s => ({
        date: s.date,
        income: s.income_try,
        expenses: s.expenses_try,
    }));

    const investmentChartData = snapshots.map(s => ({
        date: s.date,
        investments: s.investments_try,
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
        );
    }

    const isPositive = (summary?.current_try || 0) >= 0;
    const isGrowing = (summary?.change_percent || 0) >= 0;

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Net Worth</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Automatically calculated from your financial data
                    </p>
                </div>
                <LiveExchangeRate />
            </div>

            {/* Main Net Worth Card */}
            <div className="glass-dark rounded-2xl p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className={`w-16 h-16 rounded-2xl ${isPositive ? 'bg-emerald-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                        <Wallet className={`w-8 h-8 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`} />
                    </div>
                    <div>
                        <span className="text-slate-400 text-sm block">Current Net Worth</span>
                        <div className="flex items-center gap-3">
                            <p className={`text-4xl font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatTRY(summary?.current_try || 0)}
                            </p>
                            {summary?.change_percent !== 0 && (
                                <span className={`
                                    inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium
                                    ${isGrowing ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}
                                `}>
                                    {isGrowing ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                    {isGrowing ? '+' : ''}{summary?.change_percent.toFixed(1)}%
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm mt-1">
                            {formatUSDSecondary(summary?.current_usd || 0)}
                        </p>
                    </div>
                </div>

                {/* Formula explanation */}
                <div className="glass rounded-xl p-4 text-sm text-slate-400">
                    <span className="font-medium text-slate-300">Calculation:</span>{' '}
                    Total Income − Total Expenses + Investments
                </div>
            </div>

            {/* Breakdown Cards */}
            <div className="grid md:grid-cols-3 gap-4">
                {/* Total Income */}
                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-emerald-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Total Income</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">
                        +{formatTRY(summary?.total_income_try || 0)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                        {formatUSDSecondary(summary?.total_income_usd || 0)}
                    </p>
                </div>

                {/* Total Expenses */}
                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                            <Receipt className="w-6 h-6 text-red-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Total Expenses</span>
                    </div>
                    <p className="text-2xl font-bold text-red-400">
                        −{formatTRY(summary?.total_expenses_try || 0)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                        {formatUSDSecondary(summary?.total_expenses_usd || 0)}
                    </p>
                </div>

                {/* Total Investments */}
                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center">
                            <PiggyBank className="w-6 h-6 text-accent-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Investments</span>
                    </div>
                    <p className="text-2xl font-bold">
                        {(summary?.total_investments_try || 0) >= 0 ? '+' : ''}{formatTRY(summary?.total_investments_try || 0)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                        {formatUSDSecondary(summary?.total_investments_usd || 0)}
                    </p>
                </div>
            </div>

            {/* Net Worth Over Time Chart */}
            {netWorthChartData.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Net Worth Over Time (₺)</h3>
                    <TimeSeriesChart
                        data={netWorthChartData}
                        lines={[
                            { dataKey: 'netWorth', name: 'Net Worth', color: isPositive ? '#10b981' : '#ef4444' },
                        ]}
                        height={300}
                        showLegend={false}
                    />
                </div>
            )}

            {/* Income vs Expenses Chart */}
            {incomeExpenseChartData.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Income vs Expenses (₺)</h3>
                    <TimeSeriesChart
                        data={incomeExpenseChartData}
                        type="bar"
                        bars={[
                            { dataKey: 'income', name: 'Income', color: '#10b981' },
                            { dataKey: 'expenses', name: 'Expenses', color: '#ef4444' },
                        ]}
                        height={300}
                    />
                </div>
            )}

            {/* Investments Growth Chart */}
            {investmentChartData.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Investment Growth (₺)</h3>
                    <TimeSeriesChart
                        data={investmentChartData}
                        lines={[
                            { dataKey: 'investments', name: 'Investments', color: '#8b5cf6' },
                        ]}
                        height={300}
                        showLegend={false}
                    />
                </div>
            )}

            {/* Empty State */}
            {snapshots.length === 0 && (
                <div className="glass-dark rounded-2xl p-12 text-center">
                    <Wallet className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-400 mb-2">No Financial Data Yet</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Start adding income, expenses, and investments to see your net worth calculated automatically.
                    </p>
                </div>
            )}

            {/* Data Sources Info */}
            <div className="glass rounded-xl p-4 text-sm text-slate-500">
                <span className="font-medium text-slate-400">Data Sources:</span>{' '}
                Income records • Expense records • Investment records
                <span className="float-right text-xs">
                    Last updated: {formatDate(new Date().toISOString().split('T')[0])}
                </span>
            </div>
        </div>
    );
}
