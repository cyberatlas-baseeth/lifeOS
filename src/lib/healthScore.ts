// Health Score Calculation Utilities
// 7-Category Weighted Scoring System (100% Total)
// ALL LABELS AND VALUES IN ENGLISH

// ================== Type Definitions ==================

export type MealQuality = 'poor' | 'normal' | 'good';
export type ProcessedFoodLevel = 'high' | 'medium' | 'low';
export type WaterIntake = 'low' | 'adequate' | 'good';
export type IllnessStatus = 'none' | 'mild' | 'severe';
export type ActivityLevel = 1 | 2 | 3 | 4 | 5;
export type SleepRegularity = 'consistent' | 'slight_variation' | 'irregular';
export type AlcoholLevel = 'none' | 'light' | 'moderate' | 'heavy';
export type ScreenTime = 'low' | 'moderate' | 'high';
export type StressLevel = 'calm' | 'mild' | 'high';
export type MotivationLevel = 'high' | 'medium' | 'low';
export type FatigueLevel = 'fresh' | 'tired' | 'exhausted';

// Sleep duration options (stored as hours)
export type SleepDuration = 4.5 | 5.5 | 6.5 | 7.5 | 8.5 | 9.5 | 10.5;

// ================== Category Weights (100% Total) ==================

export const CATEGORY_WEIGHTS = {
    sleepDuration: 0.10,    // 10%
    sleepTiming: 0.15,      // 15%
    activity: 0.20,         // 20%
    nutrition: 0.20,        // 20%
    hydration: 0.10,        // 10%
    mentalState: 0.15,      // 15%
    extras: 0.10,           // 10%
} as const;

// ================== Labels ==================

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
    1: '1 – Almost no movement',
    2: '2 – Light activity (short walks)',
    3: '3 – Moderate (30–45 min walking)',
    4: '4 – Active (sports, running)',
    5: '5 – Intense training',
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

export const BEDTIME_OPTIONS: { value: string; label: string }[] = [
    { value: '21:00', label: '21:00 (9 PM)' },
    { value: '22:00', label: '22:00 (10 PM) – Optimal' },
    { value: '23:00', label: '23:00 (11 PM) – Optimal' },
    { value: '00:00', label: '00:00 (Midnight)' },
    { value: '01:00', label: '01:00 (1 AM)' },
    { value: '02:00', label: '02:00+ (Late)' },
];

export const REGULARITY_LABELS: Record<SleepRegularity, string> = {
    consistent: 'Consistent (<30 min deviation)',
    slight_variation: 'Slight variation (~1 hour)',
    irregular: 'Irregular (>2 hours)',
};

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

export const ALCOHOL_LABELS: Record<AlcoholLevel, string> = {
    none: 'None',
    light: 'Light (1-2 units)',
    moderate: 'Moderate (3-4 units)',
    heavy: 'Heavy (5+ units)',
};

export const SCREEN_TIME_LABELS: Record<ScreenTime, string> = {
    low: 'Low (<2 hours)',
    moderate: 'Moderate (2-4 hours)',
    high: 'High (>4 hours)',
};

// ================== Category 1: Sleep Duration (10%) ==================

export function calculateSleepDurationScore(hours: number | null): number {
    if (hours === null) return 70; // default
    if (hours >= 7 && hours <= 9) return 100;
    if (hours >= 6 && hours < 7) return 60;
    if (hours > 9 && hours <= 10) return 80;
    if (hours >= 5 && hours < 6) return 40;
    if (hours > 10) return 60;
    return 30; // <5 hours
}

// ================== Category 2: Sleep Timing & Regularity (15%) ==================

