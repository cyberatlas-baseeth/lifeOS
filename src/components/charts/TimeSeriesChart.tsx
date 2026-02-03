'use client';

import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

interface DataPoint {
    date: string;
    [key: string]: string | number;
}

interface TimeSeriesChartProps {
    data: DataPoint[];
    lines?: {
        dataKey: string;
        name: string;
        color: string;
    }[];
    bars?: {
        dataKey: string;
        name: string;
        color: string;
    }[];
    type?: 'line' | 'bar';
    height?: number;
    showLegend?: boolean;
}

const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
}) => {
    if (!active || !payload) return null;

    return (
        <div className="glass-dark rounded-lg p-3 border border-slate-700/50 shadow-xl">
            <p className="text-xs text-slate-400 mb-2">
                {label && format(parseISO(label), 'd MMMM yyyy', { locale: tr })}
            </p>
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-slate-400">{entry.name}:</span>
                    <span className="font-medium text-white">{entry.value}</span>
                </div>
            ))}
        </div>
    );
};

export default function TimeSeriesChart({
    data,
    lines = [],
    bars = [],
    type = 'line',
    height = 300,
    showLegend = true,
}: TimeSeriesChartProps) {
    if (!data || data.length === 0) {
        return (
            <div
                className="flex items-center justify-center text-slate-500"
                style={{ height }}
            >
                Henüz veri yok
            </div>
        );
    }

    const formatXAxis = (dateStr: string) => {
        try {
            return format(parseISO(dateStr), 'd MMM', { locale: tr });
        } catch {
            return dateStr;
        }
    };

    if (type === 'bar') {
        return (
            <ResponsiveContainer width="100%" height={height}>
                <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={formatXAxis}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(100, 116, 139, 0.2)' }}
                    />
                    <YAxis
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(100, 116, 139, 0.2)' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {showLegend && (
                        <Legend
                            wrapperStyle={{ fontSize: 12 }}
                            iconType="circle"
                        />
                    )}
                    {bars.map((bar) => (
                        <Bar
                            key={bar.dataKey}
                            dataKey={bar.dataKey}
                            name={bar.name}
                            fill={bar.color}
                            radius={[4, 4, 0, 0]}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                <XAxis
                    dataKey="date"
                    tickFormatter={formatXAxis}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(100, 116, 139, 0.2)' }}
                />
                <YAxis
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(100, 116, 139, 0.2)' }}
                />
                <Tooltip content={<CustomTooltip />} />
                {showLegend && (
                    <Legend
                        wrapperStyle={{ fontSize: 12 }}
                        iconType="circle"
                    />
                )}
                {lines.map((line) => (
                    <Line
                        key={line.dataKey}
                        type="monotone"
                        dataKey={line.dataKey}
                        name={line.name}
                        stroke={line.color}
                        strokeWidth={2}
                        dot={{ fill: line.color, strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
