// Health Score Calculation Utilities
// All scoring logic in one place for consistency
// ALL LABELS AND VALUES IN ENGLISH

// ================== Type Definitions ==================

export type MealQuality = 'poor' | 'normal' | 'good';
export type ProcessedFoodLevel = 'high' | 'medium' | 'low';
export type WaterIntake = 'low' | 'adequate' | 'good';
export type IllnessStatus = 'none' | 'mild' | 'severe';

// Activity levels 1-5
export type ActivityLevel = 1 | 2 | 3 | 4 | 5;

// Sleep duration options (stored as hours)
export type SleepDuration = 4.5 | 5.5 | 6.5 | 7.5 | 8.5 | 9.5 | 10.5;

// ================== Labels ==================

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
    1: '1 – Almost no movement',
    2: '2 – Light activity (short walks, household movement)',
    3: '3 – Moderate activity (30–45 min walking)',
    4: '4 – Active (sports, running, fitness)',
    5: '5 – Intense training / very active day',
};

export const SLEEP_OPTIONS: { value: SleepDuration; label: string }[] = [
    { value: 4.5, label: 'Less than 5 hours' },
    { value: 5.5, label: '5–6 hours' },
    { value: 6.5, label: '6–7 hours' },
    { value: 7.5, label: '7–8 hours (ideal)' },
    { value: 8.5, label: '8–9 hours (ideal)' },
    { value: 9.5, label: '9–10 hours' },
    { value: 10.5, label: 'More than 10 hours' },
];

// ================== Score Maps ==================

const MEAL_SCORE_MAP: Record<MealQuality, number> = {
    'poor': 40,
    'normal': 70,
    'good': 100,
};

const WATER_SCORE_MAP: Record<WaterIntake, number> = {
    'low': 40,
    'adequate': 70,
    'good': 100,
};

const PROCESSED_PENALTY_MAP: Record<ProcessedFoodLevel, number> = {
    'high': -20,
    'medium': -10,
    'low': 0,
};

const ILLNESS_PENALTY_MAP: Record<IllnessStatus, number> = {
    'none': 0,
    'mild': 10,
    'severe': 30,
};

// ================== Score Functions ==================

/**
 * Calculate sleep score (0-100) using penalty-only model
 * Ideal: 7-9 hours = 100
 * 6-7 or 9-10 hours = 85
 * 5-6 or >10 hours = 65
 * <5 hours = 40
 */
export function calculateSleepScore(hours: number): number {
    if (hours >= 7 && hours <= 9) return 100;
    if (hours >= 6 && hours < 7) return 85;
    if (hours > 9 && hours <= 10) return 85;
    if (hours >= 5 && hours < 6) return 65;
    if (hours > 10) return 65;
    return 40;
}

/**
 * Convert activity level (1-5) to score (0-100)
 * Each level = 20 points
 */
export function calculateActivityScore(level: ActivityLevel): number {
    return level * 20;
}

/**
 * Calculate nutrition score (0-100) from meal quality, water intake, and processed food level
 */
export function calculateNutritionScore(
    mealQuality: MealQuality | null,
    waterIntake: WaterIntake | null,
    processedFoodLevel: ProcessedFoodLevel | null
): number {
    const mealScore = mealQuality ? MEAL_SCORE_MAP[mealQuality] : 70;
    const waterScore = waterIntake ? WATER_SCORE_MAP[waterIntake] : 70;
    const processedPenalty = processedFoodLevel ? PROCESSED_PENALTY_MAP[processedFoodLevel] : 0;

    const rawScore = (mealScore + waterScore) / 2 + processedPenalty;
    return Math.max(0, Math.min(100, rawScore));
}

/**
 * Get illness penalty (0-30)
 */
export function getIllnessPenalty(illness: IllnessStatus | null): number {
    return illness ? ILLNESS_PENALTY_MAP[illness] : 0;
}

/**
 * Calculate overtraining penalty
 * If user has 3 consecutive days of activity level 5, apply -15 penalty
 * @param last3DaysActivity - Array of activity levels for last 3 days (oldest to newest)
 * @returns Penalty value (0 or 15)
 */
export function calculateOvertrainingPenalty(last3DaysActivity: number[]): number {
    if (last3DaysActivity.length < 3) return 0;

    // Check if all 3 days are level 5 (max intensity)
    const isOvertrained = last3DaysActivity.every(day => day === 5);
    return isOvertrained ? 15 : 0;
}

/**
 * Calculate active recovery bonus
 * Bonus applies when:
 * - User had at least one intense day (level 4+) in last 2 days
 * - Today's activity is moderate (level 2 or 3)
 * - User is not ill
 * @param todayLevel - Today's activity level
 * @param last2DaysActivity - Array of activity levels for last 2 days
 * @param isIll - Whether user is currently ill
 * @returns Bonus value (0 or 5)
 */