export function calculateSleepTimingScore(
    bedtime: string | null,
    regularity: SleepRegularity | null
): number {
    let bedtimeScore = 70; // default
    let regularityScore = 70; // default

    // Bedtime scoring (50% of this category)
    if (bedtime) {
        const hour = parseInt(bedtime.split(':')[0]);
        if (hour >= 22 && hour <= 23) {
            bedtimeScore = 100; // 22:00-23:00 optimal
        } else if (hour === 21) {
            bedtimeScore = 90;
        } else if (hour === 0) {
            bedtimeScore = 70;
        } else if (hour === 1) {
            bedtimeScore = 50;
        } else if (hour >= 2) {
            bedtimeScore = 30;
        }
    }

    // Regularity scoring (50% of this category)
    if (regularity) {
        switch (regularity) {
            case 'consistent': regularityScore = 100; break;
            case 'slight_variation': regularityScore = 60; break;
            case 'irregular': regularityScore = 30; break;
        }
    }

    return (bedtimeScore + regularityScore) / 2;
}

// ================== Category 3: Physical Activity (20%) ==================

export function calculateActivityScore(level: ActivityLevel | null): number {
    if (level === null) return 60; // default (level 3)
    switch (level) {
        case 1: return 20;
        case 2: return 40;
        case 3: return 60;
        case 4: return 100; // ideal, sustainable
        case 5: return 80;  // high stress, capped
        default: return 60;
    }
}

// ================== Category 4: Nutrition (20%) ==================

const MEAL_SCORE_MAP: Record<MealQuality, number> = {
    'poor': 40,
    'normal': 70,
    'good': 100,
};

const PROCESSED_PENALTY_MAP: Record<ProcessedFoodLevel, number> = {
    'high': -30,
    'medium': -15,
    'low': 0,
};

export function calculateNutritionScore(
    mealQuality: MealQuality | null,
    processedFoodLevel: ProcessedFoodLevel | null
): number {
    const mealScore = mealQuality ? MEAL_SCORE_MAP[mealQuality] : 70;
    const processedPenalty = processedFoodLevel ? PROCESSED_PENALTY_MAP[processedFoodLevel] : 0;

    return Math.max(0, Math.min(100, mealScore + processedPenalty));
}

// ================== Category 5: Hydration (10%) ==================

const WATER_SCORE_MAP: Record<WaterIntake, number> = {
    'low': 40,
    'adequate': 70,
    'good': 100,
};

export function calculateHydrationScore(waterIntake: WaterIntake | null): number {
    return waterIntake ? WATER_SCORE_MAP[waterIntake] : 70;
}

// ================== Category 6: Mental State (15%) ==================

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

export function calculateMentalScore(
    stress: StressLevel | null,
    motivation: MotivationLevel | null,
    fatigue: FatigueLevel | null
): number {
    const stressPenalty = stress ? STRESS_PENALTY_MAP[stress] : 0;
    const motivationBonus = motivation ? MOTIVATION_BONUS_MAP[motivation] : 0;
    const fatiguePenalty = fatigue ? FATIGUE_PENALTY_MAP[fatigue] : 0;

    const rawScore = 100 - stressPenalty - fatiguePenalty + motivationBonus;
    return Math.max(0, Math.min(100, rawScore));
}

// ================== Category 7: Extras (10%) ==================

const ALCOHOL_SCORE_MAP: Record<AlcoholLevel, number> = {
    none: 100,
    light: 80,
    moderate: 50,
    heavy: 20,
};

const SCREEN_TIME_SCORE_MAP: Record<ScreenTime, number> = {
    low: 100,
    moderate: 70,
    high: 40,
};

export function calculateExtrasScore(
    alcohol: AlcoholLevel | null,
    smoking: boolean | null,
    screenTime: ScreenTime | null
): number {
    const alcoholScore = alcohol ? ALCOHOL_SCORE_MAP[alcohol] : 100;
    const smokingPenalty = smoking === true ? 40 : 0;
    const screenScore = screenTime ? SCREEN_TIME_SCORE_MAP[screenTime] : 70;

    // Weight: alcohol 40%, smoking 30%, screen 30%
    const rawScore = (alcoholScore * 0.4) + ((100 - smokingPenalty) * 0.3) + (screenScore * 0.3);
    return Math.max(0, Math.min(100, rawScore));
}

// ================== Main Input Type ==================

