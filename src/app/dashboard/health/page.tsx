'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWallet } from '@/lib/wallet/WalletContext';
import { HealthMetric } from '@/types/database';
import { formatDate, formatDateForInput } from '@/lib/utils';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import { Plus, Trash2, Moon, Activity as ActivityIcon, Heart, Loader2 } from 'lucide-react';

export default function HealthPage() {
    const { session } = useWallet();
    const [metrics, setMetrics] = useState<HealthMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        date: formatDateForInput(),
        sleep_hours: '',
        activity_level: '',
        health_score: '',
        notes: '',
    });

    const fetchMetrics = useCallback(async () => {
        if (!session?.walletAddress) return;

        const supabase = createClient();
        const { data, error } = await supabase
            .from('health_metrics')
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

        const { error } = await supabase.from('health_metrics').upsert({
            wallet_address: session.walletAddress.toLowerCase(),
            date: formData.date,
            sleep_hours: formData.sleep_hours ? parseFloat(formData.sleep_hours) : null,
            activity_level: formData.activity_level ? parseInt(formData.activity_level) : null,
            health_score: formData.health_score ? parseInt(formData.health_score) : null,
            notes: formData.notes || null,
        }, {
            onConflict: 'wallet_address,date',
        });

        if (!error) {
            setFormData({
                date: formatDateForInput(),
                sleep_hours: '',
                activity_level: '',
                health_score: '',
                notes: '',
            });
            setShowForm(false);
            fetchMetrics();
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        const supabase = createClient();
        await supabase.from('health_metrics').delete().eq('id', id);
        fetchMetrics();
    };

    const chartData = metrics
        .slice()
        .reverse()
        .map((m) => ({
            date: m.date,
            sleep: m.sleep_hours || 0,
            activity: m.activity_level || 0,
            score: m.health_score || 0,
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
                    <h1 className="text-2xl font-bold">Sağlık Metrikleri</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Uyku, aktivite ve genel sağlık durumunu takip et
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
                                <label className="block text-sm text-slate-400 mb-2">Uyku (saat)</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="24"
                                    value={formData.sleep_hours}
                                    onChange={(e) => setFormData({ ...formData, sleep_hours: e.target.value })}
                                    placeholder="7.5"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Aktivite (1-10)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={formData.activity_level}
                                    onChange={(e) => setFormData({ ...formData, activity_level: e.target.value })}
                                    placeholder="5"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Sağlık Skoru (0-100)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.health_score}
                                    onChange={(e) => setFormData({ ...formData, health_score: e.target.value })}
                                    placeholder="75"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Notlar</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Bugün nasıl hissediyorsun?"
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
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="glass-dark rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                <Moon className="w-5 h-5 text-violet-400" />
                            </div>
                            <span className="text-slate-400">Ortalama Uyku</span>
                        </div>
                        <p className="text-3xl font-bold">
                            {(metrics.reduce((sum, m) => sum + Number(m.sleep_hours || 0), 0) / metrics.filter(m => m.sleep_hours).length || 0).toFixed(1)}
                            <span className="text-lg text-slate-500 ml-1">saat</span>
                        </p>
                    </div>

                    <div className="glass-dark rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                                <ActivityIcon className="w-5 h-5 text-sky-400" />
                            </div>
                            <span className="text-slate-400">Ortalama Aktivite</span>
                        </div>
                        <p className="text-3xl font-bold">
                            {(metrics.reduce((sum, m) => sum + Number(m.activity_level || 0), 0) / metrics.filter(m => m.activity_level).length || 0).toFixed(1)}
                            <span className="text-lg text-slate-500 ml-1">/10</span>
                        </p>
                    </div>

                    <div className="glass-dark rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <Heart className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-slate-400">Ortalama Skor</span>
                        </div>
                        <p className="text-3xl font-bold">
                            {(metrics.reduce((sum, m) => sum + Number(m.health_score || 0), 0) / metrics.filter(m => m.health_score).length || 0).toFixed(0)}
                            <span className="text-lg text-slate-500 ml-1">/100</span>
                        </p>
                    </div>
                </div>
            )}

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Trend Grafiği</h3>
                    <TimeSeriesChart
                        data={chartData}
                        lines={[
                            { dataKey: 'sleep', name: 'Uyku (saat)', color: '#8b5cf6' },
                            { dataKey: 'activity', name: 'Aktivite', color: '#38bdf8' },
                        ]}
                        height={300}
                    />
                </div>
            )}

            {/* Health Score Chart */}
            {chartData.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Sağlık Skoru</h3>
                    <TimeSeriesChart
                        data={chartData}
                        lines={[
                            { dataKey: 'score', name: 'Sağlık Skoru', color: '#10b981' },
                        ]}
                        height={250}
                        showLegend={false}
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
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Uyku</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Aktivite</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Skor</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Notlar</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.map((metric) => (
                                    <tr key={metric.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                        <td className="px-4 py-3 text-sm">{formatDate(metric.date)}</td>
                                        <td className="px-4 py-3 text-sm">{metric.sleep_hours || '-'} saat</td>
                                        <td className="px-4 py-3 text-sm">{metric.activity_level || '-'}/10</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`
                        px-2 py-1 rounded-full text-xs font-medium
                        ${(metric.health_score || 0) >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                                                    (metric.health_score || 0) >= 40 ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-red-500/20 text-red-400'}
                      `}>
                                                {metric.health_score || '-'}
                                            </span>
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
