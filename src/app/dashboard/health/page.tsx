'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWallet } from '@/lib/wallet/WalletContext';
import { HealthMetric, MealQuality, ProcessedFoodLevel, WaterIntake, IllnessStatus, ActivityLevel } from '@/types/database';
import { formatDate, formatDateForInput } from '@/lib/utils';
import {
    calculateHealthScore,
    getHealthScoreBreakdown,
    HealthScoreInput,
    ACTIVITY_LABELS,
    SLEEP_OPTIONS,
    SleepDuration,
    calculateSleepScore,
    calculateActivityScore
} from '@/lib/healthScore';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import { Plus, Trash2, Moon, Activity as ActivityIcon, Heart, Loader2, Info, X } from 'lucide-react';

interface FormData {
    date: string;
    sleep_hours: SleepDuration | '';
    activity_level: ActivityLevel | '';
    meal_quality: MealQuality | '';
    processed_food_level: ProcessedFoodLevel | '';
    water_intake: WaterIntake | '';
    illness_status: IllnessStatus | '';
    notes: string;
}

const initialFormData: FormData = {
    date: formatDateForInput(),
    sleep_hours: '',
    activity_level: '',
    meal_quality: '',
    processed_food_level: '',
    water_intake: '',
    illness_status: '',
    notes: '',
};

