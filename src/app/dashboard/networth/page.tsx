'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@/lib/wallet/WalletContext';
import { calculateNetWorth, NetWorthSummary, NetWorthSnapshot } from '@/lib/networth-calculator';
import { formatTRY, formatUSDSecondary } from '@/lib/currency';
import { formatDate } from '@/lib/utils';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import LiveExchangeRate from '@/components/ui/LiveExchangeRate';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Lock, CheckCircle, Receipt, Loader2 } from 'lucide-react';

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
        locked: s.active_investments_try,
        realized: s.claimed_investments_try,
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

    // Investment net effect = realized returns - locked capital
    const investmentNetEffect = (summary?.realized_returns_try || 0) - (summary?.locked_capital_try || 0);

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
                    Total Income − Total Expenses − Locked Capital + Realized Returns
                </div>
            </div>

            {/* Breakdown Cards - 4 columns */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                {/* Locked Capital (Active Investments) */}
                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <Lock className="w-6 h-6 text-amber-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Locked Capital</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-400">
                        −{formatTRY(summary?.locked_capital_try || 0)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                        Active investments
                    </p>
                </div>

                {/* Realized Returns (Claimed Investments) */}
                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-sky-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Realized Returns</span>
                    </div>
                    <p className="text-2xl font-bold text-sky-400">
                        +{formatTRY(summary?.realized_returns_try || 0)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                        Claimed investments
                    </p>
                </div>
            </div>

            {/* Investment Effect Summary */}
            {(summary?.locked_capital_try || summary?.realized_returns_try) ? (
                <div className="glass-dark rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Investment Effect on Net Worth</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="glass rounded-xl p-4 text-center">
                            <p className="text-sm text-slate-400 mb-1">Locked Capital</p>
                            <p className="text-xl font-bold text-amber-400">
                                −{formatTRY(summary?.locked_capital_try || 0)}
                            </p>
                        </div>
                        <div className="glass rounded-xl p-4 text-center">
                            <p className="text-sm text-slate-400 mb-1">Realized Returns</p>
                            <p className="text-xl font-bold text-sky-400">
                                +{formatTRY(summary?.realized_returns_try || 0)}
                            </p>
                        </div>
                        <div className="glass rounded-xl p-4 text-center">
                            <p className="text-sm text-slate-400 mb-1">Net Effect</p>
                            <p className={`text-xl font-bold ${investmentNetEffect >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {investmentNetEffect >= 0 ? '+' : ''}{formatTRY(investmentNetEffect)}
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-4">
                        💡 Active investments reduce your net worth (locked capital).
                        Claim investments to add realized returns back to your net worth.
                    </p>
                </div>
            ) : null}

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

            {/* Investment Lifecycle Chart */}
            {investmentChartData.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Investment Lifecycle (₺)</h3>
                    <TimeSeriesChart
                        data={investmentChartData}
                        lines={[
                            { dataKey: 'locked', name: 'Locked Capital', color: '#f59e0b' },
                            { dataKey: 'realized', name: 'Realized Returns', color: '#0ea5e9' },
                        ]}
                        height={300}
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
                Income records • Expense records • Investment records (active & claimed)
                <span className="float-right text-xs">
                    Last updated: {formatDate(new Date().toISOString().split('T')[0])}
                </span>
            </div>
        </div>
    );
}
