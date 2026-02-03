'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWallet } from '@/lib/wallet/WalletContext';
import { Income } from '@/types/database';
import { formatDate, formatDateForInput, formatCurrency } from '@/lib/utils';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import { Plus, Trash2, TrendingUp, Briefcase, Gift, Loader2 } from 'lucide-react';

export default function IncomePage() {
    const { session } = useWallet();
    const [records, setRecords] = useState<Income[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        date: formatDateForInput(),
        category: 'regular' as 'regular' | 'additional',
        amount: '',
        description: '',
    });

    const fetchRecords = useCallback(async () => {
        if (!session?.walletAddress) return;

        const supabase = createClient();
        const { data, error } = await supabase
            .from('income')
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

        const { error } = await supabase.from('income').insert({
            wallet_address: session.walletAddress.toLowerCase(),
            date: formData.date,
            category: formData.category,
            amount: parseFloat(formData.amount),
            description: formData.description || null,
        });

        if (!error) {
            setFormData({
                date: formatDateForInput(),
                category: 'regular',
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
        await supabase.from('income').delete().eq('id', id);
        fetchRecords();
    };

    // Group by date for chart
    const groupedData = records.reduce((acc, record) => {
        const date = record.date;
        if (!acc[date]) {
            acc[date] = { regular: 0, additional: 0 };
        }
        acc[date][record.category] += Number(record.amount);
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

    // Calculate totals
    const totalRegular = records
        .filter(r => r.category === 'regular')
        .reduce((sum, r) => sum + Number(r.amount), 0);
    const totalAdditional = records
        .filter(r => r.category === 'additional')
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
                    <h1 className="text-2xl font-bold">Gelir</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Düzenli ve ek gelirlerini kaydet
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn btn-primary"
                >
                    <Plus className="w-4 h-4" />
                    Gelir Ekle
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="glass-dark rounded-2xl p-6 slide-in">
                    <h3 className="text-lg font-semibold mb-4">Yeni Gelir Kaydı</h3>
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
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value as 'regular' | 'additional' })}
                                    required
                                >
                                    <option value="regular">Düzenli Gelir</option>
                                    <option value="additional">Ek Gelir</option>
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
                                    placeholder="5000"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Açıklama</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Maaş, freelance vb."
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
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-emerald-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Toplam Gelir</span>
                    </div>
                    <p className="text-4xl font-bold text-emerald-400">
                        {formatCurrency(totalRegular + totalAdditional)}
                    </p>
                </div>

                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center">
                            <Briefcase className="w-6 h-6 text-sky-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Düzenli Gelir</span>
                    </div>
                    <p className="text-3xl font-bold">
                        {formatCurrency(totalRegular)}
                    </p>
                </div>

                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                            <Gift className="w-6 h-6 text-violet-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Ek Gelir</span>
                    </div>
                    <p className="text-3xl font-bold">
                        {formatCurrency(totalAdditional)}
                    </p>
                </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Gelir Trendi</h3>
                    <TimeSeriesChart
                        data={chartData}
                        type="bar"
                        bars={[
                            { dataKey: 'regular', name: 'Düzenli', color: '#38bdf8' },
                            { dataKey: 'additional', name: 'Ek', color: '#8b5cf6' },
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
                        Henüz gelir kaydı yok. Yukarıdaki butona tıklayarak ekleyin.
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
                        ${record.category === 'regular'
                                                    ? 'bg-sky-500/20 text-sky-400'
                                                    : 'bg-violet-500/20 text-violet-400'}
                      `}>
                                                {record.category === 'regular' ? 'Düzenli' : 'Ek'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-emerald-400">
                                            +{formatCurrency(Number(record.amount))}
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
