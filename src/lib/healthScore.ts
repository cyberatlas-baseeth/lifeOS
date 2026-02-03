// Health Score Calculation Utilities
// All scoring logic in one place for consistency
// ALL LABELS AND VALUES IN ENGLISH

// ================== Type Definitions ==================

export type MealQuality = 'poor' | 'normal' | 'good';
export type ProcessedFoodLevel = 'high' | 'medium' | 'low';
export type WaterIntake = 'low' | 'adequate' | 'good';
export type IllnessStatus = 'none' | 'mild' | 'severe';

// Activity levels 1-5 with descriptive labels
export type ActivityLevel = 1 | 2 | 3 | 4 | 5;

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
    1: 'Almost no movement',
    2: 'Light activity (short walks, household movement)',
    3: 'Moderate activity (30–45 min walking)',
    4: 'Active (sports, running, fitness)',
    5: 'Intense training / very active day',
};

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
 * Calculate sleep score (0-100) using reverse-U curve model
 * Optimal: 7-9 hours = 100
 * Suboptimal: 6-7 or 9-10 = 80
 * Poor: 5-6 = 60
 * Bad: <5 or ≥10 = 40 - 10 penalty = 30
 */
export function calculateSleepScore(hours: number): number {
    let baseScore: number;

    if (hours >= 7 && hours < 9) {
        baseScore = 100;
    } else if (hours >= 6 && hours < 7) {
        baseScore = 80;
    } else if (hours >= 9 && hours < 10) {
        baseScore = 80;
    } else if (hours >= 5 && hours < 6) {
        baseScore = 60;
    } else {
        baseScore = 40;
    }

    // Apply penalty for extreme values
    const penalty = hours < 6 ? 10 : hours >= 10 ? 10 : 0;

    return Math.max(0, baseScore - penalty);
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

// ================== Input Types ==================

export interface HealthScoreInput {
    sleepHours: number | null;
    activityLevel: ActivityLevel | null;
    mealQuality: MealQuality | null;
    waterIntake: WaterIntake | null;
    processedFoodLevel: ProcessedFoodLevel | null;
    illnessStatus: IllnessStatus | null;
}

export interface HealthScoreBreakdown {
    sleepScore: number;
    activityScore: number;
    nutritionScore: number;
    illnessPenalty: number;
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

    // Weights: sleep 0.40, activity 0.30, nutrition 0.30 = 1.0
    const weightedScore =
        (sleepScore * 0.40) +
        (activityScore * 0.30) +
        (nutritionScore * 0.30);

    // Illness penalty applied after weighted calculation
    const rawScore = weightedScore - illnessPenalty;

    const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    return {
        sleepScore,
        activityScore,
        nutritionScore,
        illnessPenalty,
        finalScore,
    };
}

/**
 * Determine avatar state based on illness and health score
 */
export function getAvatarStateFromHealth(
    illnessStatus: IllnessStatus | null,
    healthScore: number
): 'sick' | 'exhausted' | 'normal' | 'energetic' {
    if (illnessStatus === 'severe') return 'sick';
    if (healthScore < 40) return 'exhausted';
    if (healthScore < 70) return 'normal';
    return 'energetic';
}
