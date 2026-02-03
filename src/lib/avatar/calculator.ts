import {
    AvatarState,
    AvatarStatus,
    AggregatedMetrics,
    Alert,
} from '@/types/database';

// Avatar state calculation rules
interface AvatarRule {
    condition: (metrics: AggregatedMetrics) => boolean;
    adjustments: Partial<{ energy: number; morale: number; balance: number }>;
    status?: AvatarStatus;
    priority: number;
}

const AVATAR_RULES: AvatarRule[] = [
    // Critical conditions (highest priority)
    {
        condition: (m) =>
            (m.health?.avgHealthScore ?? 100) < 30 &&
            (m.psychology?.avgMood ?? 10) < 4,
        adjustments: { energy: -30, morale: -30 },
        status: 'critical',
        priority: 100,
    },
    {
        condition: (m) =>
            m.finance !== null &&
            m.finance.netCashFlow < 0 &&
            Math.abs(m.finance.netCashFlow) > m.finance.totalIncome * 0.5,
        adjustments: { balance: -40, morale: -20 },
        status: 'critical',
        priority: 95,
    },

    // Stressed conditions
    {
        condition: (m) => (m.psychology?.avgStress ?? 0) > 7,
        adjustments: { morale: -25, energy: -15 },
        status: 'stressed',
        priority: 80,
    },
    {
        condition: (m) =>
            m.finance !== null && m.finance.netCashFlow < 0,
        adjustments: { balance: -20, morale: -10 },
        status: 'stressed',
        priority: 75,
    },

    // Tired conditions
    {
        condition: (m) =>
            (m.health?.avgHealthScore ?? 100) < 40 &&
            (m.psychology?.avgMotivation ?? 10) < 5,
        adjustments: { energy: -25 },
        status: 'tired',
        priority: 70,
    },
    {
        condition: (m) => (m.health?.avgSleep ?? 8) < 5,
        adjustments: { energy: -20, morale: -10 },
        status: 'tired',
        priority: 65,
    },
    {
        condition: (m) => (m.health?.avgActivity ?? 5) < 3,
        adjustments: { energy: -15 },
        priority: 60,
    },

    // Positive conditions
    {
        condition: (m) =>
            m.finance !== null &&
            m.finance.netCashFlow > 0 &&
            m.finance.totalExpenses < m.finance.totalIncome * 0.7,
        adjustments: { balance: 20, morale: 10 },
        status: 'energetic',
        priority: 50,
    },
    {
        condition: (m) =>
            (m.health?.avgHealthScore ?? 0) > 70 &&
            (m.psychology?.avgMood ?? 0) > 7,
        adjustments: { energy: 15, morale: 15 },
        status: 'thriving',
        priority: 55,
    },
    {
        condition: (m) => (m.health?.avgSleep ?? 0) >= 7 && (m.health?.avgSleep ?? 10) <= 9,
        adjustments: { energy: 10 },
        priority: 40,
    },
    {
        condition: (m) => (m.psychology?.avgMotivation ?? 0) > 7,
        adjustments: { morale: 15, energy: 5 },
        priority: 45,
    },
    {
        condition: (m) =>
            m.finance !== null && m.finance.investmentProfitLoss > 0,
        adjustments: { balance: 10, morale: 5 },
        priority: 35,
    },
];

const STATUS_MESSAGES: Record<AvatarStatus, string> = {
    thriving: "You're doing great! All metrics are positive.",
    energetic: 'High energy, stable finances.',
    stable: "You're in a balanced phase. Keep it up!",
    tired: 'You look a bit tired. Consider resting.',
    stressed: 'Stress level is high. Take time to relax.',
    critical: 'Warning! Multiple metrics are critical.',
    sick: 'You are unwell. Focus on recovery.',
};

export function calculateAvatarState(metrics: AggregatedMetrics): AvatarState {
    // Start with base values
    let energy = 50;
    let morale = 50;
    let balance = 50;
    let determinedStatus: AvatarStatus = 'stable';
    let highestPriority = 0;

    // Apply each matching rule
    for (const rule of AVATAR_RULES) {
        try {
            if (rule.condition(metrics)) {
                energy += rule.adjustments.energy ?? 0;
                morale += rule.adjustments.morale ?? 0;
                balance += rule.adjustments.balance ?? 0;

                // Update status if this rule has higher priority
                if (rule.status && rule.priority > highestPriority) {
                    determinedStatus = rule.status;
                    highestPriority = rule.priority;
                }
            }
        } catch {
            // Skip rules that error (e.g., null checks)
            continue;
        }
    }

    // Apply health score directly to energy if available
    if (metrics.health?.avgHealthScore) {
        energy += (metrics.health.avgHealthScore - 50) * 0.3;
    }

    // Apply psychology to morale if available
    if (metrics.psychology) {
        const psychScore =
            ((metrics.psychology.avgMood ?? 5) +
                (metrics.psychology.avgMotivation ?? 5) +
                (10 - (metrics.psychology.avgStress ?? 5))) /
            3;
        morale += (psychScore - 5) * 5;
    }

    // Clamp values between 0 and 100
    energy = Math.max(0, Math.min(100, energy));
    morale = Math.max(0, Math.min(100, morale));
    balance = Math.max(0, Math.min(100, balance));

    // Calculate overall score
    const overallScore = Math.round((energy + morale + balance) / 3);

    // Override status based on overall score if no specific status was determined
    if (highestPriority === 0) {
        if (overallScore >= 75) determinedStatus = 'thriving';
        else if (overallScore >= 60) determinedStatus = 'energetic';
        else if (overallScore >= 40) determinedStatus = 'stable';
        else if (overallScore >= 25) determinedStatus = 'tired';
        else determinedStatus = 'critical';
    }

    return {
        energy: Math.round(energy),
        morale: Math.round(morale),
        balance: Math.round(balance),
        overallScore,
        status: determinedStatus,
        statusMessage: STATUS_MESSAGES[determinedStatus],
    };
}

