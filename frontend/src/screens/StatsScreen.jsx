import React, { useState, useEffect, useMemo } from 'react';
import { getStatsSummary, getStatsDaily } from '../api/client';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

// Helper to format date "YYYY-MM-DD" to "Mar 1"
const formatDateString = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function StatsScreen() {
    const [summary, setSummary] = useState(null);
    const [dailyLogs, setDailyLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [daysRange, setDaysRange] = useState(30);

    useEffect(() => {
        let isMounted = true;

        async function fetchStats() {
            setLoading(true);
            setError('');
            try {
                // Fetch summary and max daily logs simultaneously
                const [summaryData, dailyData] = await Promise.all([
                    getStatsSummary(),
                    getStatsDaily(30)
                ]);

                if (isMounted) {
                    setSummary(summaryData);
                    setDailyLogs(dailyData);
                }
            } catch (err) {
                if (isMounted) {
                    setError('Failed to load your stats. Please try again later.');
                    console.error("Stats fetch error:", err);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchStats();
        return () => { isMounted = false; };
    }, []);

    const chartData = useMemo(() => {
        if (!dailyLogs || dailyLogs.length === 0) return [];
        // Slice the last N days safely
        const startIndex = Math.max(0, dailyLogs.length - daysRange);
        return dailyLogs.slice(startIndex).map(d => ({
            ...d,
            formattedDate: formatDateString(d.date)
        }));
    }, [dailyLogs, daysRange]);

    const isCompletelyEmpty = useMemo(() => {
        if (!summary) return true;
        return summary.total_trips === 0;
    }, [summary]);

    // Format numbers safely
    const formatMiles = (val) => (val || 0).toFixed(1);
    const formatInt = (val) => (val || 0).toLocaleString();

    if (loading) {
        return (
            <div className="flex-1 overflow-y-auto bg-bg-app p-4 sm:p-6 lg:p-8 animate-pulse">
                <div className="h-8 w-48 bg-surface border border-border rounded-xl mb-6"></div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-surface rounded-2xl h-24 border border-border"></div>
                    <div className="bg-surface rounded-2xl h-24 border border-border"></div>
                    <div className="bg-surface rounded-2xl h-24 border border-border"></div>
                    <div className="bg-surface rounded-2xl h-24 border border-border"></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-surface rounded-2xl h-20 border border-border"></div>
                    <div className="bg-surface rounded-2xl h-20 border border-border"></div>
                </div>
                <div className="bg-surface rounded-3xl h-64 border border-border"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center p-6 bg-bg-app">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-text-primary font-medium">{error}</p>
                </div>
            </div>
        );
    }

    if (isCompletelyEmpty) {
        return (
            <div className="flex-1 flex items-center justify-center p-6 bg-bg-app">
                <div className="text-center max-w-sm">
                    <div className="w-20 h-20 mx-auto bg-surface border border-border rounded-full flex items-center justify-center shadow-sm mb-6">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                            <line x1="18" y1="20" x2="18" y2="10" />
                            <line x1="12" y1="20" x2="12" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-semibold text-text-primary mb-2">No Stats Yet</h2>
                    <p className="text-text-muted">Start driving to see your stats here.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-bg-app p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
            <header className="pt-2">
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">Dashboard</h1>
            </header>

            {/* 2x2 Grid for Core Period Stats */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <StatCard label="Trips Today" value={formatInt(summary?.trips_today)} />
                <StatCard label="Trips This Week" value={formatInt(summary?.trips_this_week)} />
                <StatCard label="Miles Today" value={formatMiles(summary?.miles_today)} suffix="mi" />
                <StatCard label="Miles This Week" value={formatMiles(summary?.miles_this_week)} suffix="mi" />
            </div>

            {/* Lifetime Stats */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <StatCard label="Lifetime Trips" value={formatInt(summary?.total_trips)} isSecondary />
                <StatCard label="Lifetime Miles" value={formatMiles(summary?.miles_all_time)} suffix="mi" isSecondary />
            </div>

            {/* Chart Section */}
            <div className="bg-surface border border-border rounded-3xl p-4 sm:p-6 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-base font-semibold text-text-primary">Daily Miles Driven</h2>
                    <div className="flex bg-bg-app rounded-xl p-1 border border-border shrink-0">
                        <button
                            onClick={() => setDaysRange(7)}
                            className={`min-w-touch px-3 py-1 text-xs font-medium rounded-lg transition-colors ${daysRange === 7 ? 'bg-surface text-text-primary shadow border border-border/50' : 'text-text-muted hover:text-text-secondary'}`}
                        >
                            7 Days
                        </button>
                        <button
                            onClick={() => setDaysRange(30)}
                            className={`min-w-touch px-3 py-1 text-xs font-medium rounded-lg transition-colors ${daysRange === 30 ? 'bg-surface text-text-primary shadow border border-border/50' : 'text-text-muted hover:text-text-secondary'}`}
                        >
                            30 Days
                        </button>
                    </div>
                </div>

                <div className="h-64 w-full -ml-4 sm:m-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <XAxis
                                dataKey="formattedDate"
                                stroke="#8B949E"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#8B949E"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${val}`}
                                dx={-10}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--surface)',
                                    borderColor: 'var(--border)',
                                    borderRadius: '12px',
                                    color: 'var(--text-primary)',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                                }}
                                itemStyle={{ color: '#2563EB', fontWeight: 'bold' }}
                                labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px' }}
                                cursor={{ stroke: 'var(--border)', strokeWidth: 2, strokeDasharray: '4 4' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="miles"
                                stroke="#2563EB"
                                strokeWidth={3}
                                dot={{ fill: '#2563EB', strokeWidth: 2, r: 4, stroke: 'var(--surface)' }}
                                activeDot={{ r: 6, stroke: 'var(--surface)', strokeWidth: 2 }}
                                animationDuration={1000}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom padding to ensure content isn't swallowed by safe-area-bottom in extreme heights */}
            <div className="h-6 w-full"></div>
        </div>
    );
}

function StatCard({ label, value, suffix, isSecondary }) {
    return (
        <div className={`flex flex-col p-4 rounded-2xl border ${isSecondary ? 'bg-bg-app border-border/50' : 'bg-surface border-border shadow-sm'}`}>
            <span className="text-text-muted text-xs font-medium uppercase tracking-wider mb-2 line-clamp-1">{label}</span>
            <div className="flex items-baseline gap-1 mt-auto">
                <span className={`text-2xl sm:text-3xl tracking-tight font-semibold ${isSecondary ? 'text-text-secondary' : 'text-text-primary'}`}>{value}</span>
                {suffix && <span className="text-text-muted text-sm font-medium">{suffix}</span>}
            </div>
        </div>
    );
}
