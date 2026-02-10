'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWallet } from '@/lib/wallet/WalletContext';
import { TargetAsset, TargetAssetCategory } from '@/types/database';
import { calculateNetWorth, NetWorthSummary } from '@/lib/networth-calculator';
import { formatTRY, formatUSDSecondary, getUSDTRYRate, convertTRYtoUSD } from '@/lib/currency';
import LiveExchangeRate from '@/components/ui/LiveExchangeRate';
import {
    Plus, Trash2, Loader2, X, Pencil, Target,
    Home, Car, Plane, Package,
} from 'lucide-react';

const CATEGORY_CONFIG: Record<TargetAssetCategory, { label: string; icon: typeof Home; color: string }> = {
    house: { label: 'House', icon: Home, color: 'emerald' },
    car: { label: 'Car', icon: Car, color: 'sky' },
    travel: { label: 'Travel', icon: Plane, color: 'violet' },
    other: { label: 'Other', icon: Package, color: 'amber' },
};

interface FormData {
    name: string;
    category: TargetAssetCategory | '';
    target_value_try: string;
}

const initialFormData: FormData = {
    name: '',
    category: '',
    target_value_try: '',
};

export default function TargetAssetsPage() {
    const { session } = useWallet();
    const [targets, setTargets] = useState<TargetAsset[]>([]);
    const [netWorth, setNetWorth] = useState<NetWorthSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!session?.walletAddress) return;

        setLoading(true);
        const supabase = createClient();

        const [targetsResult, nwResult] = await Promise.all([
            supabase
                .from('target_assets')
                .select('*')
                .eq('wallet_address', session.walletAddress.toLowerCase())
                .order('created_at', { ascending: false }),
            calculateNetWorth(session.walletAddress),
        ]);

        console.log('Targets fetch result:', targetsResult);

        if (!targetsResult.error && targetsResult.data) {
            setTargets(targetsResult.data);
        } else if (targetsResult.error) {
            console.error('Error fetching targets:', targetsResult.error);
        }
        setNetWorth(nwResult.summary);
        setLoading(false);
    }, [session?.walletAddress]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const currentNetWorthTRY = Math.max(0, netWorth?.current_try || 0);
    const currentNetWorthUSD = Math.max(0, netWorth?.current_usd || 0);

    const getProgress = (targetValueTRY: number): number => {
        if (targetValueTRY <= 0) return 0;
        return Math.min(100, Math.max(0, (currentNetWorthTRY / targetValueTRY) * 100));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.walletAddress || !formData.category || !formData.target_value_try) return;

        setSaving(true);
        setError(null);

        try {
            const supabase = createClient();
            const rateData = await getUSDTRYRate();
            const valueTRY = parseFloat(formData.target_value_try);
            const valueUSD = convertTRYtoUSD(valueTRY, rateData.rate);

            const record = {
                wallet_address: session.walletAddress.toLowerCase(),
                name: formData.name,
                category: formData.category,
                target_value_try: valueTRY,
                target_value_usd: valueUSD,
                exchange_rate_usd_try: rateData.rate,
            };

            let result;
            if (editingId) {
                result = await supabase.from('target_assets').update(record).eq('id', editingId).select();
            } else {
                result = await supabase.from('target_assets').insert(record).select();
            }

            console.log('Save result:', result);

            if (result.error) {
                console.error('Supabase error:', result.error);
                setError(`Failed to save: ${result.error.message}`);
                setSaving(false);
                return;
            }

            setFormData(initialFormData);
            setShowForm(false);
            setEditingId(null);
            setSaving(false);
            fetchData();
        } catch (err) {
            console.error('Error saving target:', err);
            setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const supabase = createClient();
        await supabase.from('target_assets').delete().eq('id', id);
        fetchData();
    };

    const handleEdit = (asset: TargetAsset) => {
        setFormData({
            name: asset.name,
            category: asset.category,
            target_value_try: asset.target_value_try.toString(),
        });
        setEditingId(asset.id);
        setShowForm(true);
    };

    const handleCancel = () => {
        setFormData(initialFormData);
        setShowForm(false);
        setEditingId(null);
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
                    <h1 className="text-2xl font-bold">Target Assets</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Track progress toward your goals based on net worth
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <LiveExchangeRate />
                    <button
                        onClick={() => {
                            setFormData(initialFormData);
                            setEditingId(null);
                            setShowForm(!showForm);
                        }}
                        className="btn btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        Add Target
                    </button>
                </div>
            </div>

            {/* Current Net Worth Banner */}
            <div className="glass-dark rounded-xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Target className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                    <span className="text-slate-400 text-sm">Current Net Worth</span>
                    <p className="text-2xl font-bold text-emerald-400">
                        {formatTRY(currentNetWorthTRY)}
                    </p>
                    <p className="text-sm text-slate-500">
                        {formatUSDSecondary(currentNetWorthUSD)}
                    </p>
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <div className="glass-dark rounded-2xl p-6 slide-in">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">
                            {editingId ? 'Edit Target' : 'New Target'}
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
                                <label className="block text-sm text-slate-400 mb-2">Asset Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Dream House, Tesla Model 3"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value as TargetAssetCategory })}
                                    required
                                >
                                    <option value="">Select category</option>
                                    {(Object.keys(CATEGORY_CONFIG) as TargetAssetCategory[]).map((cat) => (
                                        <option key={cat} value={cat}>{CATEGORY_CONFIG[cat].label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Target Value (₺ TRY)</label>
                                <input
                                    type="number"
                                    value={formData.target_value_try}
                                    onChange={(e) => setFormData({ ...formData, target_value_try: e.target.value })}
                                    placeholder="e.g. 5000000"
                                    required
                                    min="1"
                                />
                            </div>
                        </div>
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                        <p className="text-xs text-slate-500">
                            💡 Progress is automatically calculated from your current net worth.
                        </p>
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

            {/* Target Asset Cards */}
            {targets.length === 0 && !showForm ? (
                <div className="glass-dark rounded-2xl p-12 text-center">
                    <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-400 mb-2">No Targets Yet</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Add a target asset to start tracking your progress toward that goal.
                    </p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {targets.map((asset) => {
                        const config = CATEGORY_CONFIG[asset.category] || CATEGORY_CONFIG.other;
                        const Icon = config.icon;
                        const progress = getProgress(asset.target_value_try);
                        const isComplete = progress >= 100;

                        return (
                            <div key={asset.id} className="glass-dark rounded-2xl p-6 transition-all">
                                {/* Card Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.color === 'emerald' ? 'bg-emerald-500/20' :
                                            config.color === 'sky' ? 'bg-sky-500/20' :
                                                config.color === 'violet' ? 'bg-violet-500/20' :
                                                    'bg-amber-500/20'
                                            }`}>
                                            <Icon className={`w-6 h-6 ${config.color === 'emerald' ? 'text-emerald-400' :
                                                config.color === 'sky' ? 'text-sky-400' :
                                                    config.color === 'violet' ? 'text-violet-400' :
                                                        'text-amber-400'
                                                }`} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{asset.name}</h3>
                                            <span className={`text-xs px-2 py-1 rounded-full ${config.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                                                config.color === 'sky' ? 'bg-sky-500/20 text-sky-400' :
                                                    config.color === 'violet' ? 'bg-violet-500/20 text-violet-400' :
                                                        'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                {config.label}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleEdit(asset)}
                                            className="p-2 rounded-lg hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(asset.id)}
                                            className="p-2 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Progress Amount */}
                                <div className="mb-3">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-sm text-slate-400">
                                            {formatTRY(currentNetWorthTRY)} / {formatTRY(asset.target_value_try)}
                                        </span>
                                        <span className={`text-lg font-bold ${isComplete ? 'text-emerald-400' :
                                            progress >= 50 ? 'text-sky-400' :
                                                progress >= 25 ? 'text-amber-400' : 'text-red-400'
                                            }`}>
                                            {progress.toFixed(1)}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {formatUSDSecondary(currentNetWorthUSD)} / {formatUSDSecondary(asset.target_value_usd)}
                                    </p>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-3 bg-slate-700/50 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ease-out ${isComplete ? 'bg-emerald-500' :
                                            progress >= 50 ? 'bg-sky-500' :
                                                progress >= 25 ? 'bg-amber-500' : 'bg-red-500'
                                            }`}
                                        style={{ width: `${Math.min(100, progress)}%` }}
                                    />
                                </div>

                                {/* Remaining */}
                                {isComplete ? (
                                    <p className="text-xs text-emerald-400 mt-2 font-medium">
                                        ✅ Goal reached!
                                    </p>
                                ) : (
                                    <p className="text-xs text-slate-500 mt-2">
                                        {formatTRY(asset.target_value_try - currentNetWorthTRY)} remaining
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Info */}
            <div className="glass rounded-xl p-4 text-sm text-slate-500">
                <span className="font-medium text-slate-400">How it works:</span>{' '}
                Progress is automatically calculated from your current net worth. Target assets do not affect your net worth calculation.
            </div>
        </div>
    );
}