export function generateAlerts(metrics: AggregatedMetrics): Alert[] {
    const alerts: Alert[] = [];

    // Health alerts
    if (metrics.health) {
        if (metrics.health.avgSleep < 6) {
            alerts.push({
                id: 'health-sleep',
                type: 'warning',
                title: 'Sleep Deficit',
                message: `You've been averaging ${metrics.health.avgSleep.toFixed(1)} hours of sleep. Aim for 7-8 hours.`,
                metric: 'health',
            });
        }
        if (metrics.health.avgHealthScore < 50) {
            alerts.push({
                id: 'health-score',
                type: 'danger',
                title: 'Low Health Score',
                message: `Your health score is ${metrics.health.avgHealthScore.toFixed(0)}. Focus on exercise and nutrition.`,
                metric: 'health',
            });
        }
        if (metrics.health.avgHealthScore > 80) {
            alerts.push({
                id: 'health-great',
                type: 'success',
                title: 'Great Health!',
                message: "You're managing your health metrics excellently!",
                metric: 'health',
            });
        }
    }

    // Psychology alerts
    if (metrics.psychology) {
        if (metrics.psychology.avgStress > 7) {
            alerts.push({
                id: 'psych-stress',
                type: 'danger',
                title: 'High Stress',
                message: `Your stress level is ${metrics.psychology.avgStress.toFixed(1)}/10. Consider taking a break.`,
                metric: 'psychology',
            });
        }
        if (metrics.psychology.avgMotivation < 4) {
            alerts.push({
                id: 'psych-motivation',
                type: 'warning',
                title: 'Low Motivation',
                message: 'Your motivation seems low. Setting new goals might help.',
                metric: 'psychology',
            });
        }
        if (metrics.psychology.avgMood > 7 && metrics.psychology.avgStress < 4) {
            alerts.push({
                id: 'psych-great',
                type: 'success',
                title: 'Great Mood!',
                message: 'Your mental health looks excellent!',
                metric: 'psychology',
            });
        }
    }

    // Finance alerts
    if (metrics.finance) {
        const { totalIncome, totalExpenses, netCashFlow, investmentProfitLoss } = metrics.finance;

        if (totalExpenses > totalIncome * 1.1) {
            const percentOver = ((totalExpenses / totalIncome - 1) * 100).toFixed(0);
            alerts.push({
                id: 'finance-overspend',
                type: 'danger',
                title: 'Overspending',
                message: `Expenses exceed income by ${percentOver}%. Review your budget.`,
                metric: 'finance',
            });
        } else if (netCashFlow > 0 && totalExpenses < totalIncome * 0.7) {
            alerts.push({
                id: 'finance-saving',
                type: 'success',
                title: 'Great Savings!',
                message: "You're saving more than 30% of your income!",
                metric: 'finance',
            });
        }

        if (investmentProfitLoss < 0 && Math.abs(investmentProfitLoss) > 1000) {
            alerts.push({
                id: 'investment-loss',
                type: 'warning',
                title: 'Investment Loss',
                message: `You have $${Math.abs(investmentProfitLoss).toLocaleString()} in investment losses.`,
                metric: 'investments',
            });
        } else if (investmentProfitLoss > 1000) {
            alerts.push({
                id: 'investment-profit',
                type: 'success',
                title: 'Investment Profit!',
                message: `You have $${investmentProfitLoss.toLocaleString()} in investment profits!`,
                metric: 'investments',
            });
        }
    }

    return alerts;
}

// Helper to get avatar color based on status - Green theme
export function getAvatarColors(status: AvatarStatus): {
    primary: string;
    secondary: string;
    glow: string;
} {
    switch (status) {
        case 'thriving':
            return {
                primary: '#22c55e', // green-500
                secondary: '#4ade80',
                glow: 'rgba(34, 197, 94, 0.5)',
            };
        case 'energetic':
            return {
                primary: '#10b981', // emerald-500
                secondary: '#34d399',
                glow: 'rgba(16, 185, 129, 0.5)',
            };
        case 'stable':
            return {
                primary: '#14b8a6', // teal-500
                secondary: '#2dd4bf',
                glow: 'rgba(20, 184, 166, 0.5)',
            };
        case 'tired':
            return {
                primary: '#f59e0b', // amber
                secondary: '#fbbf24',
                glow: 'rgba(245, 158, 11, 0.5)',
            };
        case 'stressed':
            return {
                primary: '#f97316', // orange
                secondary: '#fb923c',
                glow: 'rgba(249, 115, 22, 0.5)',
            };
        case 'critical':
            return {
                primary: '#ef4444', // red
                secondary: '#f87171',
                glow: 'rgba(239, 68, 68, 0.5)',
            };
        case 'sick':
            return {
                primary: '#a855f7', // purple
                secondary: '#c084fc',
                glow: 'rgba(168, 85, 247, 0.5)',
            };
    }
}
