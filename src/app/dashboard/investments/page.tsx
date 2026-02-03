'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWallet } from '@/lib/wallet/WalletContext';
import { Investment } from '@/types/database';
import { formatDate, formatDateForInput, formatCurrency } from '@/lib/utils';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import { Plus, Trash2, PiggyBank, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

const INVESTMENT_TYPES = [
    'Borsa',
    'Kripto',
    'Altın',
    'Döviz',
    'Gayrimenkul',
    'Fon',
    'Tahvil',
    'Diğer',
];

export default function InvestmentsPage() {
    const { session } = useWallet();
    const [records, setRecords] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        date: formatDateForInput(),
        investment_type: 'Borsa',
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
        const supabase = createClient();

        const { error } = await supabase.from('investments').insert({
            wallet_address: session.walletAddress.toLowerCase(),
            date: formData.date,
            investment_type: formData.investment_type,
            amount: parseFloat(formData.amount),
            profit_loss: formData.profit_loss ? parseFloat(formData.profit_loss) : 0,
            notes: formData.notes || null,
        });

        if (!error) {
            setFormData({
                date: formatDateForInput(),
                investment_type: 'Borsa',
                amount: '',
                profit_loss: '',
                notes: '',
            });
            setShowForm(false);
            fetchRecords();
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
        acc[type].amount += Number(record.amount);
        acc[type].profitLoss += Number(record.profit_loss || 0);
        return acc;
    }, {} as Record<string, { amount: number; profitLoss: number }>);

    // Group by date for chart
    const groupedData = records.reduce((acc, record) => {
        const date = record.date;
        if (!acc[date]) {
            acc[date] = { amount: 0, profitLoss: 0 };
        }
        acc[date].amount += Number(record.amount);
        acc[date].profitLoss += Number(record.profit_loss || 0);
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
    const totalInvested = records.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalProfitLoss = records.reduce((sum, r) => sum + Number(r.profit_loss || 0), 0);

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
                    <h1 className="text-2xl font-bold">Yatırımlar</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Yatırım portföyünü ve kar/zarar durumunu takip et
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn btn-primary"
                >
                    <Plus className="w-4 h-4" />
                    Yatırım Ekle
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="glass-dark rounded-2xl p-6 slide-in">
                    <h3 className="text-lg font-semibold mb-4">Yeni Yatırım Kaydı</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                                <label className="block text-sm text-slate-400 mb-2">Tür</label>
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
                                <label className="block text-sm text-slate-400 mb-2">Tutar (₺)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    placeholder="10000"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Kâr/Zarar (₺)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.profit_loss}
                                    onChange={(e) => setFormData({ ...formData, profit_loss: e.target.value })}
                                    placeholder="500 veya -200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Notlar</label>
                                <input
                                    type="text"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Ek bilgi..."
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
                        <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center">
                            <PiggyBank className="w-6 h-6 text-accent-400" />
                        </div>
                        <span className="text-slate-400 text-sm">Toplam Yatırım</span>
                    </div>
                    <p className="text-4xl font-bold">
                        {formatCurrency(totalInvested)}
                    </p>
                </div>

                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-xl ${totalProfitLoss >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                            {totalProfitLoss >= 0
                                ? <TrendingUp className="w-6 h-6 text-emerald-400" />
                                : <TrendingDown className="w-6 h-6 text-red-400" />
                            }
                        </div>
                        <span className="text-slate-400 text-sm">Toplam Kâr/Zarar</span>
                    </div>
                    <p className={`text-4xl font-bold ${totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(totalProfitLoss)}
                    </p>
                </div>

                <div className="glass-dark rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center">
                            <span className="text-sky-400 text-lg font-bold">%</span>
                        </div>
                        <span className="text-slate-400 text-sm">Getiri Oranı</span>
                    </div>
                    <p className={`text-4xl font-bold ${totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {totalInvested > 0
                            ? `${((totalProfitLoss / totalInvested) * 100).toFixed(1)}%`
                            : '0%'
                        }
                    </p>
                </div>
            </div>

            {/* Portfolio Distribution */}
            {Object.keys(byType).length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Portföy Dağılımı</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(byType).map(([type, data]) => (
                            <div key={type} className="glass rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">{type}</span>
                                    <span className={`text-xs font-medium ${data.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {data.profitLoss >= 0 ? '+' : ''}{formatCurrency(data.profitLoss)}
                                    </span>
                                </div>
                                <p className="text-xl font-bold">{formatCurrency(data.amount)}</p>
                                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                                        style={{ width: `${(data.amount / totalInvested) * 100}%` }}
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
                    <h3 className="text-lg font-semibold mb-4">Kâr/Zarar Trendi</h3>
                    <TimeSeriesChart
                        data={chartData}
                        lines={[
                            { dataKey: 'profitLoss', name: 'Kâr/Zarar', color: totalProfitLoss >= 0 ? '#10b981' : '#ef4444' },
                        ]}
                        height={300}
                        showLegend={false}
                    />
                </div>
            )}

            {/* Data Table */}
            <div className="glass-dark rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Son Kayıtlar</h3>
                {records.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">
                        Henüz yatırım kaydı yok. Yukarıdaki butona tıklayarak ekleyin.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Tarih</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Tür</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Tutar</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Kâr/Zarar</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Notlar</th>
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
                                        <td className="px-4 py-3 text-sm font-medium">
                                            {formatCurrency(Number(record.amount))}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`font-medium ${Number(record.profit_loss || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                {Number(record.profit_loss || 0) >= 0 ? '+' : ''}
                                                {formatCurrency(Number(record.profit_loss || 0))}
                                            </span>
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
