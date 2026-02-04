'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWallet } from '@/lib/wallet/WalletContext';
import { PsychologyMetric } from '@/types/database';
import { formatDate, formatDateForInput } from '@/lib/utils';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import { Plus, Trash2, Smile, Frown, Zap, Loader2 } from 'lucide-react';

export default function PsychologyPage() {
    const { session } = useWallet();
    const [metrics, setMetrics] = useState<PsychologyMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        date: formatDateForInput(),
        mood: '',
        stress: '',
        motivation: '',
        notes: '',
    });

    const fetchMetrics = useCallback(async () => {
        if (!session?.walletAddress) return;

        const supabase = createClient();
        const { data, error } = await supabase
            .from('psychology_metrics')
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

        const { error } = await supabase.from('psychology_metrics').upsert({
            wallet_address: session.walletAddress.toLowerCase(),
            date: formData.date,
            mood: formData.mood ? parseInt(formData.mood) : null,
            stress: formData.stress ? parseInt(formData.stress) : null,
            motivation: formData.motivation ? parseInt(formData.motivation) : null,
            notes: formData.notes || null,
        }, {
            onConflict: 'wallet_address,date',
        });

        if (!error) {
            setFormData({
                date: formatDateForInput(),
                mood: '',
                stress: '',
                motivation: '',
                notes: '',
            });
            setShowForm(false);
            fetchMetrics();
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        const supabase = createClient();
        await supabase.from('psychology_metrics').delete().eq('id', id);
        fetchMetrics();
    };

    const chartData = metrics
        .slice()
        .reverse()
        .map((m) => ({
            date: m.date,
            mood: m.mood || 0,
            stress: m.stress || 0,
            motivation: m.motivation || 0,
        }));

    const getMoodEmoji = (mood: number | null) => {
        if (!mood) return '😐';
        if (mood >= 8) return '😄';
        if (mood >= 6) return '🙂';
        if (mood >= 4) return '😐';
        if (mood >= 2) return '😔';
        return '😢';
    };

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
                    <h1 className="text-2xl font-bold">Psychology Metrics</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Track your mood, stress, and motivation levels
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn btn-primary"
                >
                    <Plus className="w-4 h-4" />
                    Add Entry
                </button>
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
                                <label className="block text-sm text-slate-400 mb-2">Mood (1-10)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={formData.mood}
                                    onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
                                    placeholder="7"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Stress (1-10)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={formData.stress}
                                    onChange={(e) => setFormData({ ...formData, stress: e.target.value })}
                                    placeholder="4"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Motivation (1-10)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={formData.motivation}
                                    onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                                    placeholder="8"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="How are you feeling mentally today?"
                                rows={2}
                            />
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
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="glass-dark rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                <Smile className="w-5 h-5 text-amber-400" />
                            </div>
                            <span className="text-slate-400">Average Mood</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <p className="text-3xl font-bold">
                                {(metrics.reduce((sum, m) => sum + Number(m.mood || 0), 0) / metrics.filter(m => m.mood).length || 0).toFixed(1)}
                            </p>
                            <span className="text-2xl">
                                {getMoodEmoji(Math.round(metrics.reduce((sum, m) => sum + Number(m.mood || 0), 0) / metrics.filter(m => m.mood).length) || null)}
                            </span>
                        </div>
                    </div>

                    <div className="glass-dark rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                                <Frown className="w-5 h-5 text-red-400" />
                            </div>
                            <span className="text-slate-400">Average Stress</span>
                        </div>
                        <p className="text-3xl font-bold">
                            {(metrics.reduce((sum, m) => sum + Number(m.stress || 0), 0) / metrics.filter(m => m.stress).length || 0).toFixed(1)}
                            <span className="text-lg text-slate-500 ml-1">/10</span>
                        </p>
                    </div>

                    <div className="glass-dark rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-slate-400">Average Motivation</span>
                        </div>
                        <p className="text-3xl font-bold">
                            {(metrics.reduce((sum, m) => sum + Number(m.motivation || 0), 0) / metrics.filter(m => m.motivation).length || 0).toFixed(1)}
                            <span className="text-lg text-slate-500 ml-1">/10</span>
                        </p>
                    </div>
                </div>
            )}

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Trend Chart</h3>
                    <TimeSeriesChart
                        data={chartData}
                        lines={[
                            { dataKey: 'mood', name: 'Mood', color: '#fbbf24' },
                            { dataKey: 'stress', name: 'Stress', color: '#f87171' },
                            { dataKey: 'motivation', name: 'Motivation', color: '#10b981' },
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
                        No data yet. Click the button above to add an entry.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700/50">
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Date</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Mood</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Stress</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Motivation</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Notes</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.map((metric) => (
                                    <tr key={metric.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                        <td className="px-4 py-3 text-sm">{formatDate(metric.date)}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className="flex items-center gap-2">
                                                {getMoodEmoji(metric.mood)}
                                                {metric.mood || '-'}/10
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`
                        px-2 py-1 rounded-full text-xs font-medium
                        ${(metric.stress || 0) <= 3 ? 'bg-emerald-500/20 text-emerald-400' :
                                                    (metric.stress || 0) <= 6 ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-red-500/20 text-red-400'}
                      `}>
                                                {metric.stress || '-'}/10
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">{metric.motivation || '-'}/10</td>
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