export interface HealthScoreInput {
    // Sleep (10% + 15%)
    sleepHours: number | null;
    bedtime: string | null;
    sleepRegularity: SleepRegularity | null;
    // Activity (20%)
    activityLevel: ActivityLevel | null;
    // Nutrition (20%)
    mealQuality: MealQuality | null;
    processedFoodLevel: ProcessedFoodLevel | null;
    // Hydration (10%)
    waterIntake: WaterIntake | null;
    // Mental State (15%)
    stressLevel: StressLevel | null;
    motivationLevel: MotivationLevel | null;
    mentalFatigue: FatigueLevel | null;
    // Extras (10%)
    alcoholUnits: AlcoholLevel | null;
    smoking: boolean | null;
    screenTime: ScreenTime | null;
    // Illness (penalty modifier)
    illnessStatus: IllnessStatus | null;
}

// ================== Breakdown Type ==================

export interface HealthScoreBreakdown {
    sleepDurationScore: number;
    sleepTimingScore: number;
    activityScore: number;
    nutritionScore: number;
    hydrationScore: number;
    mentalScore: number;
    extrasScore: number;
    illnessPenalty: number;
    weightedScores: {
        sleepDuration: number;
        sleepTiming: number;
        activity: number;
        nutrition: number;
        hydration: number;
        mentalState: number;
        extras: number;
    };
    finalScore: number;
}

// ================== Illness Penalty ==================

const ILLNESS_PENALTY_MAP: Record<IllnessStatus, number> = {
    'none': 0,
    'mild': 10,
    'severe': 25,
};

export function getIllnessPenalty(illness: IllnessStatus | null): number {
    return illness ? ILLNESS_PENALTY_MAP[illness] : 0;
}

// ================== Main Calculator ==================

export function getHealthScoreBreakdown(input: HealthScoreInput): HealthScoreBreakdown {
    // Calculate each category score (0-100)
    const sleepDurationScore = calculateSleepDurationScore(input.sleepHours);
    const sleepTimingScore = calculateSleepTimingScore(input.bedtime, input.sleepRegularity);
    const activityScore = calculateActivityScore(input.activityLevel);
    const nutritionScore = calculateNutritionScore(input.mealQuality, input.processedFoodLevel);
    const hydrationScore = calculateHydrationScore(input.waterIntake);
    const mentalScore = calculateMentalScore(input.stressLevel, input.motivationLevel, input.mentalFatigue);
    const extrasScore = calculateExtrasScore(input.alcoholUnits, input.smoking, input.screenTime);

    const illnessPenalty = getIllnessPenalty(input.illnessStatus);

    // Apply weights
    const weightedScores = {
        sleepDuration: sleepDurationScore * CATEGORY_WEIGHTS.sleepDuration,
        sleepTiming: sleepTimingScore * CATEGORY_WEIGHTS.sleepTiming,
        activity: activityScore * CATEGORY_WEIGHTS.activity,
        nutrition: nutritionScore * CATEGORY_WEIGHTS.nutrition,
        hydration: hydrationScore * CATEGORY_WEIGHTS.hydration,
        mentalState: mentalScore * CATEGORY_WEIGHTS.mentalState,
        extras: extrasScore * CATEGORY_WEIGHTS.extras,
    };

    // Sum weighted scores and apply illness penalty
    const rawTotal = Object.values(weightedScores).reduce((sum, score) => sum + score, 0);
    const finalScore = Math.max(0, Math.min(100, Math.round(rawTotal - illnessPenalty)));

    return {
        sleepDurationScore,
        sleepTimingScore,
        activityScore,
        nutritionScore,
        hydrationScore,
        mentalScore,
        extrasScore,
        illnessPenalty,
        weightedScores,
        finalScore,
    };
}

export function calculateHealthScore(input: HealthScoreInput): number {
    return getHealthScoreBreakdown(input).finalScore;
}

// ================== Helpers ==================

export function getHealthStateLabel(score: number): string {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 30) return 'Low';
    return 'Critical';
}
