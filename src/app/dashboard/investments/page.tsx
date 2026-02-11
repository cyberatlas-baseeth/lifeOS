'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWallet } from '@/lib/wallet/WalletContext';
import { Investment } from '@/types/database';
import { formatDate, formatDateForInput } from '@/lib/utils';
import { getUSDTRYRate, convertTRYtoUSD, formatTRY, formatUSDSecondary } from '@/lib/currency';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import LiveExchangeRate from '@/components/ui/LiveExchangeRate';
import { Plus, Trash2, PiggyBank, TrendingUp, TrendingDown, Loader2, Lock, CheckCircle, X, Pencil } from 'lucide-react';

const INVESTMENT_TYPES = [
    'Crypto',
    'Gold',
    'Stocks',
    'Forex',
    'Real Estate',
    'Funds',
    'Bonds',
    'Other',
];

const formatWithDots = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const stripDots = (value: string): string => value.replace(/\./g, '');

export default function InvestmentsPage() {
    const { session } = useWallet();
    const [records, setRecords] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'claimed'>('active');

    // Claim modal state
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [claimAmount, setClaimAmount] = useState('');
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        date: formatDateForInput(),
        investment_type: 'Crypto',
        amount: '',
    });

    const resetForm = () => {
        setFormData({
            date: formatDateForInput(),
            investment_type: 'Crypto',
            amount: '',
        });
        setEditingId(null);
        setError(null);
    };

    const fetchRecords = useCallback(async () => {
        if (!session?.walletAddress) return;

        const supabase = createClient();
        const { data, error } = await supabase
            .from('investments')
            .select('*')
            .eq('wallet_address', session.walletAddress.toLowerCase())
            .order('date', { ascending: false })
            .limit(100);

        if (!error && data) {
            setRecords(data);
        }
        setLoading(false);
    }, [session?.walletAddress]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const handleEdit = (record: Investment) => {
        setFormData({
            date: record.date,
            investment_type: record.investment_type,
            amount: formatWithDots(String(record.invested_try || record.amount || '')),
        });
        setEditingId(record.id);
        setShowForm(true);
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.walletAddress) return;

        setSaving(true);
        setError(null);

        try {
            const rateData = await getUSDTRYRate();
            const investedTry = parseFloat(stripDots(formData.amount));

            const supabase = createClient();

            const recordData = {
                wallet_address: session.walletAddress.toLowerCase(),
                date: formData.date,
                investment_type: formData.investment_type,
                invested_try: investedTry,
                invested_usd: convertTRYtoUSD(investedTry, rateData.rate),
                status: 'active',
                exchange_rate_usd_try: rateData.rate,
                exchange_rate_date: rateData.timestamp.split('T')[0],
                // Backwards compatibility for old schema
                amount: investedTry,
                amount_try: investedTry,
                amount_usd: convertTRYtoUSD(investedTry, rateData.rate),
            };

            let result;
            if (editingId) {
                // Update existing record (only for active investments)
                result = await supabase
                    .from('investments')
                    .update(recordData)
                    .eq('id', editingId)
                    .select();
            } else {
                // Insert new record
                result = await supabase
                    .from('investments')
                    .insert(recordData)
                    .select();
            }

            console.log('Save result:', result);

            if (result.error) {
                console.error('Supabase error:', result.error);
                setError(`Failed to save: ${result.error.message}`);
            } else {
                resetForm();
                setShowForm(false);
                fetchRecords();
            }
        } catch (error) {
            console.error('Error saving investment:', error);
            setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        setSaving(false);
    };

    const handleClaim = async () => {
        if (!claimingId || !claimAmount) return;

        setSaving(true);

        try {
            const rateData = await getUSDTRYRate();
            const realizedPlTry = parseFloat(stripDots(claimAmount));

            const supabase = createClient();
            const { error } = await supabase
                .from('investments')
                .update({
                    status: 'claimed',
                    realized_pl_try: realizedPlTry,
                    realized_pl_usd: convertTRYtoUSD(realizedPlTry, rateData.rate),
                    claimed_at: new Date().toISOString(),
                })
                .eq('id', claimingId);

            if (!error) {
                setClaimingId(null);
                setClaimAmount('');
                fetchRecords();
            }
        } catch (error) {
            console.error('Error claiming investment:', error);
        }

        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        const supabase = createClient();
        await supabase.from('investments').delete().eq('id', id);
        fetchRecords();
    };

    const handleCancel = () => {
        resetForm();
        setShowForm(false);
    };

    // Filter records by status
    const activeRecords = records.filter(r => r.status === 'active');
    const claimedRecords = records.filter(r => r.status === 'claimed');

    // Calculate totals
    const totalLockedCapitalTRY = activeRecords.reduce((sum, r) => sum + Number(r.invested_try || 0), 0);
    const totalLockedCapitalUSD = activeRecords.reduce((sum, r) => sum + Number(r.invested_usd || 0), 0);

    const totalRealizedPLTRY = claimedRecords.reduce((sum, r) => sum + Number(r.realized_pl_try || 0), 0);
    const totalRealizedPLUSD = claimedRecords.reduce((sum, r) => sum + Number(r.realized_pl_usd || 0), 0);

    const totalClaimedPrincipalTRY = claimedRecords.reduce((sum, r) => sum + Number(r.invested_try || 0), 0);

    // Group by type for summary (active only)
    const byType = activeRecords.reduce((acc, record) => {
        const type = record.investment_type;
        if (!acc[type]) {
            acc[type] = { amount: 0 };
        }
        acc[type].amount += Number(record.invested_try || 0);
        return acc;
    }, {} as Record<string, { amount: number }>);

    // Chart data - show locked capital over time
    const chartData = records
        .filter(r => r.status === 'active')
        .reduce((acc, record) => {
            const date = record.date;
            if (!acc[date]) {
                acc[date] = { locked: 0 };
            }
            acc[date].locked += Number(record.invested_try || 0);
            return acc;
        }, {} as Record<string, { locked: number }>);

    const chartDataArray = Object.entries(chartData)
        .map(([date, values]) => ({
            date,
            locked: values.locked,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

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
                        Track your investments – claim to realize profit/loss
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <LiveExchangeRate />
                    <button
                        onClick={() => {
                            resetForm();
                            setShowForm(!showForm);
                        }}
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
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">
                            {editingId ? 'Edit Investment' : 'New Investment'}
                        </h3>
                        <button
                            onClick={handleCancel}
                            className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid md:grid-cols-3 gap-4">
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
                                    type="text"
                                    inputMode="numeric"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: formatWithDots(e.target.value) })}
                                    placeholder=""
                                    required
                                />
                            </div>
                        </div>
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                        <p className="text-xs text-slate-500">
                            💡 Investment will be marked as &quot;Locked Capital&quot; until you claim it with realized profit/loss.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn btn-primary"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Update' : 'Save')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Claim Modal */}
            {claimingId && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="glass-dark rounded-2xl p-6 w-full max-w-md slide-in">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Claim Investment</h3>
                            <button
                                onClick={() => setClaimingId(null)}
                                className="p-2 rounded-lg hover:bg-slate-700/50"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">
                                    Realized Profit/Loss (₺ TRY)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={claimAmount}
                                    onChange={(e) => setClaimAmount(formatWithDots(e.target.value))}
                                    placeholder=""
                                    className="w-full"
                                    autoFocus
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    Enter positive value for profit, negative for loss.
                                </p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setClaimingId(null)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleClaim}
                                    disabled={saving || !claimAmount}
                                    className="btn btn-primary"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Claim'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <Lock className="w-6 h-6 text-amber-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Locked Capital</span>
                    </div>
                    <p className="text-3xl font-bold text-amber-400">
                        {formatTRY(totalLockedCapitalTRY)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                        {formatUSDSecondary(totalLockedCapitalUSD)}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                        {activeRecords.length} active investment{activeRecords.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-xl ${totalRealizedPLTRY >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                            {totalRealizedPLTRY >= 0
                                ? <TrendingUp className="w-6 h-6 text-emerald-400" />
                                : <TrendingDown className="w-6 h-6 text-red-400" />
                            }
                        </div>
                        <span className="text-slate-400 text-sm">Realized P/L</span>
                    </div>
                    <p className={`text-3xl font-bold ${totalRealizedPLTRY >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {totalRealizedPLTRY >= 0 ? '+' : ''}{formatTRY(totalRealizedPLTRY)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                        {totalRealizedPLTRY >= 0 ? '+' : ''}{formatUSDSecondary(totalRealizedPLUSD)}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                        {claimedRecords.length} claimed investment{claimedRecords.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-sky-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Total Returned</span>
                    </div>
                    <p className="text-3xl font-bold">
                        {formatTRY(totalClaimedPrincipalTRY + totalRealizedPLTRY)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                        Principal: {formatTRY(totalClaimedPrincipalTRY)}
                    </p>
                </div>
            </div>

            {/* Portfolio Distribution (Active Only) */}
            {Object.keys(byType).length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Active Portfolio Distribution</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(byType).map(([type, data]) => (
                            <div key={type} className="glass rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">{type}</span>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                                        Locked
                                    </span>
                                </div>
                                <p className="text-xl font-bold">{formatTRY(data.amount)}</p>
                                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                                        style={{ width: `${(data.amount / totalLockedCapitalTRY) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Chart */}
            {chartDataArray.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Locked Capital Over Time (₺)</h3>
                    <TimeSeriesChart
                        data={chartDataArray}
                        lines={[
                            { dataKey: 'locked', name: 'Locked Capital', color: '#f59e0b' },
                        ]}
                        height={300}
                        showLegend={false}
                    />
                </div>
            )}

            {/* Tabs */}
            <div className="glass-dark rounded-2xl p-6">
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'active'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <Lock className="w-4 h-4 inline mr-2" />
                        Active ({activeRecords.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('claimed')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'claimed'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <CheckCircle className="w-4 h-4 inline mr-2" />
                        Claimed ({claimedRecords.length})
                    </button>
                </div>

                {/* Active Investments Table */}
                {activeTab === 'active' && (
                    <>
                        {activeRecords.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">
                                No active investments. Click &quot;Add Investment&quot; to start.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700/50">
                                            <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Date</th>
                                            <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Type</th>
                                            <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Invested</th>
                                            <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Status</th>
                                            <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Rate</th>
                                            <th className="px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeRecords.map((record) => (
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
                                                            {formatTRY(Number(record.invested_try || 0))}
                                                        </span>
                                                        {record.invested_usd && (
                                                            <span className="text-slate-500 text-xs ml-2">
                                                                {formatUSDSecondary(record.invested_usd)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                                                        <Lock className="w-3 h-3" />
                                                        Locked
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-400">
                                                    {record.exchange_rate_usd_try ? `${record.exchange_rate_usd_try.toFixed(2)}` : '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setClaimingId(record.id)}
                                                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                                                        >
                                                            Claim
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(record)}
                                                            className="p-2 rounded-lg hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(record.id)}
                                                            className="p-2 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {/* Claimed Investments Table */}
                {activeTab === 'claimed' && (
                    <>
                        {claimedRecords.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">
                                No claimed investments yet. Claim an active investment to see it here.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700/50">
                                            <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Invested</th>
                                            <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Type</th>
                                            <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Amount</th>
                                            <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Realized P/L</th>
                                            <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Claimed</th>
                                            <th className="px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {claimedRecords.map((record) => {
                                            const pl = Number(record.realized_pl_try || 0);
                                            return (
                                                <tr key={record.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                                    <td className="px-4 py-3 text-sm">{formatDate(record.date)}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-accent-500/20 text-accent-400">
                                                            {record.investment_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className="font-medium">
                                                            {formatTRY(Number(record.invested_try || 0))}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={`font-medium ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {pl >= 0 ? '+' : ''}{formatTRY(pl)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-400">
                                                        {record.claimed_at ? formatDate(record.claimed_at.split('T')[0]) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => handleDelete(record.id)}
                                                            className="p-2 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
