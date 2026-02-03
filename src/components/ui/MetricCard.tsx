import Link from 'next/link';
import { LucideIcon, ArrowUpRight } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string;
    subtitle: string;
    icon: LucideIcon;
    color: 'emerald' | 'violet' | 'sky' | 'green' | 'amber' | 'red' | 'accent';
    href: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
}

const colorClasses = {
    emerald: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-600',
        border: 'border-emerald-200',
    },
    violet: {
        bg: 'bg-violet-100',
        text: 'text-violet-600',
        border: 'border-violet-200',
    },
    sky: {
        bg: 'bg-sky-100',
        text: 'text-sky-600',
        border: 'border-sky-200',
    },
    green: {
        bg: 'bg-green-100',
        text: 'text-green-600',
        border: 'border-green-200',
    },
    amber: {
        bg: 'bg-amber-100',
        text: 'text-amber-600',
        border: 'border-amber-200',
    },
    red: {
        bg: 'bg-red-100',
        text: 'text-red-600',
        border: 'border-red-200',
    },
    accent: {
        bg: 'bg-primary-100',
        text: 'text-primary-600',
        border: 'border-primary-200',
    },
};

export default function MetricCard({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    href,
    trend,
}: MetricCardProps) {
    const colors = colorClasses[color];

    return (
        <Link href={href}>
            <div className="bg-white rounded-xl p-5 card-hover group cursor-pointer h-full shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all">
                <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                </div>

                <h3 className="text-sm text-gray-500 mb-1">{title}</h3>
                <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    {trend && (
                        <span className={`text-xs font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                            {trend.isPositive ? '+' : ''}{trend.value}%
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            </div>
        </Link>
    );
}