export default function HealthPage() {
    const { session } = useWallet();
    const [metrics, setMetrics] = useState<HealthMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [formData, setFormData] = useState<FormData>(initialFormData);

    // Calculate health score in real-time
    const scoreInput: HealthScoreInput = useMemo(() => ({
        sleepHours: formData.sleep_hours || null,
        activityLevel: formData.activity_level || null,
        mealQuality: formData.meal_quality || null,
        waterIntake: formData.water_intake || null,
        processedFoodLevel: formData.processed_food_level || null,
        illnessStatus: formData.illness_status || null,
    }), [formData]);

    const scoreBreakdown = useMemo(() => getHealthScoreBreakdown(scoreInput), [scoreInput]);
    const calculatedScore = scoreBreakdown.finalScore;

    // Real-time score displays for individual fields
    const currentSleepScore = formData.sleep_hours ? calculateSleepScore(formData.sleep_hours) : null;
    const currentActivityScore = formData.activity_level ? calculateActivityScore(formData.activity_level) : null;

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
            sleep_hours: formData.sleep_hours || null,
            activity_level: formData.activity_level || null,
            health_score: calculatedScore,
            meal_quality: formData.meal_quality || null,
            processed_food_level: formData.processed_food_level || null,
            water_intake: formData.water_intake || null,
            illness_status: formData.illness_status || null,
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
        await supabase.from('health_metrics').delete().eq('id', id);
        fetchMetrics();
    };

    const chartData = metrics
        .slice()
        .reverse()
        .map((m) => ({
            date: m.date,
            sleep: m.sleep_hours || 0,
            activity: (m.activity_level || 3) * 20,
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
                    <h1 className="text-2xl font-bold">Health Metrics</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Track your sleep, activity, nutrition, and overall health
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

                        {/* Row 2: Sleep Duration (Dropdown) */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">
                                    Sleep Duration
                                    <span className="ml-2 text-xs text-slate-500">(7–9 hours is optimal for adults)</span>
                                </label>
                                <select
                                    value={formData.sleep_hours}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        sleep_hours: e.target.value ? parseFloat(e.target.value) as SleepDuration : ''
                                    })}
                                    className="w-full"
                                >
                                    <option value="">Select sleep duration</option>
                                    {SLEEP_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                {currentSleepScore !== null && (
                                    <div className={`
                                        px-4 py-2 rounded-lg text-sm font-medium
                                        ${currentSleepScore >= 85 ? 'bg-emerald-500/20 text-emerald-400' :
                                            currentSleepScore >= 65 ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-red-500/20 text-red-400'}
                                    `}>
                                        Sleep score: {currentSleepScore}/100
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 3: Activity Level (Dropdown with numbers) */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Activity Level</label>
                                <select
                                    value={formData.activity_level}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        activity_level: e.target.value ? parseInt(e.target.value) as ActivityLevel : ''
                                    })}
                                    className="w-full"
                                >
                                    <option value="">Select activity level</option>
                                    {([1, 2, 3, 4, 5] as ActivityLevel[]).map((level) => (
                                        <option key={level} value={level}>{ACTIVITY_LABELS[level]}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                {currentActivityScore !== null && (
                                    <div className={`
                                        px-4 py-2 rounded-lg text-sm font-medium
                                        ${currentActivityScore >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                                            currentActivityScore >= 60 ? 'bg-sky-500/20 text-sky-400' :
                                                currentActivityScore >= 40 ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-red-500/20 text-red-400'}
                                    `}>
                                        Activity score: {currentActivityScore}/100
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 4: Nutrition */}
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Meal Quality</label>
                                <select
                                    value={formData.meal_quality}
                                    onChange={(e) => setFormData({ ...formData, meal_quality: e.target.value as MealQuality | '' })}
                                    className="w-full"
                                >
                                    <option value="">Select</option>
                                    <option value="poor">Poor</option>
                                    <option value="normal">Normal</option>
                                    <option value="good">Good</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Processed Food</label>
                                <select
                                    value={formData.processed_food_level}
                                    onChange={(e) => setFormData({ ...formData, processed_food_level: e.target.value as ProcessedFoodLevel | '' })}
                                    className="w-full"
                                >
                                    <option value="">Select</option>
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Water Intake</label>
                                <select
                                    value={formData.water_intake}
                                    onChange={(e) => setFormData({ ...formData, water_intake: e.target.value as WaterIntake | '' })}
                                    className="w-full"
                                >
                                    <option value="">Select</option>
                                    <option value="low">Low</option>
                                    <option value="adequate">Adequate</option>
                                    <option value="good">Good</option>
                                </select>
                            </div>
                        </div>

                        {/* Row 5: Illness + Calculated Score */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Illness Status</label>
                                <select
                                    value={formData.illness_status}
                                    onChange={(e) => setFormData({ ...formData, illness_status: e.target.value as IllnessStatus | '' })}
                                    className="w-full"
                                >
                                    <option value="">Select</option>
                                    <option value="none">None</option>
                                    <option value="mild">Mild</option>
                                    <option value="severe">Severe</option>
                                </select>
                            </div>
                            <div className="relative">
                                <label className="block text-sm text-slate-400 mb-2 flex items-center gap-2">
                                    Health Score
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
                                    ${calculatedScore >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                                        calculatedScore >= 40 ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-red-500/20 text-red-400'}
                                `}>
                                    {calculatedScore}/100
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
                                                <span className="text-slate-400">Sleep (×0.40)</span>
                                                <span className="text-violet-400">{scoreBreakdown.sleepScore}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Activity (×0.30)</span>
                                                <span className="text-sky-400">{scoreBreakdown.activityScore}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Nutrition (×0.30)</span>
                                                <span className="text-amber-400">{scoreBreakdown.nutritionScore}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Illness Penalty</span>
                                                <span className="text-red-400">-{scoreBreakdown.illnessPenalty}</span>
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

                        {/* Notes */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="How are you feeling today?"
                                rows={2}
                            />
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
                            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                <Moon className="w-5 h-5 text-violet-400" />
                            </div>
                            <span className="text-slate-400">Avg Sleep</span>
                        </div>
                        <p className="text-3xl font-bold">
                            {(metrics.reduce((sum, m) => sum + Number(m.sleep_hours || 0), 0) / metrics.filter(m => m.sleep_hours).length || 0).toFixed(1)}
                            <span className="text-lg text-slate-500 ml-1">hrs</span>
                        </p>
                    </div>

                    <div className="glass-dark rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                                <ActivityIcon className="w-5 h-5 text-sky-400" />
                            </div>
                            <span className="text-slate-400">Avg Activity</span>
                        </div>
                        <p className="text-3xl font-bold">
                            {(metrics.reduce((sum, m) => sum + Number(m.activity_level || 0), 0) / metrics.filter(m => m.activity_level).length || 0).toFixed(1)}
                            <span className="text-lg text-slate-500 ml-1">/5</span>
                        </p>
                    </div>

                    <div className="glass-dark rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <Heart className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-slate-400">Avg Score</span>
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
                    <h3 className="text-lg font-semibold mb-4">Trend Chart</h3>
                    <TimeSeriesChart
                        data={chartData}
                        lines={[
                            { dataKey: 'sleep', name: 'Sleep (hrs)', color: '#8b5cf6' },
                            { dataKey: 'activity', name: 'Activity', color: '#38bdf8' },
                        ]}
                        height={300}
                    />
                </div>
            )}

            {/* Health Score Chart */}
            {chartData.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Health Score</h3>
                    <TimeSeriesChart
                        data={chartData}
                        lines={[
                            { dataKey: 'score', name: 'Health Score', color: '#10b981' },
                        ]}
                        height={250}
                        showLegend={false}
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
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Sleep</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Activity</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Nutrition</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Illness</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Score</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.map((metric) => (
                                    <tr key={metric.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                        <td className="px-4 py-3 text-sm">{formatDate(metric.date)}</td>
                                        <td className="px-4 py-3 text-sm">{metric.sleep_hours || '-'} hrs</td>
                                        <td className="px-4 py-3 text-sm">{metric.activity_level || '-'}/5</td>
                                        <td className="px-4 py-3 text-sm">
                                            {metric.meal_quality ? (
                                                <span className={`
                                                    px-2 py-1 rounded-full text-xs font-medium
                                                    ${metric.meal_quality === 'good' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        metric.meal_quality === 'normal' ? 'bg-amber-500/20 text-amber-400' :
                                                            'bg-red-500/20 text-red-400'}
                                                `}>
                                                    {metric.meal_quality}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {metric.illness_status && metric.illness_status !== 'none' ? (
                                                <span className={`
                                                    px-2 py-1 rounded-full text-xs font-medium
                                                    ${metric.illness_status === 'mild' ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-red-500/20 text-red-400'}
                                                `}>
                                                    {metric.illness_status}
                                                </span>
                                            ) : (
                                                <span className="text-slate-500">None</span>
                                            )}
                                        </td>
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
