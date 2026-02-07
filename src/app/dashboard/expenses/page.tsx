'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWallet } from '@/lib/wallet/WalletContext';
import { Expense, ExpenseTag } from '@/types/database';
import { formatDate, formatDateForInput } from '@/lib/utils';
import { getUSDTRYRate, convertTRYtoUSD, formatTRY, formatUSDSecondary } from '@/lib/currency';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import LiveExchangeRate from '@/components/ui/LiveExchangeRate';
import { Plus, Trash2, TrendingDown, Home, Zap, ShoppingBag, Loader2, Pencil, X, Heart } from 'lucide-react';

// Tag configuration with labels and colors
const EXPENSE_TAGS: { value: ExpenseTag; label: string; icon: typeof Home; color: string; bgColor: string }[] = [
    { value: 'rent', label: 'Rent', icon: Home, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    { value: 'bills', label: 'Bills', icon: Zap, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
    { value: 'lifestyle', label: 'Lifestyle', icon: ShoppingBag, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
    { value: 'family_support', label: '👨‍👩‍👧 Family Support', icon: Heart, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
];

export default function ExpensesPage() {
    const { session } = useWallet();
    const [records, setRecords] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        date: formatDateForInput(),
        tag: 'lifestyle' as ExpenseTag,
        amount: '',
    });

    const resetForm = () => {
        setFormData({
            date: formatDateForInput(),
            tag: 'lifestyle',
            amount: '',
        });
        setEditingId(null);
        setError(null);
    };

    const fetchRecords = useCallback(async () => {
        if (!session?.walletAddress) return;

        const supabase = createClient();
        const { data, error } = await supabase
            .from('expenses')
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

    const handleEdit = (record: Expense) => {
        const tag = getRecordTag(record);
        setFormData({
            date: record.date,
            tag: tag,
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
                tag: formData.tag,
                amount_try: amountTry,
                amount_usd: amountUsd,
                exchange_rate_usd_try: rateData.rate,
                exchange_rate_date: rateData.timestamp.split('T')[0],
                // Backwards compatibility
                amount: amountTry,
                category: formData.tag === 'rent' ? 'fixed' : 'variable',
            };

            let result;
            if (editingId) {
                // Update existing record
                result = await supabase
                    .from('expenses')
                    .update(recordData)
                    .eq('id', editingId)
                    .select();
            } else {
                // Insert new record
                result = await supabase
                    .from('expenses')
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
            console.error('Error saving expense:', error);
            setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        const supabase = createClient();
        await supabase.from('expenses').delete().eq('id', id);
        fetchRecords();
    };

    const handleCancel = () => {
        resetForm();
        setShowForm(false);
    };

    // Get tag for a record (with fallback for old data)
    const getRecordTag = (record: Expense): ExpenseTag => {
        if (record.tag) return record.tag;
        // Fallback for old category-based data
        if (record.category === 'fixed') return 'rent';
        return 'lifestyle';
    };

    // Group by tag for stats
    const tagTotals = records.reduce((acc, record) => {
        const tag = getRecordTag(record);
        const amount = Number(record.amount_try || record.amount || 0);
        const amountUsd = Number(record.amount_usd || 0);
        if (!acc[tag]) {
            acc[tag] = { try: 0, usd: 0 };
        }
        acc[tag].try += amount;
        acc[tag].usd += amountUsd;
        return acc;
    }, {} as Record<ExpenseTag, { try: number; usd: number }>);

    const totalTRY = Object.values(tagTotals).reduce((sum, t) => sum + t.try, 0);
    const totalUSD = Object.values(tagTotals).reduce((sum, t) => sum + t.usd, 0);

    // Group by date for chart
    const groupedData = records.reduce((acc, record) => {
        const date = record.date;
        const tag = getRecordTag(record);
        if (!acc[date]) {
            acc[date] = { rent: 0, bills: 0, lifestyle: 0, family_support: 0 };
        }
        const amount = Number(record.amount_try || record.amount || 0);
        acc[date][tag] += amount;
        return acc;
    }, {} as Record<string, { rent: number; bills: number; lifestyle: number; family_support: number }>);

    const chartData = Object.entries(groupedData)
        .map(([date, values]) => ({
            date,
            rent: values.rent,
            bills: values.bills,
            lifestyle: values.lifestyle,
            family_support: values.family_support,
            total: values.rent + values.bills + values.lifestyle + values.family_support,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // Tag breakdown for pie-style display
    const tagBreakdown = EXPENSE_TAGS.map(tag => ({
        ...tag,
        amount: tagTotals[tag.value]?.try || 0,
        amountUsd: tagTotals[tag.value]?.usd || 0,
        percentage: totalTRY > 0 ? ((tagTotals[tag.value]?.try || 0) / totalTRY) * 100 : 0,
    }));

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
                    <h1 className="text-2xl font-bold">Expenses</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Track your spending by category
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
                        Add Expense
                    </button>
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <div className="glass-dark rounded-2xl p-6 slide-in">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">
                            {editingId ? 'Edit Expense' : 'New Expense'}
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
                                <label className="block text-sm text-slate-400 mb-2">Category</label>
                                <select
                                    value={formData.tag}
                                    onChange={(e) => setFormData({ ...formData, tag: e.target.value as ExpenseTag })}
                                    required
                                >
                                    <option value="rent">🏠 Rent (Housing, Mortgage)</option>
                                    <option value="bills">💡 Bills (Utilities, Subscriptions)</option>
                                    <option value="lifestyle">🛍️ Lifestyle (Shopping, Entertainment)</option>
                                    <option value="family_support">👨‍👩‍👧 Family Support (Parents, Relatives)</option>
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
                                    placeholder="5000"
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
            <div className="grid md:grid-cols-4 gap-4">
                {/* Total */}
                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                            <TrendingDown className="w-6 h-6 text-red-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Total Expenses</span>
                    </div>
                    <p className="text-3xl font-bold text-red-400">
                        {formatTRY(totalTRY)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                        {formatUSDSecondary(totalUSD)}
                    </p>
                </div>

                {/* Tag Cards */}
                {tagBreakdown.map((tag) => {
                    const IconComponent = tag.icon;
                    return (
                        <div key={tag.value} className="glass-dark rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-12 h-12 rounded-xl ${tag.bgColor} flex items-center justify-center`}>
                                    <IconComponent className={`w-6 h-6 ${tag.color}`} />
                                </div>
                                <span className="text-slate-400 text-sm">{tag.label}</span>
                            </div>
                            <p className="text-2xl font-bold">
                                {formatTRY(tag.amount)}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${tag.bgColor.replace('/20', '')}`}
                                        style={{ width: `${tag.percentage}%` }}
                                    />
                                </div>
                                <span className="text-xs text-slate-500">{tag.percentage.toFixed(0)}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Expense Trend by Category (₺)</h3>
                    <TimeSeriesChart
                        data={chartData}
                        type="bar"
                        bars={[
                            { dataKey: 'rent', name: 'Rent', color: '#3b82f6' },
                            { dataKey: 'bills', name: 'Bills', color: '#fbbf24' },
                            { dataKey: 'lifestyle', name: 'Lifestyle', color: '#a855f7' },
                            { dataKey: 'family_support', name: 'Family Support', color: '#ec4899' },
                        ]}
                        height={300}
                    />
                </div>
            )}

            {/* Data Table */}
            <div className="glass-dark rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Expenses</h3>
                {records.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">
                        No expense records yet. Click &quot;Add Expense&quot; to start tracking.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Date</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Category</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Amount</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Rate</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record) => {
                                    const tag = getRecordTag(record);
                                    const tagConfig = EXPENSE_TAGS.find(t => t.value === tag) || EXPENSE_TAGS[2];
                                    const IconComponent = tagConfig.icon;
                                    return (
                                        <tr key={record.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                            <td className="px-4 py-3 text-sm">{formatDate(record.date)}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${tagConfig.bgColor} ${tagConfig.color}`}>
                                                    <IconComponent className="w-3 h-3" />
                                                    {tagConfig.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div>
                                                    <span className="font-medium text-red-400">
                                                        -{formatTRY(Number(record.amount_try || record.amount || 0))}
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
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
