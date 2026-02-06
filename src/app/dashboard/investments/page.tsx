'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWallet } from '@/lib/wallet/WalletContext';
import { Investment } from '@/types/database';
import { formatDate, formatDateForInput } from '@/lib/utils';
import { getUSDTRYRate, convertTRYtoUSD, formatTRY, formatUSDSecondary } from '@/lib/currency';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import LiveExchangeRate from '@/components/ui/LiveExchangeRate';
import { Plus, Trash2, PiggyBank, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

const INVESTMENT_TYPES = [
    'Stocks',
    'Crypto',
    'Gold',
    'Forex',
    'Real Estate',
    'Funds',
    'Bonds',
    'Other',
];

export default function InvestmentsPage() {
    const { session } = useWallet();
    const [records, setRecords] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        date: formatDateForInput(),
        investment_type: 'Stocks',
        amount: '',
        profit_loss: '',
        notes: '',
    });

    const fetchRecords = useCallback(async () => {
        if (!session?.walletAddress) return;

        const supabase = createClient();
        const { data, error } = await supabase
            .from('investments')
            .select('*')
            .eq('wallet_address', session.walletAddress.toLowerCase())
            .order('date', { ascending: false })
            .limit(50);

        if (!error && data) {
            setRecords(data);
        }
        setLoading(false);
    }, [session?.walletAddress]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.walletAddress) return;

        setSaving(true);

        try {
            // Auto-fetch current exchange rate
            const rateData = await getUSDTRYRate();
            const amountTry = parseFloat(formData.amount);
            const profitLossTry = formData.profit_loss ? parseFloat(formData.profit_loss) : 0;

            const supabase = createClient();
            const { error } = await supabase.from('investments').insert({
                wallet_address: session.walletAddress.toLowerCase(),
                date: formData.date,
                investment_type: formData.investment_type,
                amount_try: amountTry,
                amount_usd: convertTRYtoUSD(amountTry, rateData.rate),
                profit_loss_try: profitLossTry,
                profit_loss_usd: convertTRYtoUSD(profitLossTry, rateData.rate),
                exchange_rate_usd_try: rateData.rate,
                exchange_rate_date: rateData.timestamp.split('T')[0],
                notes: formData.notes || null,
                amount: amountTry,
                profit_loss: profitLossTry,
            });

            if (!error) {
                setFormData({
                    date: formatDateForInput(),
                    investment_type: 'Stocks',
                    amount: '',
                    profit_loss: '',
                    notes: '',
                });
                setShowForm(false);
                fetchRecords();
            }
        } catch (error) {
            console.error('Error saving investment:', error);
        }

        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        const supabase = createClient();
        await supabase.from('investments').delete().eq('id', id);
        fetchRecords();
    };

    // Group by type for summary
    const byType = records.reduce((acc, record) => {
        const type = record.investment_type;
        if (!acc[type]) {
            acc[type] = { amount: 0, profitLoss: 0 };
        }
        acc[type].amount += Number(record.amount_try || record.amount);
        acc[type].profitLoss += Number(record.profit_loss_try || record.profit_loss || 0);
        return acc;
    }, {} as Record<string, { amount: number; profitLoss: number }>);

    // Group by date for chart
    const groupedData = records.reduce((acc, record) => {
        const date = record.date;
        if (!acc[date]) {
            acc[date] = { amount: 0, profitLoss: 0 };
        }
        acc[date].amount += Number(record.amount_try || record.amount);
        acc[date].profitLoss += Number(record.profit_loss_try || record.profit_loss || 0);
        return acc;
    }, {} as Record<string, { amount: number; profitLoss: number }>);

    const chartData = Object.entries(groupedData)
        .map(([date, values]) => ({
            date,
            amount: values.amount,
            profitLoss: values.profitLoss,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate totals
    const totalInvestedTRY = records.reduce((sum, r) => sum + Number(r.amount_try || r.amount), 0);
    const totalProfitLossTRY = records.reduce((sum, r) => sum + Number(r.profit_loss_try || r.profit_loss || 0), 0);
    const totalInvestedUSD = records.reduce((sum, r) => sum + Number(r.amount_usd || 0), 0);
    const totalProfitLossUSD = records.reduce((sum, r) => sum + Number(r.profit_loss_usd || 0), 0);

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
                    <h1 className="text-2xl font-bold">Investments</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Track your investment portfolio and profit/loss status
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <LiveExchangeRate />
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="btn btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        Add Investment
                    </button>
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <div className="glass-dark rounded-2xl p-6 slide-in">
                    <h3 className="text-lg font-semibold mb-4">New Investment Entry</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                                <label className="block text-sm text-slate-400 mb-2">Type</label>
                                <select
                                    value={formData.investment_type}
                                    onChange={(e) => setFormData({ ...formData, investment_type: e.target.value })}
                                    required
                                >
                                    {INVESTMENT_TYPES.map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Amount (₺ TRY)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    placeholder="100000"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Profit/Loss (₺)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.profit_loss}
                                    onChange={(e) => setFormData({ ...formData, profit_loss: e.target.value })}
                                    placeholder="5000 or -2000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Notes</label>
                                <input
                                    type="text"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Additional info..."
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
            <div className="grid md:grid-cols-3 gap-4">
                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center">
                            <PiggyBank className="w-6 h-6 text-accent-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Total Investment</span>
                    </div>
                    <p className="text-3xl font-bold">
                        {formatTRY(totalInvestedTRY)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                        {formatUSDSecondary(totalInvestedUSD)}
                    </p>
                </div>

                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-xl ${totalProfitLossTRY >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                            {totalProfitLossTRY >= 0
                                ? <TrendingUp className="w-6 h-6 text-emerald-400" />
                                : <TrendingDown className="w-6 h-6 text-red-400" />
                            }
                        </div>
                        <span className="text-slate-400 text-sm">Total Profit/Loss</span>
                    </div>
                    <p className={`text-3xl font-bold ${totalProfitLossTRY >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {totalProfitLossTRY >= 0 ? '+' : ''}{formatTRY(totalProfitLossTRY)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                        {totalProfitLossTRY >= 0 ? '+' : ''}{formatUSDSecondary(totalProfitLossUSD)}
                    </p>
                </div>

                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center">
                            <span className="text-sky-400 text-lg font-bold">%</span>
                        </div>
                        <span className="text-slate-400 text-sm">Return Rate</span>
                    </div>
                    <p className={`text-4xl font-bold ${totalProfitLossTRY >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {totalInvestedTRY > 0
                            ? `${((totalProfitLossTRY / totalInvestedTRY) * 100).toFixed(1)}%`
                            : '0%'
                        }
                    </p>
                </div>
            </div>

            {/* Portfolio Distribution */}
            {Object.keys(byType).length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Portfolio Distribution</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(byType).map(([type, data]) => (
                            <div key={type} className="glass rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">{type}</span>
                                    <span className={`text-xs font-medium ${data.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {data.profitLoss >= 0 ? '+' : ''}{formatTRY(data.profitLoss)}
                                    </span>
                                </div>
                                <p className="text-xl font-bold">{formatTRY(data.amount)}</p>
                                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                                        style={{ width: `${(data.amount / totalInvestedTRY) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Profit/Loss Trend (₺)</h3>
                    <TimeSeriesChart
                        data={chartData}
                        lines={[
                            { dataKey: 'profitLoss', name: 'Profit/Loss', color: totalProfitLossTRY >= 0 ? '#10b981' : '#ef4444' },
                        ]}
                        height={300}
                        showLegend={false}
                    />
                </div>
            )}

            {/* Data Table */}
            <div className="glass-dark rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Entries</h3>
                {records.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">
                        No investment records yet. Click the button above to add one.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Date</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Type</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Amount</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Profit/Loss</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Rate</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Notes</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record) => (
                                    <tr key={record.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                        <td className="px-4 py-3 text-sm">{formatDate(record.date)}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-accent-500/20 text-accent-400">
                                                {record.investment_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div>
                                                <span className="font-medium">
                                                    {formatTRY(Number(record.amount_try || record.amount))}
                                                </span>
                                                {record.amount_usd && (
                                                    <span className="text-slate-500 text-xs ml-2">
                                                        {formatUSDSecondary(record.amount_usd)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div>
                                                <span className={`font-medium ${Number(record.profit_loss_try || record.profit_loss || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {Number(record.profit_loss_try || record.profit_loss || 0) >= 0 ? '+' : ''}
                                                    {formatTRY(Number(record.profit_loss_try || record.profit_loss || 0))}
                                                </span>
                                                {record.profit_loss_usd && (
                                                    <span className="text-slate-500 text-xs ml-2">
                                                        {formatUSDSecondary(record.profit_loss_usd)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400">
                                            {record.exchange_rate_usd_try ? `${record.exchange_rate_usd_try.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400 max-w-xs truncate">
                                            {record.notes || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleDelete(record.id)}
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
