'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWallet } from '@/lib/wallet/WalletContext';
import { AvatarState, AggregatedMetrics, Alert } from '@/types/database';
import { calculateAvatarState, generateAlerts } from '@/lib/avatar/calculator';
import { formatCurrency, getScoreColor, calculateHealthScore } from '@/lib/utils';
import AvatarDisplay from '@/components/avatar/AvatarDisplay';
import MetricCard from '@/components/ui/MetricCard';
import AlertBanner from '@/components/ui/AlertBanner';
import {
    Activity,
    Brain,
    Wallet,
    TrendingUp,
    TrendingDown,
    PiggyBank,
} from 'lucide-react';
import { subDays } from 'date-fns';

export default function DashboardPage() {
    const { session } = useWallet();
    const [avatarState, setAvatarState] = useState<AvatarState | null>(null);
    const [metrics, setMetrics] = useState<AggregatedMetrics>({
        health: null,
        psychology: null,
        finance: null,
    });
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMetrics = useCallback(async () => {
        if (!session?.walletAddress) return;

        const supabase = createClient();
        const walletAddress = session.walletAddress.toLowerCase();
        const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split('T')[0];

        // Fetch health metrics
        const { data: healthData } = await supabase
            .from('health_metrics')
            .select('*')
            .eq('wallet_address', walletAddress)
            .gte('date', thirtyDaysAgo)
            .order('date', { ascending: false });

        // Fetch psychology metrics
        const { data: psychData } = await supabase
            .from('psychology_metrics')
            .select('*')
            .eq('wallet_address', walletAddress)
            .gte('date', thirtyDaysAgo)
            .order('date', { ascending: false });

        // Fetch income
        const { data: incomeData } = await supabase
            .from('income')
            .select('*')
            .eq('wallet_address', walletAddress)
            .gte('date', thirtyDaysAgo);

        // Fetch expenses
        const { data: expenseData } = await supabase
            .from('expenses')
            .select('*')
            .eq('wallet_address', walletAddress)
            .gte('date', thirtyDaysAgo);

        // Fetch net worth (latest)
        const { data: netWorthData } = await supabase
            .from('net_worth')
            .select('*')
            .eq('wallet_address', walletAddress)
            .order('date', { ascending: false })
            .limit(1);

        // Fetch investments
        const { data: investmentData } = await supabase
            .from('investments')
            .select('*')
            .eq('wallet_address', walletAddress)
            .gte('date', thirtyDaysAgo);

        // Calculate aggregates
        const newMetrics: AggregatedMetrics = {
            health: null,
            psychology: null,
            finance: null,
        };

        if (healthData && healthData.length > 0) {
            const validSleep = healthData.filter(h => h.sleep_hours !== null);
            const validActivity = healthData.filter(h => h.activity_level !== null);

            const avgSleep = validSleep.length > 0
                ? validSleep.reduce((sum, h) => sum + Number(h.sleep_hours), 0) / validSleep.length
                : 0;
            const avgActivity = validActivity.length > 0
                ? validActivity.reduce((sum, h) => sum + Number(h.activity_level), 0) / validActivity.length
                : 0;

            // Calculate health score using new formula:
            // healthScore = (sleepScore * 0.5) + (activityScore100 * 0.5)
            const calculatedHealthScore = (avgSleep > 0 || avgActivity > 0)
                ? calculateHealthScore(avgSleep, avgActivity)
                : 0;

            newMetrics.health = {
                avgSleep,
                avgActivity,
                avgHealthScore: calculatedHealthScore,
            };
        }

        if (psychData && psychData.length > 0) {
            const validMentalScore = psychData.filter(p => p.mental_score !== null);

            newMetrics.psychology = {
                avgMood: 0, // Legacy, kept for avatar compatibility
                avgStress: 0, // Legacy
                avgMotivation: 0, // Legacy
                avgMentalScore: validMentalScore.length > 0
                    ? validMentalScore.reduce((sum, p) => sum + Number(p.mental_score), 0) / validMentalScore.length
                    : 0,
            };
        }

        const totalIncome = incomeData?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;
        const totalExpenses = expenseData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
        const latestNetWorth = netWorthData?.[0]?.total_assets ? Number(netWorthData[0].total_assets) : 0;
        const investmentProfitLoss = investmentData?.reduce((sum, inv) => sum + Number(inv.profit_loss || 0), 0) || 0;

        if (incomeData?.length || expenseData?.length || netWorthData?.length || investmentData?.length) {
            newMetrics.finance = {
                totalIncome,
                totalExpenses,
                netCashFlow: totalIncome - totalExpenses,
                latestNetWorth,
                investmentProfitLoss,
            };
        }

        setMetrics(newMetrics);

        // Calculate avatar state
        const avatar = calculateAvatarState(newMetrics);
        setAvatarState(avatar);

        // Generate alerts
        const newAlerts = generateAlerts(newMetrics);
        setAlerts(newAlerts);

        setLoading(false);
    }, [session?.walletAddress]);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full gradient-primary animate-pulse mx-auto mb-4" />
                    <p className="text-gray-600">Loading data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Alerts */}
            {alerts.length > 0 && (
                <div className="space-y-3">
                    {alerts.slice(0, 3).map((alert) => (
                        <AlertBanner key={alert.id} alert={alert} />
                    ))}
                </div>
            )}

            {/* Avatar Section */}
            <div className="glass-dark rounded-2xl p-6 lg:p-8">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                    <AvatarDisplay state={avatarState} />

                    <div className="flex-1 text-center lg:text-left">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {avatarState?.statusMessage || 'Enter your data'}
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Calculated based on the last 30 days of data
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Energy</p>
                                <p className={`text-2xl font-bold ${getScoreColor(avatarState?.energy || 0)}`}>
                                    {avatarState?.energy || 0}
                                </p>
                            </div>
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Morale</p>
                                <p className={`text-2xl font-bold ${getScoreColor(avatarState?.morale || 0)}`}>
                                    {avatarState?.morale || 0}
                                </p>
                            </div>
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Balance</p>
                                <p className={`text-2xl font-bold ${getScoreColor(avatarState?.balance || 0)}`}>
                                    {avatarState?.balance || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard
                    title="Health Score"
                    value={metrics.health?.avgHealthScore.toFixed(0) || '-'}
                    subtitle="Last 30 days average"
                    icon={Activity}
                    color="emerald"
                    href="/dashboard/health"
                />

                <MetricCard
                    title="Mental Score"
                    value={metrics.psychology?.avgMentalScore ? metrics.psychology.avgMentalScore.toFixed(0) : '-'}
                    subtitle="Psychological balance"
                    icon={Brain}
                    color="violet"
                    href="/dashboard/psychology"
                />

                <MetricCard
                    title="Net Worth"
                    value={metrics.finance?.latestNetWorth ? formatCurrency(metrics.finance.latestNetWorth) : '-'}
                    subtitle="Total assets"
                    icon={Wallet}
                    color="sky"
                    href="/dashboard/networth"
                />

                <MetricCard
                    title="Income"
                    value={metrics.finance?.totalIncome ? formatCurrency(metrics.finance.totalIncome) : '-'}
                    subtitle="Last 30 days"
                    icon={TrendingUp}
                    color="green"
                    href="/dashboard/income"
                />

                <MetricCard
                    title="Expenses"
                    value={metrics.finance?.totalExpenses ? formatCurrency(metrics.finance.totalExpenses) : '-'}
                    subtitle="Last 30 days"
                    icon={TrendingDown}
                    color="amber"
                    href="/dashboard/expenses"
                />

                <MetricCard
                    title="Investment P/L"
                    value={metrics.finance?.investmentProfitLoss !== undefined
                        ? formatCurrency(metrics.finance.investmentProfitLoss)
                        : '-'}
                    subtitle="Last 30 days"
                    icon={PiggyBank}
                    color={metrics.finance?.investmentProfitLoss && metrics.finance.investmentProfitLoss >= 0 ? 'emerald' : 'red'}
                    href="/dashboard/investments"
                />
            </div>

            {/* Quick Summary */}
            {metrics.finance && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Summary</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                            <span className="text-gray-600">Net Cash Flow</span>
                            <span className={`font-semibold ${metrics.finance.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'
                                }`}>
                                {metrics.finance.netCashFlow >= 0 ? '+' : ''}
                                {formatCurrency(metrics.finance.netCashFlow)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                            <span className="text-gray-600">Savings Rate</span>
                            <span className={`font-semibold ${metrics.finance.totalIncome > 0 &&
                                (metrics.finance.netCashFlow / metrics.finance.totalIncome) >= 0.2
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                                }`}>
                                {metrics.finance.totalIncome > 0
                                    ? `${((metrics.finance.netCashFlow / metrics.finance.totalIncome) * 100).toFixed(0)}%`
                                    : '0%'
                                }
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
