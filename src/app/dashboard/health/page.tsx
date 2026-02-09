'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWallet } from '@/lib/wallet/WalletContext';
import {
    HealthMetric,
    MealQuality,
    ProcessedFoodLevel,
    WaterIntake,
    IllnessStatus,
    ActivityLevel,
    SleepRegularity,
    StressLevel,
    MotivationLevel,
    FatigueLevel,
    AlcoholLevel,
    ScreenTime,
} from '@/types/database';
import { formatDate, formatDateForInput } from '@/lib/utils';
import {
    getHealthScoreBreakdown,
    HealthScoreInput,
    ACTIVITY_LABELS,
    SLEEP_OPTIONS,
    SleepDuration,
    BEDTIME_OPTIONS,
    REGULARITY_LABELS,
    STRESS_LABELS,
    MOTIVATION_LABELS,
    FATIGUE_LABELS,
    ALCOHOL_LABELS,
    SCREEN_TIME_LABELS,
    CATEGORY_WEIGHTS,
    getHealthStateLabel,
} from '@/lib/healthScore';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import { Plus, Trash2, Moon, Activity as ActivityIcon, Heart, Loader2, Info, X, Pencil, Brain, Wine, Cigarette, Monitor, Droplets, Utensils, Clock } from 'lucide-react';

interface FormData {
    date: string;
    // Sleep
    sleep_hours: SleepDuration | '';
    bedtime: string;
    sleep_regularity: SleepRegularity | '';
    // Activity
    activity_level: ActivityLevel | '';
    // Nutrition
    meal_quality: MealQuality | '';
    processed_food_level: ProcessedFoodLevel | '';
    // Hydration
    water_intake: WaterIntake | '';
    // Mental State
    stress_level: StressLevel | '';
    motivation_level: MotivationLevel | '';
    mental_fatigue: FatigueLevel | '';
    // Extras
    alcohol_units: AlcoholLevel | '';
    smoking: boolean;
    screen_time: ScreenTime | '';
    // Illness
    illness_status: IllnessStatus | '';
}

const initialFormData: FormData = {
    date: formatDateForInput(),
    sleep_hours: '',
    bedtime: '',
    sleep_regularity: '',
    activity_level: '',
    meal_quality: '',
    processed_food_level: '',
    water_intake: '',
    stress_level: '',
    motivation_level: '',
    mental_fatigue: '',
    alcohol_units: '',
    smoking: false,
    screen_time: '',
    illness_status: '',
};

