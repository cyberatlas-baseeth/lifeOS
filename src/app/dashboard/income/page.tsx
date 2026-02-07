'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWallet } from '@/lib/wallet/WalletContext';
import { Income } from '@/types/database';
import { formatDate, formatDateForInput } from '@/lib/utils';
import { getUSDTRYRate, convertTRYtoUSD, formatTRY, formatUSDSecondary } from '@/lib/currency';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import LiveExchangeRate from '@/components/ui/LiveExchangeRate';
import { Plus, Trash2, TrendingUp, Briefcase, Gift, Loader2, Pencil, X } from 'lucide-react';

// Tag options for each category
const REGULAR_INCOME_TAGS = ['salary'];
const ADDITIONAL_INCOME_TAGS = ['crypto'];

export default function IncomePage() {
    const { session } = useWallet();
    const [records, setRecords] = useState<Income[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        date: formatDateForInput(),
        category: 'regular' as 'regular' | 'additional',
        tag: 'salary',
        amount: '',
    });

    const resetForm = () => {
        setFormData({
            date: formatDateForInput(),
            category: 'regular',
            tag: 'salary',
            amount: '',
        });
        setEditingId(null);
        setError(null);
    };

    // Update tag when category changes
    const handleCategoryChange = (category: 'regular' | 'additional') => {
        setFormData({
            ...formData,
            category,
            tag: category === 'regular' ? 'salary' : 'crypto',
        });
    };

    const fetchRecords = useCallback(async () => {
        if (!session?.walletAddress) return;

        const supabase = createClient();
        const { data, error } = await supabase
            .from('income')
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

    const handleEdit = (record: Income) => {
        setFormData({
            date: record.date,
            category: record.category,
            tag: record.tag || (record.category === 'regular' ? 'salary' : 'crypto'),
            amount: String(record.amount_try || record.amount || ''),
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
            const amountTry = parseFloat(formData.amount);
            const amountUsd = convertTRYtoUSD(amountTry, rateData.rate);

            const supabase = createClient();

            const recordData = {
                wallet_address: session.walletAddress.toLowerCase(),
                date: formData.date,
                category: formData.category,
                tag: formData.tag,
                amount_try: amountTry,
                amount_usd: amountUsd,
                exchange_rate_usd_try: rateData.rate,
                exchange_rate_date: rateData.timestamp.split('T')[0],
                amount: amountTry,
            };

            let result;
            if (editingId) {
                // Update existing record
                result = await supabase
                    .from('income')
                    .update(recordData)
                    .eq('id', editingId)
                    .select();
            } else {
                // Insert new record
                result = await supabase
                    .from('income')
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
            console.error('Error saving income:', error);
            setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        const supabase = createClient();
        await supabase.from('income').delete().eq('id', id);
        fetchRecords();
    };

    const handleCancel = () => {
        resetForm();
        setShowForm(false);
    };

    // Get available tags based on category
    const availableTags = formData.category === 'regular' ? REGULAR_INCOME_TAGS : ADDITIONAL_INCOME_TAGS;

    // Group by date for chart
    const groupedData = records.reduce((acc, record) => {
        const date = record.date;
        if (!acc[date]) {
            acc[date] = { regular: 0, additional: 0 };
        }
        const amount = record.amount_try || record.amount || 0;
        acc[date][record.category] += Number(amount);
        return acc;
    }, {} as Record<string, { regular: number; additional: number }>);

    const chartData = Object.entries(groupedData)
        .map(([date, values]) => ({
            date,
            regular: values.regular,
            additional: values.additional,
            total: values.regular + values.additional,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate totals (TRY and USD)
    const totalRegularTRY = records
        .filter(r => r.category === 'regular')
        .reduce((sum, r) => sum + Number(r.amount_try || r.amount || 0), 0);
    const totalAdditionalTRY = records
        .filter(r => r.category === 'additional')
        .reduce((sum, r) => sum + Number(r.amount_try || r.amount || 0), 0);
    const totalTRY = totalRegularTRY + totalAdditionalTRY;

    const totalRegularUSD = records
        .filter(r => r.category === 'regular')
        .reduce((sum, r) => sum + Number(r.amount_usd || 0), 0);
    const totalAdditionalUSD = records
        .filter(r => r.category === 'additional')
        .reduce((sum, r) => sum + Number(r.amount_usd || 0), 0);
    const totalUSD = totalRegularUSD + totalAdditionalUSD;

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
                    <h1 className="text-2xl font-bold">Income</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Track your regular and additional income
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
                        Add Income
                    </button>
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <div className="glass-dark rounded-2xl p-6 slide-in">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">
                            {editingId ? 'Edit Income' : 'New Income Entry'}
                        </h3>
                        <button
                            onClick={handleCancel}
                            className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
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
                                <label className="block text-sm text-slate-400 mb-2">Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => handleCategoryChange(e.target.value as 'regular' | 'additional')}
                                    required
                                >
                                    <option value="regular">Regular Income</option>
                                    <option value="additional">Additional Income</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Tag</label>
                                <select
                                    value={formData.tag}
                                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                                    required
                                >
                                    {availableTags.map((tag) => (
                                        <option key={tag} value={tag}>
                                            {tag.charAt(0).toUpperCase() + tag.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Amount (₺ TRY)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    placeholder="25000"
                                    required
                                />
                            </div>
                        </div>
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}
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

            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-emerald-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Total Income</span>
                    </div>
                    <p className="text-3xl font-bold text-emerald-400">
                        {formatTRY(totalTRY)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                        {formatUSDSecondary(totalUSD)}
                    </p>
                </div>

                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center">
                            <Briefcase className="w-6 h-6 text-sky-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Regular Income</span>
                    </div>
                    <p className="text-2xl font-bold">
                        {formatTRY(totalRegularTRY)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                        {formatUSDSecondary(totalRegularUSD)}
                    </p>
                </div>

                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                            <Gift className="w-6 h-6 text-violet-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Additional Income</span>
                    </div>
                    <p className="text-2xl font-bold">
                        {formatTRY(totalAdditionalTRY)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                        {formatUSDSecondary(totalAdditionalUSD)}
                    </p>
                </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Income Trend (₺)</h3>
                    <TimeSeriesChart
                        data={chartData}
                        type="bar"
                        bars={[
                            { dataKey: 'regular', name: 'Regular', color: '#38bdf8' },
                            { dataKey: 'additional', name: 'Additional', color: '#8b5cf6' },
                        ]}
                        height={300}
                    />
                </div>
            )}

            {/* Data Table */}
            <div className="glass-dark rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Entries</h3>
                {records.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">
                        No income records yet. Click &quot;Add Income&quot; to start tracking.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Date</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Category</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Tag</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Amount</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Rate</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record) => (
                                    <tr key={record.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                        <td className="px-4 py-3 text-sm">{formatDate(record.date)}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`
                                                px-2 py-1 rounded-full text-xs font-medium
                                                ${record.category === 'regular'
                                                    ? 'bg-sky-500/20 text-sky-400'
                                                    : 'bg-violet-500/20 text-violet-400'}
                                            `}>
                                                {record.category === 'regular' ? 'Regular' : 'Additional'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300">
                                                {record.tag || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div>
                                                <span className="font-medium text-emerald-400">
                                                    +{formatTRY(Number(record.amount_try || record.amount || 0))}
                                                </span>
                                                {record.amount_usd && (
                                                    <span className="text-slate-500 text-xs ml-2">
                                                        {formatUSDSecondary(record.amount_usd)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400">
                                            {record.exchange_rate_usd_try ? `${record.exchange_rate_usd_try.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
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
            </div>
        </div>
    );
}
