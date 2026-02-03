// Health Score Calculation Utilities
// All scoring logic in one place for consistency

import {
    MealQuality,
    ProcessedFoodLevel,
    WaterIntake,
    IllnessStatus,
} from '@/types/database';

// ================== Score Maps ==================

const MEAL_SCORE_MAP: Record<MealQuality, number> = {
    'kötü': 40,
    'normal': 70,
    'iyi': 100,
};

const WATER_SCORE_MAP: Record<WaterIntake, number> = {
    'az': 40,
    'yeterli': 70,
    'iyi': 100,
};

const PROCESSED_PENALTY_MAP: Record<ProcessedFoodLevel, number> = {
    'yüksek': -20,
    'orta': -10,
    'düşük': 0,
};

const ILLNESS_PENALTY_MAP: Record<IllnessStatus, number> = {
    'none': 0,
    'mild': 10,
    'severe': 30,
};

// ================== Score Functions ==================

/**
 * Calculate sleep score (0-100) based on hours
 * 7-8h = 100, 6-7h = 80, 5-6h = 60, <5h = 40, >8h = 70
 */
export function calculateSleepScore(hours: number): number {
    if (hours >= 7 && hours <= 8) return 100;
    if (hours >= 6 && hours < 7) return 80;
    if (hours >= 5 && hours < 6) return 60;
    if (hours < 5) return 40;
    if (hours > 8) return 70;
    return 60;
}

/**
 * Convert activity level (1-10) to score (0-100)
 */
export function calculateActivityScore(level: number): number {
    return Math.min(100, Math.max(0, level * 10));
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
    activityLevel: number | null;
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
 * healthScore = (sleepScore * 0.35) + (activityScore * 0.25) + (nutritionScore * 0.25) - illnessPenalty
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
        : 50; // default

    const nutritionScore = calculateNutritionScore(
        input.mealQuality,
        input.waterIntake,
        input.processedFoodLevel
    );

    const illnessPenalty = getIllnessPenalty(input.illnessStatus);

    const rawScore =
        (sleepScore * 0.35) +
        (activityScore * 0.25) +
        (nutritionScore * 0.25) -
        illnessPenalty;

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
