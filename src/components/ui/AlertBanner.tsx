'use client';

import { useState } from 'react';
import { Alert } from '@/types/database';
import { X, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

interface AlertBannerProps {
    alert: Alert;
}

const alertStyles = {
    warning: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: AlertTriangle,
        iconColor: 'text-amber-500',
        titleColor: 'text-amber-800',
        textColor: 'text-amber-700',
    },
    info: {
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        icon: Info,
        iconColor: 'text-sky-500',
        titleColor: 'text-sky-800',
        textColor: 'text-sky-700',
    },
    success: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        icon: CheckCircle,
        iconColor: 'text-emerald-500',
        titleColor: 'text-emerald-800',
        textColor: 'text-emerald-700',
    },
    danger: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: XCircle,
        iconColor: 'text-red-500',
        titleColor: 'text-red-800',
        textColor: 'text-red-700',
    },
};

export default function AlertBanner({ alert }: AlertBannerProps) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    const styles = alertStyles[alert.type];
    const Icon = styles.icon;

    return (
        <div className={`${styles.bg} ${styles.border} border rounded-xl p-4 flex items-start gap-3 fade-in`}>
            <Icon className={`w-5 h-5 ${styles.iconColor} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
                <h4 className={`font-medium ${styles.titleColor} text-sm`}>{alert.title}</h4>
                <p className={`${styles.textColor} text-sm mt-0.5`}>{alert.message}</p>
            </div>
            <button
                onClick={() => setDismissed(true)}
                className="p-1 rounded-lg hover:bg-black/5 transition-colors"
            >
                <X className="w-4 h-4 text-gray-400" />
            </button>
        </div>
    );
}
