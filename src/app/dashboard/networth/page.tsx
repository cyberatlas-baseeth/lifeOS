'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWallet } from '@/lib/wallet/WalletContext';
import { NetWorth } from '@/types/database';
import { formatDate, formatDateForInput, formatCurrency } from '@/lib/utils';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
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
        const supabase = createClient();

        const { error } = await supabase.from('net_worth').upsert({
            wallet_address: session.walletAddress.toLowerCase(),
            date: formData.date,
            total_assets: formData.total_assets ? parseFloat(formData.total_assets) : null,
            cash: formData.cash ? parseFloat(formData.cash) : null,
            notes: formData.notes || null,
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
            assets: Number(m.total_assets) || 0,
            cash: Number(m.cash) || 0,
        }));

    // Calculate change
    const latestAssets = metrics[0]?.total_assets ? Number(metrics[0].total_assets) : 0;
    const previousAssets = metrics[1]?.total_assets ? Number(metrics[1].total_assets) : 0;
    const assetChange = previousAssets ? ((latestAssets - previousAssets) / previousAssets) * 100 : 0;

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
                    <h1 className="text-2xl font-bold">Net Durum</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Toplam varlık ve nakit durumunu takip et
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn btn-primary"
                >
                    <Plus className="w-4 h-4" />
                    Veri Ekle
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="glass-dark rounded-2xl p-6 slide-in">
                    <h3 className="text-lg font-semibold mb-4">Yeni Kayıt</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid md:grid-cols-3 gap-4">
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
                                <label className="block text-sm text-slate-400 mb-2">Toplam Varlık (₺)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.total_assets}
                                    onChange={(e) => setFormData({ ...formData, total_assets: e.target.value })}
                                    placeholder="100000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Nakit (₺)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.cash}
                                    onChange={(e) => setFormData({ ...formData, cash: e.target.value })}
                                    placeholder="25000"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Notlar</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Ek bilgiler..."
                                rows={2}
                            />
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
            {metrics.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="glass-dark rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center">
                                <Wallet className="w-6 h-6 text-sky-400" />
                            </div>
                            <div>
                                <span className="text-slate-400 text-sm">Toplam Varlık</span>
                                {assetChange !== 0 && (
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${assetChange >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {assetChange >= 0 ? '+' : ''}{assetChange.toFixed(1)}%
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className="text-4xl font-bold">
                            {formatCurrency(latestAssets)}
                        </p>
                    </div>

                    <div className="glass-dark rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                <Banknote className="w-6 h-6 text-emerald-400" />
                            </div>
                            <span className="text-slate-400 text-sm">Nakit</span>
                        </div>
                        <p className="text-4xl font-bold">
                            {formatCurrency(metrics[0]?.cash ? Number(metrics[0].cash) : 0)}
                        </p>
                    </div>
                </div>
            )}

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Varlık Trendi</h3>
                    <TimeSeriesChart
                        data={chartData}
                        lines={[
                            { dataKey: 'assets', name: 'Toplam Varlık', color: '#38bdf8' },
                            { dataKey: 'cash', name: 'Nakit', color: '#10b981' },
                        ]}
                        height={300}
                    />
                </div>
            )}

            {/* Data Table */}
            <div className="glass-dark rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Son Kayıtlar</h3>
                {metrics.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">
                        Henüz veri yok. Yukarıdaki butona tıklayarak veri ekleyin.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Tarih</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Toplam Varlık</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Nakit</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Notlar</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.map((metric) => (
                                    <tr key={metric.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                        <td className="px-4 py-3 text-sm">{formatDate(metric.date)}</td>
                                        <td className="px-4 py-3 text-sm font-medium">
                                            {formatCurrency(Number(metric.total_assets) || 0)}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {formatCurrency(Number(metric.cash) || 0)}
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
