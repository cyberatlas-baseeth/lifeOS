'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWallet } from '@/lib/wallet/WalletContext';
import { Expense } from '@/types/database';
import { formatDate, formatDateForInput, formatCurrency } from '@/lib/utils';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import { Plus, Trash2, TrendingDown, Home, ShoppingCart, Loader2 } from 'lucide-react';

export default function ExpensesPage() {
    const { session } = useWallet();
    const [records, setRecords] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        date: formatDateForInput(),
        category: 'variable' as 'fixed' | 'variable',
        amount: '',
        description: '',
    });

    const fetchRecords = useCallback(async () => {
        if (!session?.walletAddress) return;

        const supabase = createClient();
        const { data, error } = await supabase
            .from('expenses')
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
        const supabase = createClient();

        const { error } = await supabase.from('expenses').insert({
            wallet_address: session.walletAddress.toLowerCase(),
            date: formData.date,
            category: formData.category,
            amount: parseFloat(formData.amount),
            description: formData.description || null,
        });

        if (!error) {
            setFormData({
                date: formatDateForInput(),
                category: 'variable',
                amount: '',
                description: '',
            });
            setShowForm(false);
            fetchRecords();
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        const supabase = createClient();
        await supabase.from('expenses').delete().eq('id', id);
        fetchRecords();
    };

    // Group by date for chart
    const groupedData = records.reduce((acc, record) => {
        const date = record.date;
        if (!acc[date]) {
            acc[date] = { fixed: 0, variable: 0 };
        }
        acc[date][record.category] += Number(record.amount);
        return acc;
    }, {} as Record<string, { fixed: number; variable: number }>);

    const chartData = Object.entries(groupedData)
        .map(([date, values]) => ({
            date,
            fixed: values.fixed,
            variable: values.variable,
            total: values.fixed + values.variable,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate totals
    const totalFixed = records
        .filter(r => r.category === 'fixed')
        .reduce((sum, r) => sum + Number(r.amount), 0);
    const totalVariable = records
        .filter(r => r.category === 'variable')
        .reduce((sum, r) => sum + Number(r.amount), 0);

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
                    <h1 className="text-2xl font-bold">Giderler</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Sabit ve değişken giderlerini takip et
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn btn-primary"
                >
                    <Plus className="w-4 h-4" />
                    Gider Ekle
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="glass-dark rounded-2xl p-6 slide-in">
                    <h3 className="text-lg font-semibold mb-4">Yeni Gider Kaydı</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Tarih</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Kategori</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value as 'fixed' | 'variable' })}
                                    required
                                >
                                    <option value="fixed">Sabit Gider</option>
                                    <option value="variable">Değişken Gider</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Tutar (₺)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    placeholder="1500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Açıklama</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Kira, fatura, market vb."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="btn btn-secondary"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn btn-primary"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kaydet'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                            <TrendingDown className="w-6 h-6 text-red-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Toplam Gider</span>
                    </div>
                    <p className="text-4xl font-bold text-red-400">
                        {formatCurrency(totalFixed + totalVariable)}
                    </p>
                </div>

                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <Home className="w-6 h-6 text-amber-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Sabit Giderler</span>
                    </div>
                    <p className="text-3xl font-bold">
                        {formatCurrency(totalFixed)}
                    </p>
                </div>

                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                            <ShoppingCart className="w-6 h-6 text-orange-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Değişken Giderler</span>
                    </div>
                    <p className="text-3xl font-bold">
                        {formatCurrency(totalVariable)}
                    </p>
                </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Gider Trendi</h3>
                    <TimeSeriesChart
                        data={chartData}
                        type="bar"
                        bars={[
                            { dataKey: 'fixed', name: 'Sabit', color: '#fbbf24' },
                            { dataKey: 'variable', name: 'Değişken', color: '#fb923c' },
                        ]}
                        height={300}
                    />
                </div>
            )}

            {/* Data Table */}
            <div className="glass-dark rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Son Kayıtlar</h3>
                {records.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">
                        Henüz gider kaydı yok. Yukarıdaki butona tıklayarak ekleyin.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Tarih</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Kategori</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Tutar</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Açıklama</th>
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
                        ${record.category === 'fixed'
                                                    ? 'bg-amber-500/20 text-amber-400'
                                                    : 'bg-orange-500/20 text-orange-400'}
                      `}>
                                                {record.category === 'fixed' ? 'Sabit' : 'Değişken'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-red-400">
                                            -{formatCurrency(Number(record.amount))}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400 max-w-xs truncate">
                                            {record.description || '-'}
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