export function calculateActiveRecoveryBonus(
    todayLevel: number,
    last2DaysActivity: number[],
    isIll: boolean
): number {
    if (isIll) return 0;
    if (last2DaysActivity.length === 0) return 0;

    const hadHeavyDay = last2DaysActivity.some(day => day >= 4);
    const isRecoveryDay = todayLevel === 2 || todayLevel === 3;

    return (hadHeavyDay && isRecoveryDay) ? 5 : 0;
}

// ================== Input Types ==================

export interface HealthScoreInput {
    sleepHours: number | null;
    activityLevel: ActivityLevel | null;
    mealQuality: MealQuality | null;
    waterIntake: WaterIntake | null;
    processedFoodLevel: ProcessedFoodLevel | null;
    illnessStatus: IllnessStatus | null;
    // Historical data for overtraining/recovery calculations
    last3DaysActivity?: number[]; // Last 3 days activity levels (oldest to newest, including today)
}

export interface HealthScoreBreakdown {
    sleepScore: number;
    activityScore: number;
    nutritionScore: number;
    illnessPenalty: number;
    overtrainingPenalty: number;
    activeRecoveryBonus: number;
    finalScore: number;
}

// ================== Main Calculator ==================

/**
 * Calculate final health score (0-100) using weighted formula:
 * healthScore = (sleepScore * 0.40) + (activityScore * 0.30) + (nutritionScore * 0.30) - illnessPenalty
 * 
 * Weights sum to 1.0, illness is applied as penalty after calculation
 * A perfect day with no illness = 100
 */
export function calculateHealthScore(input: HealthScoreInput): number {
    const breakdown = getHealthScoreBreakdown(input);
    return breakdown.finalScore;
}

/**
 * Get detailed breakdown of health score for tooltip
 */
export function getHealthScoreBreakdown(input: HealthScoreInput): HealthScoreBreakdown {
    const sleepScore = input.sleepHours !== null
        ? calculateSleepScore(input.sleepHours)
        : 70; // default

    const activityScore = input.activityLevel !== null
        ? calculateActivityScore(input.activityLevel)
        : 60; // default (level 3)

    const nutritionScore = calculateNutritionScore(
        input.mealQuality,
        input.waterIntake,
        input.processedFoodLevel
    );

    const illnessPenalty = getIllnessPenalty(input.illnessStatus);

    // Calculate overtraining penalty (need 3 days of data including today)
    const overtrainingPenalty = input.last3DaysActivity
        ? calculateOvertrainingPenalty(input.last3DaysActivity)
        : 0;

    // Calculate active recovery bonus
    // last2Days = all but last element (today), todayLevel = last element
    const isIll = input.illnessStatus === 'mild' || input.illnessStatus === 'severe';
    let activeRecoveryBonus = 0;
    if (input.last3DaysActivity && input.last3DaysActivity.length >= 2 && input.activityLevel) {
        const last2Days = input.last3DaysActivity.slice(0, -1); // Exclude today
        activeRecoveryBonus = calculateActiveRecoveryBonus(input.activityLevel, last2Days, isIll);
    }

    // Weights: sleep 0.40, activity 0.30, nutrition 0.30 = 1.0
    const weightedScore =
        (sleepScore * 0.40) +
        (activityScore * 0.30) +
        (nutritionScore * 0.30);

    // Apply penalties and bonuses after weighted calculation
    const rawScore = weightedScore - illnessPenalty - overtrainingPenalty + activeRecoveryBonus;

    const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    return {
        sleepScore,
        activityScore,
        nutritionScore,
        illnessPenalty,
        overtrainingPenalty,
        activeRecoveryBonus,
        finalScore,
    };
}

/**
 * Determine avatar state based on health metrics
 * Priority: sick > fatigued > recovering > exhausted > normal > energetic
 */
export function getAvatarStateFromHealth(
    illnessStatus: IllnessStatus | null,
    healthScore: number,
    overtrainingPenalty?: number,
    activeRecoveryBonus?: number
): 'sick' | 'fatigued' | 'recovering' | 'exhausted' | 'normal' | 'energetic' {
    if (illnessStatus === 'severe') return 'sick';
    if (overtrainingPenalty && overtrainingPenalty > 0) return 'fatigued';
    if (activeRecoveryBonus && activeRecoveryBonus > 0) return 'recovering';
    if (healthScore < 40) return 'exhausted';
    if (healthScore < 70) return 'normal';
    return 'energetic';
}

