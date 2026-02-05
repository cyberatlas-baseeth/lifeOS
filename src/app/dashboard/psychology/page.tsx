'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWallet } from '@/lib/wallet/WalletContext';
import { PsychologyMetric, StressLevel, MotivationLevel, FatigueLevel } from '@/types/database';
import { formatDate, formatDateForInput } from '@/lib/utils';
import {
    calculateMentalScore,
    getMentalScoreBreakdown,
    STRESS_LABELS,
    MOTIVATION_LABELS,
    FATIGUE_LABELS,
    STRESS_DESCRIPTION,
    MOTIVATION_DESCRIPTION,
    FATIGUE_DESCRIPTION,
    MENTAL_SCORE_DESCRIPTION,
    getMentalStateLabel,
} from '@/lib/mentalScore';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import { Plus, Trash2, Brain, Zap, AlertTriangle, Loader2, Info, X, Pencil } from 'lucide-react';

interface FormData {
    date: string;
    stress_level: StressLevel | '';
    motivation_level: MotivationLevel | '';
    mental_fatigue: FatigueLevel | '';
    notes: string;
}

const initialFormData: FormData = {
    date: formatDateForInput(),
    stress_level: '',
    motivation_level: '',
    mental_fatigue: '',
    notes: '',
};

export default function PsychologyPage() {
    const { session } = useWallet();
    const [metrics, setMetrics] = useState<PsychologyMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [formData, setFormData] = useState<FormData>(initialFormData);

    // Calculate mental score in real-time
    const scoreBreakdown = useMemo(() => getMentalScoreBreakdown(
        formData.stress_level || null,
        formData.motivation_level || null,
        formData.mental_fatigue || null
    ), [formData.stress_level, formData.motivation_level, formData.mental_fatigue]);

    const calculatedScore = useMemo(() => {
        if (!formData.stress_level || !formData.motivation_level || !formData.mental_fatigue) {
            return null;
        }
        return calculateMentalScore(formData.stress_level, formData.motivation_level, formData.mental_fatigue);
    }, [formData.stress_level, formData.motivation_level, formData.mental_fatigue]);

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
        if (!formData.stress_level || !formData.motivation_level || !formData.mental_fatigue) return;

        setSaving(true);
        const supabase = createClient();

        const mentalScore = calculateMentalScore(
            formData.stress_level,
            formData.motivation_level,
            formData.mental_fatigue
        );

        const { error } = await supabase.from('psychology_metrics').upsert({
            wallet_address: session.walletAddress.toLowerCase(),
            date: formData.date,
            stress_level: formData.stress_level,
            motivation_level: formData.motivation_level,
            mental_fatigue: formData.mental_fatigue,
            mental_score: mentalScore,
            notes: formData.notes || null,
        }, {
            onConflict: 'wallet_address,date',
        });

        if (!error) {
            setFormData(initialFormData);
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

    const handleEdit = (metric: PsychologyMetric) => {
        setFormData({
            date: metric.date,
            stress_level: metric.stress_level || '',
            motivation_level: metric.motivation_level || '',
            mental_fatigue: metric.mental_fatigue || '',
            notes: metric.notes || '',
        });
        setShowForm(true);
    };

    const chartData = metrics
        .slice()
        .reverse()
        .map((m) => ({
            date: m.date,
            mentalScore: m.mental_score || 0,
        }));

    // Calculate averages
    const avgMentalScore = metrics.filter(m => m.mental_score).length > 0
        ? metrics.reduce((sum, m) => sum + (m.mental_score || 0), 0) / metrics.filter(m => m.mental_score).length
        : 0;

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
                    <h1 className="text-2xl font-bold">Mental State</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {MENTAL_SCORE_DESCRIPTION}
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
                        {/* Row 1: Date */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                                className="max-w-xs"
                            />
                        </div>

                        {/* Row 2: Stress Level */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">
                                    Stress Level
                                    <span className="ml-2 text-xs text-slate-500">({STRESS_DESCRIPTION})</span>
                                </label>
                                <select
                                    value={formData.stress_level}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        stress_level: e.target.value as StressLevel | ''
                                    })}
                                    className="w-full"
                                    required
                                >
                                    <option value="">Select stress level</option>
                                    <option value="calm">Calm</option>
                                    <option value="mild">Mild</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                {formData.stress_level && (
                                    <div className={`
                                        px-4 py-2 rounded-lg text-sm font-medium
                                        ${formData.stress_level === 'calm' ? 'bg-emerald-500/20 text-emerald-400' :
                                            formData.stress_level === 'mild' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-red-500/20 text-red-400'}
                                    `}>
                                        Penalty: -{scoreBreakdown.stressPenalty}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 3: Motivation Level */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">
                                    Motivation
                                    <span className="ml-2 text-xs text-slate-500">({MOTIVATION_DESCRIPTION})</span>
                                </label>
                                <select
                                    value={formData.motivation_level}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        motivation_level: e.target.value as MotivationLevel | ''
                                    })}
                                    className="w-full"
                                    required
                                >
                                    <option value="">Select motivation level</option>
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                {formData.motivation_level && (
                                    <div className={`
                                        px-4 py-2 rounded-lg text-sm font-medium
                                        ${formData.motivation_level === 'high' ? 'bg-emerald-500/20 text-emerald-400' :
                                            formData.motivation_level === 'medium' ? 'bg-sky-500/20 text-sky-400' :
                                                'bg-amber-500/20 text-amber-400'}
                                    `}>
                                        Bonus: +{scoreBreakdown.motivationBonus}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 4: Mental Fatigue */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">
                                    Mental Fatigue
                                    <span className="ml-2 text-xs text-slate-500">({FATIGUE_DESCRIPTION})</span>
                                </label>
                                <select
                                    value={formData.mental_fatigue}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        mental_fatigue: e.target.value as FatigueLevel | ''
                                    })}
                                    className="w-full"
                                    required
                                >
                                    <option value="">Select fatigue level</option>
                                    <option value="fresh">Fresh</option>
                                    <option value="tired">Tired</option>
                                    <option value="exhausted">Exhausted</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                {formData.mental_fatigue && (
                                    <div className={`
                                        px-4 py-2 rounded-lg text-sm font-medium
                                        ${formData.mental_fatigue === 'fresh' ? 'bg-emerald-500/20 text-emerald-400' :
                                            formData.mental_fatigue === 'tired' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-red-500/20 text-red-400'}
                                    `}>
                                        Penalty: -{scoreBreakdown.fatiguePenalty}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 5: Mental Score Preview */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="How are you feeling mentally today?"
                                    rows={2}
                                    className="w-full"
                                />
                            </div>
                            <div className="relative">
                                <label className="block text-sm text-slate-400 mb-2 flex items-center gap-2">
                                    Mental Score
                                    <button
                                        type="button"
                                        onClick={() => setShowTooltip(!showTooltip)}
                                        className="text-slate-500 hover:text-primary-400 transition-colors"
                                    >
                                        <Info className="w-4 h-4" />
                                    </button>
                                </label>
                                <div className={`
                                    w-full px-4 py-3 rounded-xl font-bold text-lg text-center
                                    ${calculatedScore === null ? 'bg-slate-700/50 text-slate-500' :
                                        calculatedScore >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                                            calculatedScore >= 40 ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-red-500/20 text-red-400'}
                                `}>
                                    {calculatedScore !== null ? `${calculatedScore}/100` : 'Select all fields'}
                                </div>

                                {/* Tooltip */}
                                {showTooltip && (
                                    <div className="absolute top-full left-0 mt-2 p-4 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 w-72">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-semibold text-sm">How is this calculated?</span>
                                            <button
                                                type="button"
                                                onClick={() => setShowTooltip(false)}
                                                className="text-slate-500 hover:text-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Base Score</span>
                                                <span className="text-white">100</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-red-400">Stress Penalty</span>
                                                <span className="text-red-400">-{scoreBreakdown.stressPenalty}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-red-400">Fatigue Penalty</span>
                                                <span className="text-red-400">-{scoreBreakdown.fatiguePenalty}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-emerald-400">Motivation Bonus</span>
                                                <span className="text-emerald-400">+{scoreBreakdown.motivationBonus}</span>
                                            </div>
                                            <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between font-semibold">
                                                <span>Total</span>
                                                <span className="text-emerald-400">{scoreBreakdown.finalScore}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
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
                                disabled={saving || calculatedScore === null}
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
                            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                <Brain className="w-5 h-5 text-violet-400" />
                            </div>
                            <span className="text-slate-400">Mental Score</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <p className="text-3xl font-bold">
                                {avgMentalScore.toFixed(0)}
                            </p>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium
                                ${avgMentalScore >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                                    avgMentalScore >= 40 ? 'bg-amber-500/20 text-amber-400' :
                                        'bg-red-500/20 text-red-400'}
                            `}>
                                {getMentalStateLabel(avgMentalScore)}
                            </span>
                        </div>
                    </div>

                    <div className="glass-dark rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-slate-400">Total Entries</span>
                        </div>
                        <p className="text-3xl font-bold">
                            {metrics.length}
                        </p>
                    </div>

                    <div className="glass-dark rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            </div>
                            <span className="text-slate-400">High Stress Days</span>
                        </div>
                        <p className="text-3xl font-bold">
                            {metrics.filter(m => m.stress_level === 'high').length}
                        </p>
                    </div>
                </div>
            )}

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Mental Score Trend</h3>
                    <TimeSeriesChart
                        data={chartData}
                        lines={[
                            { dataKey: 'mentalScore', name: 'Mental Score', color: '#8b5cf6' },
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
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Stress</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Motivation</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Fatigue</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Score</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Notes</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.map((metric) => (
                                    <tr key={metric.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                        <td className="px-4 py-3 text-sm">{formatDate(metric.date)}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`
                                                px-2 py-1 rounded-full text-xs font-medium
                                                ${metric.stress_level === 'calm' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    metric.stress_level === 'mild' ? 'bg-amber-500/20 text-amber-400' :
                                                        metric.stress_level === 'high' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-slate-500/20 text-slate-400'}
                                            `}>
                                                {metric.stress_level ? STRESS_LABELS[metric.stress_level] : '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`
                                                px-2 py-1 rounded-full text-xs font-medium
                                                ${metric.motivation_level === 'high' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    metric.motivation_level === 'medium' ? 'bg-sky-500/20 text-sky-400' :
                                                        metric.motivation_level === 'low' ? 'bg-amber-500/20 text-amber-400' :
                                                            'bg-slate-500/20 text-slate-400'}
                                            `}>
                                                {metric.motivation_level ? MOTIVATION_LABELS[metric.motivation_level] : '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`
                                                px-2 py-1 rounded-full text-xs font-medium
                                                ${metric.mental_fatigue === 'fresh' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    metric.mental_fatigue === 'tired' ? 'bg-amber-500/20 text-amber-400' :
                                                        metric.mental_fatigue === 'exhausted' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-slate-500/20 text-slate-400'}
                                            `}>
                                                {metric.mental_fatigue ? FATIGUE_LABELS[metric.mental_fatigue] : '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`
                                                px-2 py-1 rounded-full text-xs font-medium
                                                ${(metric.mental_score || 0) >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                                                    (metric.mental_score || 0) >= 40 ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-red-500/20 text-red-400'}
                                            `}>
                                                {metric.mental_score || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400 max-w-xs truncate">
                                            {metric.notes || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleEdit(metric)}
                                                    className="p-2 rounded-lg hover:bg-primary-500/20 text-slate-500 hover:text-primary-400 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(metric.id)}
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
