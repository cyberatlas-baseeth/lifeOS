import { clsx, type ClassValue } from './clsx';

// Simple cn function without tailwind-merge (to avoid extra dependency)
export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

// Format currency in Turkish Lira
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

// Format date for display
export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

// Format date for input
export function formatDateForInput(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
}

// Calculate percentage change
export function percentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
}

// Get color class based on value and thresholds
export function getScoreColor(score: number): string {
    if (score >= 75) return 'text-emerald-400';
    if (score >= 50) return 'text-sky-400';
    if (score >= 25) return 'text-amber-400';
    return 'text-red-400';
}

// Get background color class based on value
export function getScoreBgColor(score: number): string {
    if (score >= 75) return 'bg-emerald-500/20';
    if (score >= 50) return 'bg-sky-500/20';
    if (score >= 25) return 'bg-amber-500/20';
    return 'bg-red-500/20';
}

// Debounce function for input handlers
export function debounce<T extends (...args: Parameters<T>) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Calculate sleep score based on hours (0-100)
// 7-8 hours → 100, 6-7 → 80, 5-6 → 60, <5 → 40, >9 → 70
export function calculateSleepScore(sleepHours: number): number {
    if (sleepHours >= 7 && sleepHours <= 8) return 100;
    if (sleepHours > 8 && sleepHours <= 9) return 85;
    if (sleepHours > 9) return 70;
    if (sleepHours >= 6 && sleepHours < 7) return 80;
    if (sleepHours >= 5 && sleepHours < 6) return 60;
    return 40; // < 5 hours
}

// Convert activity score (1-10) to (0-100)
export function calculateActivityScore(activityLevel: number): number {
    return Math.min(100, Math.max(0, activityLevel * 10));
}

// Calculate health score using weighted formula
// healthScore = (sleepScore * 0.5) + (activityScore100 * 0.5)
export function calculateHealthScore(sleepHours: number, activityLevel: number): number {
    const sleepScore = calculateSleepScore(sleepHours);
    const activityScore = calculateActivityScore(activityLevel);
    return Math.round((sleepScore * 0.5) + (activityScore * 0.5));
}
