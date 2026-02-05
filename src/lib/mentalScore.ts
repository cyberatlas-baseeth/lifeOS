// Mental Score Calculation Utilities
// Independent from Health Score - purely psychological metrics
// ALL LABELS AND VALUES IN ENGLISH

// ================== Type Definitions ==================

export type StressLevel = 'calm' | 'mild' | 'high';
export type MotivationLevel = 'high' | 'medium' | 'low';
export type FatigueLevel = 'fresh' | 'tired' | 'exhausted';

// ================== Labels ==================

export const STRESS_LABELS: Record<StressLevel, string> = {
    calm: 'Calm',
    mild: 'Mild',
    high: 'High',
};

export const MOTIVATION_LABELS: Record<MotivationLevel, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
};

export const FATIGUE_LABELS: Record<FatigueLevel, string> = {
    fresh: 'Fresh',
    tired: 'Tired',
    exhausted: 'Exhausted',
};

// UI Descriptions
export const STRESS_DESCRIPTION = 'Reflects perceived psychological pressure.';
export const MOTIVATION_DESCRIPTION = 'Represents internal drive and willingness to engage.';
export const FATIGUE_DESCRIPTION = 'Represents cognitive and emotional exhaustion.';
export const MENTAL_SCORE_DESCRIPTION = 'Mental score reflects daily psychological balance, independent of physical health.';

// ================== Penalty & Bonus Maps ==================

const STRESS_PENALTY_MAP: Record<StressLevel, number> = {
    calm: 0,
    mild: 25,
    high: 55,
};

const MOTIVATION_BONUS_MAP: Record<MotivationLevel, number> = {
    high: 45,
    medium: 25,
    low: 0,
};

const FATIGUE_PENALTY_MAP: Record<FatigueLevel, number> = {
    fresh: 0,
    tired: 20,
    exhausted: 45,
};

// ================== Score Functions ==================

/**
 * Calculate mental score (0-100)
 * Formula: 100 - stressPenalty - fatiguePenalty + motivationBonus
 * Clamped to 0-100 range
 */
export function calculateMentalScore(
    stress: StressLevel,
    motivation: MotivationLevel,
    fatigue: FatigueLevel
): number {
    const stressPenalty = STRESS_PENALTY_MAP[stress];
    const fatiguePenalty = FATIGUE_PENALTY_MAP[fatigue];
    const motivationBonus = MOTIVATION_BONUS_MAP[motivation];

    const rawScore = 100 - stressPenalty - fatiguePenalty + motivationBonus;
    return Math.max(0, Math.min(100, rawScore));
}

// ================== Breakdown ==================

export interface MentalScoreBreakdown {
    stressPenalty: number;
    motivationBonus: number;
    fatiguePenalty: number;
    finalScore: number;
}

/**
 * Get detailed breakdown of mental score for tooltip
 */
export function getMentalScoreBreakdown(
    stress: StressLevel | null,
    motivation: MotivationLevel | null,
    fatigue: FatigueLevel | null
): MentalScoreBreakdown {
    const stressPenalty = stress ? STRESS_PENALTY_MAP[stress] : 0;
    const motivationBonus = motivation ? MOTIVATION_BONUS_MAP[motivation] : 0;
    const fatiguePenalty = fatigue ? FATIGUE_PENALTY_MAP[fatigue] : 0;

    const rawScore = 100 - stressPenalty - fatiguePenalty + motivationBonus;
    const finalScore = Math.max(0, Math.min(100, rawScore));

    return {
        stressPenalty,
        motivationBonus,
        fatiguePenalty,
        finalScore,
    };
}

/**
 * Get mental state label based on score
 */
export function getMentalStateLabel(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Low';
    return 'Critical';
}