export default function HealthPage() {
    const { session } = useWallet();
    const [metrics, setMetrics] = useState<HealthMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);

    // Calculate health score in real-time
    const scoreInput: HealthScoreInput = useMemo(() => ({
        sleepHours: formData.sleep_hours || null,
        bedtime: formData.bedtime || null,
        sleepRegularity: formData.sleep_regularity || null,
        activityLevel: formData.activity_level || null,
        mealQuality: formData.meal_quality || null,
        processedFoodLevel: formData.processed_food_level || null,
        waterIntake: formData.water_intake || null,
        stressLevel: formData.stress_level || null,
        motivationLevel: formData.motivation_level || null,
        mentalFatigue: formData.mental_fatigue || null,
        alcoholUnits: formData.alcohol_units || null,
        smoking: formData.smoking,
        screenTime: formData.screen_time || null,
        illnessStatus: formData.illness_status || null,
    }), [formData]);

    const scoreBreakdown = useMemo(() => getHealthScoreBreakdown(scoreInput), [scoreInput]);
    const calculatedScore = scoreBreakdown.finalScore;

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

        const recordData = {
            wallet_address: session.walletAddress.toLowerCase(),
            date: formData.date,
            sleep_hours: formData.sleep_hours || null,
            bedtime: formData.bedtime || null,
            sleep_regularity: formData.sleep_regularity || null,
            activity_level: formData.activity_level || null,
            meal_quality: formData.meal_quality || null,
            processed_food_level: formData.processed_food_level || null,
            water_intake: formData.water_intake || null,
            stress_level: formData.stress_level || null,
            motivation_level: formData.motivation_level || null,
            mental_fatigue: formData.mental_fatigue || null,
            alcohol_units: formData.alcohol_units || null,
            smoking: formData.smoking,
            screen_time: formData.screen_time || null,
            illness_status: formData.illness_status || null,
            health_score: calculatedScore,
        };

        const { error } = await supabase.from('health_metrics').upsert(recordData, {
            onConflict: 'wallet_address,date',
        });

        if (!error) {
            setFormData(initialFormData);
            setShowForm(false);
            setEditingId(null);
            fetchMetrics();
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        const supabase = createClient();
        await supabase.from('health_metrics').delete().eq('id', id);
        fetchMetrics();
    };

    const handleEdit = (metric: HealthMetric) => {
        setFormData({
            date: metric.date,
            sleep_hours: metric.sleep_hours as SleepDuration || '',
            bedtime: metric.bedtime || '',
            sleep_regularity: metric.sleep_regularity || '',
            activity_level: metric.activity_level || '',
            meal_quality: metric.meal_quality || '',
            processed_food_level: metric.processed_food_level || '',
            water_intake: metric.water_intake || '',
            stress_level: metric.stress_level || '',
            motivation_level: metric.motivation_level || '',
            mental_fatigue: metric.mental_fatigue || '',
            alcohol_units: metric.alcohol_units || '',
            smoking: metric.smoking || false,
            screen_time: metric.screen_time || '',
            illness_status: metric.illness_status || '',
        });
        setEditingId(metric.id);
        setShowForm(true);
    };

    const handleCancel = () => {
        setFormData(initialFormData);
        setShowForm(false);
        setEditingId(null);
    };

    const chartData = metrics
        .slice()
        .reverse()
        .map((m) => ({
            date: m.date,
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
                        Track all aspects of your health with our 7-category scoring system
                    </p>
                </div>
                <button
                    onClick={() => {
                        setFormData(initialFormData);
                        setEditingId(null);
                        setShowForm(!showForm);
                    }}
                    className="btn btn-primary"
                >
                    <Plus className="w-4 h-4" />
                    Add Entry
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="glass-dark rounded-2xl p-6 slide-in">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">
                            {editingId ? 'Edit Entry' : 'New Entry'}
                        </h3>
                        <button onClick={handleCancel} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Date */}
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

                        {/* Section 1 & 2: Sleep */}
                        <div className="p-4 bg-violet-500/10 rounded-xl border border-violet-500/20">
                            <div className="flex items-center gap-2 mb-4">
                                <Moon className="w-5 h-5 text-violet-400" />
                                <h4 className="font-medium text-violet-300">Sleep (25%)</h4>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Duration (10%)</label>
                                    <select
                                        value={formData.sleep_hours}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            sleep_hours: e.target.value ? parseFloat(e.target.value) as SleepDuration : ''
                                        })}
                                        className="w-full"
                                    >
                                        <option value="">Select</option>
                                        {SLEEP_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Bedtime (15%)</label>
                                    <select
                                        value={formData.bedtime}
                                        onChange={(e) => setFormData({ ...formData, bedtime: e.target.value })}
                                        className="w-full"
                                    >
                                        <option value="">Select</option>
                                        {BEDTIME_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Regularity</label>
                                    <select
                                        value={formData.sleep_regularity}
                                        onChange={(e) => setFormData({ ...formData, sleep_regularity: e.target.value as SleepRegularity | '' })}
                                        className="w-full"
                                    >
                                        <option value="">Select</option>
                                        {(Object.keys(REGULARITY_LABELS) as SleepRegularity[]).map((key) => (
                                            <option key={key} value={key}>{REGULARITY_LABELS[key]}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Physical Activity */}
                        <div className="p-4 bg-sky-500/10 rounded-xl border border-sky-500/20">
                            <div className="flex items-center gap-2 mb-4">
                                <ActivityIcon className="w-5 h-5 text-sky-400" />
                                <h4 className="font-medium text-sky-300">Physical Activity (20%)</h4>
                            </div>
                            <select
                                value={formData.activity_level}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    activity_level: e.target.value ? parseInt(e.target.value) as ActivityLevel : ''
                                })}
                                className="w-full md:w-1/2"
                            >
                                <option value="">Select activity level</option>
                                {([1, 2, 3, 4, 5] as ActivityLevel[]).map((level) => (
                                    <option key={level} value={level}>{ACTIVITY_LABELS[level]}</option>
                                ))}
                            </select>
                        </div>

                        {/* Section 4 & 5: Nutrition & Hydration */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                <div className="flex items-center gap-2 mb-4">
                                    <Utensils className="w-5 h-5 text-amber-400" />
                                    <h4 className="font-medium text-amber-300">Nutrition (20%)</h4>
                                </div>
                                <div className="space-y-3">
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
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                                <div className="flex items-center gap-2 mb-4">
                                    <Droplets className="w-5 h-5 text-cyan-400" />
                                    <h4 className="font-medium text-cyan-300">Hydration (10%)</h4>
                                </div>
                                <label className="block text-sm text-slate-400 mb-2">Water Intake</label>
                                <select
                                    value={formData.water_intake}
                                    onChange={(e) => setFormData({ ...formData, water_intake: e.target.value as WaterIntake | '' })}
                                    className="w-full"
                                >
                                    <option value="">Select</option>
                                    <option value="low">Low (&lt;1.5L)</option>
                                    <option value="adequate">Adequate (1.5–2.5L)</option>
                                    <option value="good">Good (2.5–3.5L)</option>
                                </select>
                            </div>
                        </div>

                        {/* Section 6: Mental State */}
                        <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                            <div className="flex items-center gap-2 mb-4">
                                <Brain className="w-5 h-5 text-purple-400" />
                                <h4 className="font-medium text-purple-300">Mental State (15%)</h4>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Stress Level</label>
                                    <select
                                        value={formData.stress_level}
                                        onChange={(e) => setFormData({ ...formData, stress_level: e.target.value as StressLevel | '' })}
                                        className="w-full"
                                    >
                                        <option value="">Select</option>
                                        {(Object.keys(STRESS_LABELS) as StressLevel[]).map((key) => (
                                            <option key={key} value={key}>{STRESS_LABELS[key]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Motivation</label>
                                    <select
                                        value={formData.motivation_level}
                                        onChange={(e) => setFormData({ ...formData, motivation_level: e.target.value as MotivationLevel | '' })}
                                        className="w-full"
                                    >
                                        <option value="">Select</option>
                                        {(Object.keys(MOTIVATION_LABELS) as MotivationLevel[]).map((key) => (
                                            <option key={key} value={key}>{MOTIVATION_LABELS[key]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Mental Fatigue</label>
                                    <select
                                        value={formData.mental_fatigue}
                                        onChange={(e) => setFormData({ ...formData, mental_fatigue: e.target.value as FatigueLevel | '' })}
                                        className="w-full"
                                    >
                                        <option value="">Select</option>
                                        {(Object.keys(FATIGUE_LABELS) as FatigueLevel[]).map((key) => (
                                            <option key={key} value={key}>{FATIGUE_LABELS[key]}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 7: Extras */}
                        <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">
                            <div className="flex items-center gap-2 mb-4">
                                <Wine className="w-5 h-5 text-rose-400" />
                                <h4 className="font-medium text-rose-300">Extras (10%)</h4>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Alcohol</label>
                                    <select
                                        value={formData.alcohol_units}
                                        onChange={(e) => setFormData({ ...formData, alcohol_units: e.target.value as AlcoholLevel | '' })}
                                        className="w-full"
                                    >
                                        <option value="">Select</option>
                                        {(Object.keys(ALCOHOL_LABELS) as AlcoholLevel[]).map((key) => (
                                            <option key={key} value={key}>{ALCOHOL_LABELS[key]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">Screen Time</label>
                                    <select
                                        value={formData.screen_time}
                                        onChange={(e) => setFormData({ ...formData, screen_time: e.target.value as ScreenTime | '' })}
                                        className="w-full"
                                    >
                                        <option value="">Select</option>
                                        {(Object.keys(SCREEN_TIME_LABELS) as ScreenTime[]).map((key) => (
                                            <option key={key} value={key}>{SCREEN_TIME_LABELS[key]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.smoking}
                                            onChange={(e) => setFormData({ ...formData, smoking: e.target.checked })}
                                            className="w-5 h-5 rounded bg-slate-700 border-slate-600"
                                        />
                                        <span className="text-sm text-slate-400">Smoked today</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Illness Status */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Illness Status (Penalty)</label>
                                <select
                                    value={formData.illness_status}
                                    onChange={(e) => setFormData({ ...formData, illness_status: e.target.value as IllnessStatus | '' })}
                                    className="w-full"
                                >
                                    <option value="">Select</option>
                                    <option value="none">None</option>
                                    <option value="mild">Mild (-10)</option>
                                    <option value="severe">Severe (-25)</option>
                                </select>
                            </div>

                            {/* Health Score Preview */}
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
                                    {calculatedScore}/100 ({getHealthStateLabel(calculatedScore)})
                                </div>

                                {/* Tooltip */}
                                {showTooltip && (
                                    <div className="absolute top-full left-0 mt-2 p-4 bg-slate-800 rounded-xl shadow-xl border border-slate-700 z-50 w-80">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-semibold text-sm">Score Breakdown</span>
                                            <button type="button" onClick={() => setShowTooltip(false)} className="text-slate-500 hover:text-white">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-violet-400">Sleep Duration (10%)</span>
                                                <span>{scoreBreakdown.sleepDurationScore} → {scoreBreakdown.weightedScores.sleepDuration.toFixed(1)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-violet-400">Sleep Timing (15%)</span>
                                                <span>{scoreBreakdown.sleepTimingScore} → {scoreBreakdown.weightedScores.sleepTiming.toFixed(1)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sky-400">Activity (20%)</span>
                                                <span>{scoreBreakdown.activityScore} → {scoreBreakdown.weightedScores.activity.toFixed(1)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-amber-400">Nutrition (20%)</span>
                                                <span>{scoreBreakdown.nutritionScore} → {scoreBreakdown.weightedScores.nutrition.toFixed(1)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-cyan-400">Hydration (10%)</span>
                                                <span>{scoreBreakdown.hydrationScore} → {scoreBreakdown.weightedScores.hydration.toFixed(1)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-purple-400">Mental State (15%)</span>
                                                <span>{scoreBreakdown.mentalScore} → {scoreBreakdown.weightedScores.mentalState.toFixed(1)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-rose-400">Extras (10%)</span>
                                                <span>{scoreBreakdown.extrasScore} → {scoreBreakdown.weightedScores.extras.toFixed(1)}</span>
                                            </div>
                                            {scoreBreakdown.illnessPenalty > 0 && (
                                                <div className="flex justify-between text-red-400">
                                                    <span>Illness Penalty</span>
                                                    <span>-{scoreBreakdown.illnessPenalty}</span>
                                                </div>
                                            )}
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
                            <button type="button" onClick={handleCancel} className="btn btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" disabled={saving} className="btn btn-primary">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Update' : 'Save')}
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
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <Heart className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-slate-400">Avg Health Score</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <p className="text-3xl font-bold">
                                {(metrics.reduce((sum, m) => sum + (m.health_score || 0), 0) / metrics.filter(m => m.health_score).length || 0).toFixed(0)}
                            </p>
                            <span className="text-lg text-slate-500">/100</span>
                        </div>
                    </div>

                    <div className="glass-dark rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                <Moon className="w-5 h-5 text-violet-400" />
                            </div>
                            <span className="text-slate-400">Avg Sleep</span>
                        </div>
                        <p className="text-3xl font-bold">
                            {(metrics.reduce((sum, m) => sum + (m.sleep_hours || 0), 0) / metrics.filter(m => m.sleep_hours).length || 0).toFixed(1)}
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
                            {(metrics.reduce((sum, m) => sum + (m.activity_level || 0), 0) / metrics.filter(m => m.activity_level).length || 0).toFixed(1)}
                            <span className="text-lg text-slate-500 ml-1">/5</span>
                        </p>
                    </div>
                </div>
            )}

            {/* Health Score Chart */}
            {chartData.length > 0 && (
                <div className="glass-dark rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Health Score Trend</h3>
                    <TimeSeriesChart
                        data={chartData}
                        lines={[
                            { dataKey: 'score', name: 'Health Score', color: '#10b981' },
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
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Sleep</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Activity</th>
                                    <th className="px-4 py-3 text-left text-sm text-slate-400 font-medium">Mental</th>
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
                                            {metric.stress_level ? (
                                                <span className={`
                                                    px-2 py-1 rounded-full text-xs font-medium
                                                    ${metric.stress_level === 'calm' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        metric.stress_level === 'mild' ? 'bg-amber-500/20 text-amber-400' :
                                                            'bg-red-500/20 text-red-400'}
                                                `}>
                                                    {STRESS_LABELS[metric.stress_level]}
                                                </span>
                                            ) : '-'}
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
