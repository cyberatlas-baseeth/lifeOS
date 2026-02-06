'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWallet } from '@/lib/wallet/WalletContext';
import { NetWorth } from '@/types/database';
import { formatDate, formatDateForInput } from '@/lib/utils';
import { getUSDTRYRate, convertTRYtoUSD, formatTRY, formatUSDSecondary } from '@/lib/currency';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import LiveExchangeRate from '@/components/ui/LiveExchangeRate';
import { Plus, Trash2, Wallet, Banknote, Loader2 } from 'lucide-react';

export default function NetWorthPage() {
    const { session } = useWallet();
    const [metrics, setMetrics] = useState<NetWorth[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        date: formatDateForInput(),
        total_assets: '',
        cash: '',
        notes: '',
    });

    const fetchMetrics = useCallback(async () => {
        if (!session?.walletAddress) return;

        const supabase = createClient();
        const { data, error } = await supabase
            .from('net_worth')
            .select('*')
            .eq('wallet_address', session.walletAddress.toLowerCase())
            .order('date', { ascending: false })
            .limit(30);

        if (!error && data) {
            setMetrics(data);
        }
        setLoading(false);
    }, [session?.walletAddress]);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.walletAddress) return;

        setSaving(true);

        try {
            // Auto-fetch current exchange rate
            const rateData = await getUSDTRYRate();
            const assetsTry = formData.total_assets ? parseFloat(formData.total_assets) : null;
            const cashTry = formData.cash ? parseFloat(formData.cash) : null;

            const supabase = createClient();
            const { error } = await supabase.from('net_worth').upsert({
                wallet_address: session.walletAddress.toLowerCase(),
                date: formData.date,
                total_assets_try: assetsTry,
                total_assets_usd: assetsTry ? convertTRYtoUSD(assetsTry, rateData.rate) : null,
                cash_try: cashTry,
                cash_usd: cashTry ? convertTRYtoUSD(cashTry, rateData.rate) : null,
                exchange_rate_usd_try: rateData.rate,
                exchange_rate_date: rateData.timestamp.split('T')[0],
                notes: formData.notes || null,
                total_assets: assetsTry,
                cash: cashTry,
            }, {
                onConflict: 'wallet_address,date',
            });

            if (!error) {
                setFormData({
                    date: formatDateForInput(),
                    total_assets: '',
                    cash: '',
                    notes: '',
                });
                setShowForm(false);
                fetchMetrics();
            }
        } catch (error) {
            console.error('Error saving net worth:', error);
        }

        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        const supabase = createClient();
        await supabase.from('net_worth').delete().eq('id', id);
        fetchMetrics();
    };

    const chartData = metrics
        .slice()
        .reverse()
        .map((m) => ({
            date: m.date,
            assets: Number(m.total_assets_try || m.total_assets) || 0,
            cash: Number(m.cash_try || m.cash) || 0,
        }));

    // Calculate change
    const latestAssetsTRY = metrics[0]?.total_assets_try ?? metrics[0]?.total_assets ?? 0;
    const previousAssetsTRY = metrics[1]?.total_assets_try ?? metrics[1]?.total_assets ?? 0;
    const assetChange = previousAssetsTRY ? ((Number(latestAssetsTRY) - Number(previousAssetsTRY)) / Number(previousAssetsTRY)) * 100 : 0;

    const latestAssetsUSD = metrics[0]?.total_assets_usd ?? 0;
    const latestCashTRY = metrics[0]?.cash_try ?? metrics[0]?.cash ?? 0;
    const latestCashUSD = metrics[0]?.cash_usd ?? 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Net Worth</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Track your total assets and cash position
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <LiveExchangeRate />
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="btn btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        Add Entry
                    </button>
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <div className="glass-dark rounded-2xl p-6 slide-in">
                    <h3 className="text-lg font-semibold mb-4">New Entry</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Date</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Total Assets (₺ TRY)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.total_assets}
                                    onChange={(e) => setFormData({ ...formData, total_assets: e.target.value })}
                                    placeholder="1000000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Cash (₺ TRY)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.cash}
                                    onChange={(e) => setFormData({ ...formData, cash: e.target.value })}
                                    placeholder="250000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Notes</label>
                                <input
                                    type="text"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Additional information..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn btn-primary"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Stats Cards */}
            {metrics.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="glass-dark rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center">
                                <Wallet className="w-6 h-6 text-sky-400" />
                            </div>
                            <div>
                                <span className="text-slate-400 text-sm">Total Assets</span>
                                {assetChange !== 0 && (
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${assetChange >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {assetChange >= 0 ? '+' : ''}{assetChange.toFixed(1)}%
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className="text-3xl font-bold">
                            {formatTRY(Number(latestAssetsTRY))}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                            {formatUSDSecondary(Number(latestAssetsUSD))}
                        </p>
                    </div>

                    <div className="glass-dark rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                <Banknote className="w-6 h-6 text-emerald-400" />
                            </div>
                            <span className="text-slate-400 text-sm">Cash</span>
                        </div>
                        <p className="text-3xl font-bold">
                            {formatTRY(Number(latestCashTRY))}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                            {formatUSDSecondary(Number(latestCashUSD))}
                        </p>
                    </div>
                </div>
            )}

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Asset Trend (₺)</h3>
                    <TimeSeriesChart
                        data={chartData}
                        lines={[
                            { dataKey: 'assets', name: 'Total Assets', color: '#38bdf8' },
                            { dataKey: 'cash', name: 'Cash', color: '#10b981' },
                        ]}
                        height={300}
                    />
                </div>
            )}

            {/* Data Table */}
            <div className="glass-dark rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Entries</h3>
                {metrics.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">
                        No data yet. Click the button above to add entries.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Date</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Total Assets</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Cash</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Rate</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Notes</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.map((metric) => (
                                    <tr key={metric.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                        <td className="px-4 py-3 text-sm">{formatDate(metric.date)}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <div>
                                                <span className="font-medium">
                                                    {formatTRY(Number(metric.total_assets_try || metric.total_assets) || 0)}
                                                </span>
                                                {metric.total_assets_usd && (
                                                    <span className="text-slate-500 text-xs ml-2">
                                                        {formatUSDSecondary(metric.total_assets_usd)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div>
                                                <span>
                                                    {formatTRY(Number(metric.cash_try || metric.cash) || 0)}
                                                </span>
                                                {metric.cash_usd && (
                                                    <span className="text-slate-500 text-xs ml-2">
                                                        {formatUSDSecondary(metric.cash_usd)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400">
                                            {metric.exchange_rate_usd_try ? `${metric.exchange_rate_usd_try.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400 max-w-xs truncate">
                                            {metric.notes || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleDelete(metric.id)}
                                                className="p-2 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
