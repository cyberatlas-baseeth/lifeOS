'use client';

import { AvatarState } from '@/types/database';
import { getAvatarColors } from '@/lib/avatar/calculator';

interface AvatarDisplayProps {
    state: AvatarState | null;
    size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-40 h-40',
    lg: 'w-56 h-56',
};

const emojiMap: Record<string, string> = {
    thriving: '🌟',
    energetic: '⚡',
    stable: '🧘',
    tired: '😴',
    stressed: '😰',
    critical: '🆘',
};

const statusLabels: Record<string, string> = {
    thriving: 'Thriving',
    energetic: 'Energetic',
    stable: 'Stable',
    tired: 'Tired',
    stressed: 'Stressed',
    critical: 'Critical',
};

export default function AvatarDisplay({ state, size = 'lg' }: AvatarDisplayProps) {
    const status = state?.status || 'stable';
    const colors = getAvatarColors(status);
    const overallScore = state?.overallScore || 50;

    return (
        <div className="relative">
            {/* Outer glow */}
            <div
                className={`absolute inset-0 ${sizeClasses[size]} rounded-full blur-2xl opacity-40 animate-pulse-slow`}
                style={{ background: colors.glow }}
            />

            {/* Progress ring background */}
            <svg className={`${sizeClasses[size]} relative`} viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(34, 197, 94, 0.15)"
                    strokeWidth="4"
                />

                {/* Progress circle */}
                <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={colors.primary}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${overallScore * 2.83} ${283 - overallScore * 2.83}`}
                    strokeDashoffset="70.75"
                    className="transition-all duration-1000 ease-out"
                    style={{
                        filter: `drop-shadow(0 0 6px ${colors.glow})`,
                    }}
                />

                {/* Inner circle with gradient */}
                <defs>
                    <radialGradient id={`avatar-gradient-${status}`} cx="0.3" cy="0.3" r="0.7">
                        <stop offset="0%" stopColor={colors.secondary} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={colors.primary} stopOpacity="0.15" />
                    </radialGradient>
                </defs>
                <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill={`url(#avatar-gradient-${status})`}
                    className="avatar-animate"
                    style={{
                        transformOrigin: 'center',
                    }}
                />
            </svg>

            {/* Avatar content */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center avatar-animate">
                    <div className={`${size === 'lg' ? 'text-5xl' : size === 'md' ? 'text-4xl' : 'text-2xl'} mb-1`}>
                        {emojiMap[status]}
                    </div>
                    <div
                        className={`${size === 'sm' ? 'text-lg' : 'text-2xl'} font-bold`}
                        style={{ color: colors.primary }}
                    >
                        {overallScore}
                    </div>
                </div>
            </div>

            {/* Status indicator */}
            <div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap shadow-sm"
                style={{
                    background: `${colors.primary}15`,
                    color: colors.primary,
                    border: `1px solid ${colors.primary}30`,
                }}
            >
                {statusLabels[status]}
            </div>
        </div>
    );
}
