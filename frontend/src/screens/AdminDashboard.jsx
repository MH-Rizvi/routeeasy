/**
 * AdminDashboard.jsx — Admin-only LLM analytics dashboard.
 * Dark amber design matching RoutAura's design language.
 * Uses Recharts for all visualizations.
 */
import { useEffect, useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getAdminMetrics } from '../api/client';
import useAuthStore from '../store/authStore';
import Header from '../components/Header';

/* ── Color palette ── */
const AMBER = '#F59E0B';
const AMBER_DIM = '#92400E';
const AMBER_GLOW = 'rgba(245,158,11,0.15)';
const EMERALD = '#10B981';
const RED = '#EF4444';
const SURFACE = '#111827';
const ELEVATED = '#1a2235';
const BORDER = '#1F2937';
const TEXT_PRIMARY = '#F9FAFB';
const TEXT_SECONDARY = '#9CA3AF';
const TEXT_MUTED = '#4B5563';

const PIE_COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];

/* ── Skeleton loader ── */
function Skeleton({ className = '' }) {
    return (
        <div className={`animate-pulse rounded-2xl bg-gradient-to-r from-[#1F2937] via-[#283548] to-[#1F2937] bg-[length:200%_100%] animate-shimmer ${className}`} />
    );
}

/* ── Stat Card ── */
function StatCard({ icon, label, value, subtext, color = AMBER, loading }) {
    if (loading) return <Skeleton className="h-[120px]" />;
    return (
        <div
            className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] group"
            style={{
                background: `linear-gradient(135deg, ${SURFACE} 0%, ${ELEVATED} 100%)`,
                border: `1px solid ${BORDER}`,
            }}
        >
            {/* Glow accent */}
            <div
                className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
                style={{ background: color }}
            />
            <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                    <span style={{ color }}>{icon}</span>
                </div>
            </div>
            <p className="text-[32px] font-extrabold text-white leading-none mb-1 font-mono tracking-tight">{value}</p>
            <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: TEXT_MUTED }}>{label}</p>
            {subtext && <p className="text-[11px] mt-1" style={{ color: TEXT_SECONDARY }}>{subtext}</p>}
        </div>
    );
}

/* ── Chart Card wrapper ── */
function ChartCard({ title, children, loading, className = '' }) {
    if (loading) return <Skeleton className={`h-[340px] ${className}`} />;
    return (
        <div
            className={`rounded-2xl p-5 ${className}`}
            style={{
                background: `linear-gradient(135deg, ${SURFACE} 0%, ${ELEVATED} 100%)`,
                border: `1px solid ${BORDER}`,
            }}
        >
            <h3 className="text-[13px] font-bold uppercase tracking-widest mb-4" style={{ color: TEXT_SECONDARY }}>{title}</h3>
            {children}
        </div>
    );
}

/* ── Custom Recharts Tooltip ── */
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl px-4 py-3 shadow-xl" style={{ background: '#0d1117', border: `1px solid ${BORDER}` }}>
            <p className="text-[11px] font-semibold mb-1" style={{ color: TEXT_SECONDARY }}>{label}</p>
            {payload.map((entry, i) => (
                <p key={i} className="text-[13px] font-bold" style={{ color: entry.color || AMBER }}>
                    {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                </p>
            ))}
        </div>
    );
}

/* ── Main Component ── */
export default function AdminDashboard() {
    const user = useAuthStore((s) => s.user);
    const isHydrating = useAuthStore((s) => s.isHydrating);

    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters for raw logs table
    const [modelFilter, setModelFilter] = useState('all');
    const [successFilter, setSuccessFilter] = useState('all');
    const [sortField, setSortField] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');

    useEffect(() => {
        if (user?.role !== 'admin') return;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getAdminMetrics();
                setMetrics(data);
            } catch (err) {
                console.error('[AdminDashboard] Failed to load metrics:', err);
                setError('Failed to load admin metrics. Please try again.');
            } finally {
                setLoading(false);
            }
        })();
    }, [user]);

    // Redirect non-admin users
    if (!isHydrating && user && user.role !== 'admin') {
        return <Navigate to="/home" replace />;
    }

    // Unique models for filter dropdown
    const uniqueModels = useMemo(() => {
        if (!metrics?.raw_logs) return [];
        return [...new Set(metrics.raw_logs.map((l) => l.model))].sort();
    }, [metrics]);

    // Filtered & sorted raw logs
    const filteredLogs = useMemo(() => {
        if (!metrics?.raw_logs) return [];
        let logs = [...metrics.raw_logs];

        if (modelFilter !== 'all') {
            logs = logs.filter((l) => l.model === modelFilter);
        }
        if (successFilter !== 'all') {
            const val = successFilter === 'true';
            logs = logs.filter((l) => l.success === val);
        }

        logs.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];
            if (sortField === 'created_at') {
                aVal = new Date(aVal || 0).getTime();
                bVal = new Date(bVal || 0).getTime();
            }
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });

        return logs;
    }, [metrics, modelFilter, successFilter, sortField, sortDir]);

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const sortIcon = (field) => {
        if (sortField !== field) return '↕';
        return sortDir === 'asc' ? '↑' : '↓';
    };

    const totalTokens = metrics ? (metrics.total_input_tokens + metrics.total_output_tokens) : 0;

    return (
        <div className="min-h-full pb-4 animate-page-enter">
            <Header
                rightElement={
                    <span className="text-accent text-[12px] font-bold tracking-widest uppercase hidden sm:inline">Admin Dashboard</span>
                }
            />

            <div className="px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6 pb-24 max-w-[1400px] mx-auto">
                {/* ── Page Title ── */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: AMBER_GLOW, border: `1px solid ${AMBER}30` }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-extrabold text-white tracking-tight">Admin Dashboard</h1>
                            <p className="text-[13px]" style={{ color: TEXT_SECONDARY }}>LLM usage analytics & system health</p>
                        </div>
                    </div>
                </div>

                {/* ── Error State ── */}
                {error && (
                    <div className="rounded-2xl p-5 mb-6 animate-fade-up" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                        <div className="flex items-center gap-3">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            <p className="text-red-400 text-sm font-medium">{error}</p>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════
                    ROW 1 — Stat Cards
                ═══════════════════════════════════════════ */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard
                        loading={loading}
                        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>}
                        label="Total LLM Calls"
                        value={metrics?.total_calls?.toLocaleString() ?? '—'}
                        color={AMBER}
                    />
                    <StatCard
                        loading={loading}
                        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
                        label="Success Rate"
                        value={metrics ? `${metrics.success_rate}%` : '—'}
                        color={metrics?.success_rate >= 95 ? EMERALD : metrics?.success_rate >= 80 ? AMBER : RED}
                    />
                    <StatCard
                        loading={loading}
                        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>}
                        label="Avg Latency"
                        value={metrics ? `${metrics.avg_latency_ms}ms` : '—'}
                        color={AMBER}
                    />
                    <StatCard
                        loading={loading}
                        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>}
                        label="Total Tokens"
                        value={totalTokens?.toLocaleString() ?? '—'}
                        subtext={metrics ? `In: ${metrics.total_input_tokens.toLocaleString()} · Out: ${metrics.total_output_tokens.toLocaleString()}` : undefined}
                        color={AMBER}
                    />
                </div>

                {/* ═══════════════════════════════════════════
                    ROW 2 — Line Charts (Calls + Latency over time)
                ═══════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <ChartCard title="LLM Calls Over Time (30d)" loading={loading}>
                        {metrics?.calls_over_time?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={metrics.calls_over_time}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                                    <XAxis dataKey="date" tick={{ fill: TEXT_MUTED, fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                                    <YAxis tick={{ fill: TEXT_MUTED, fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="count" name="Calls" stroke={AMBER} strokeWidth={2.5} dot={{ fill: AMBER, r: 3 }} activeDot={{ r: 5, fill: AMBER, stroke: '#fff', strokeWidth: 2 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChart message="No call data in the last 30 days" />
                        )}
                    </ChartCard>

                    <ChartCard title="Average Latency Over Time (30d)" loading={loading}>
                        {metrics?.latency_over_time?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={metrics.latency_over_time}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                                    <XAxis dataKey="date" tick={{ fill: TEXT_MUTED, fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                                    <YAxis tick={{ fill: TEXT_MUTED, fontSize: 11 }} unit="ms" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="avg" name="Avg Latency (ms)" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: '#3B82F6', r: 3 }} activeDot={{ r: 5, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChart message="No latency data in the last 30 days" />
                        )}
                    </ChartCard>
                </div>

                {/* ═══════════════════════════════════════════
                    ROW 3 — Stacked Bar (Tokens) + Donut (Model Distribution)
                ═══════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <ChartCard title="Input vs Output Tokens Over Time" loading={loading}>
                        {metrics?.tokens_over_time?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={metrics.tokens_over_time}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                                    <XAxis dataKey="date" tick={{ fill: TEXT_MUTED, fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                                    <YAxis tick={{ fill: TEXT_MUTED, fontSize: 11 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 11, color: TEXT_SECONDARY }} />
                                    <Bar dataKey="input" name="Input Tokens" stackId="tokens" fill={AMBER} radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="output" name="Output Tokens" stackId="tokens" fill={EMERALD} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChart message="No token data in the last 30 days" />
                        )}
                    </ChartCard>

                    <ChartCard title="Model Distribution" loading={loading}>
                        {metrics?.model_distribution?.length > 0 ? (
                            <div className="flex flex-col items-center">
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={metrics.model_distribution}
                                            dataKey="count"
                                            nameKey="model"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={90}
                                            paddingAngle={2}
                                            stroke="none"
                                        >
                                            {metrics.model_distribution.map((_, i) => (
                                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                                    {metrics.model_distribution.map((item, i) => (
                                        <div key={item.model} className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                            <span className="text-[11px] font-mono" style={{ color: TEXT_SECONDARY }}>
                                                {item.model.length > 25 ? item.model.slice(0, 25) + '…' : item.model} ({item.count})
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <EmptyChart message="No model data available" />
                        )}
                    </ChartCard>
                </div>

                {/* ═══════════════════════════════════════════
                    ROW 4 — Recent Errors
                ═══════════════════════════════════════════ */}
                <ChartCard title="Recent Errors" loading={loading} className="mb-6">
                    {!metrics?.recent_errors?.length ? (
                        <div className="flex items-center gap-3 py-6 justify-center">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={EMERALD} strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                            </div>
                            <p className="text-sm font-semibold" style={{ color: EMERALD }}>No errors recorded — all systems healthy!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-5">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                                        <Th>Timestamp</Th>
                                        <Th>Model</Th>
                                        <Th>Error Message</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {metrics.recent_errors.map((err, i) => (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-[#0A0F1E]/50' : ''} style={{ borderBottom: `1px solid ${BORDER}40` }}>
                                            <td className="px-5 py-3 whitespace-nowrap font-mono text-xs" style={{ color: TEXT_SECONDARY }}>
                                                {err.created_at ? new Date(err.created_at).toLocaleString() : '—'}
                                            </td>
                                            <td className="px-5 py-3 font-mono text-xs" style={{ color: TEXT_PRIMARY }}>
                                                {err.model}
                                            </td>
                                            <td className="px-5 py-3 text-xs max-w-[400px] truncate" style={{ color: RED }}>
                                                {err.error_message || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </ChartCard>

                {/* ═══════════════════════════════════════════
                    ROW 5 — Raw Logs Table
                ═══════════════════════════════════════════ */}
                <ChartCard title="Raw LLM Logs" loading={loading}>
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 mb-4">
                        <div className="flex items-center gap-2">
                            <label className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: TEXT_MUTED }}>Model:</label>
                            <select
                                value={modelFilter}
                                onChange={(e) => setModelFilter(e.target.value)}
                                className="text-xs font-mono rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-amber-500/50"
                                style={{ background: '#0d1117', border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
                            >
                                <option value="all">All Models</option>
                                {uniqueModels.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: TEXT_MUTED }}>Status:</label>
                            <select
                                value={successFilter}
                                onChange={(e) => setSuccessFilter(e.target.value)}
                                className="text-xs font-mono rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-amber-500/50"
                                style={{ background: '#0d1117', border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }}
                            >
                                <option value="all">All</option>
                                <option value="true">Success</option>
                                <option value="false">Failed</option>
                            </select>
                        </div>
                        <div className="ml-auto text-[11px] font-mono" style={{ color: TEXT_MUTED }}>
                            {filteredLogs.length} row{filteredLogs.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {filteredLogs.length === 0 ? (
                        <EmptyChart message="No logs match the current filters" />
                    ) : (
                        <div className="overflow-x-auto -mx-5">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                                        <Th>User ID</Th>
                                        <Th>Model</Th>
                                        <Th right>Input</Th>
                                        <Th right>Output</Th>
                                        <ThSortable field="latency_ms" label="Latency" right sortField={sortField} sortDir={sortDir} onSort={toggleSort} sortIcon={sortIcon} />
                                        <Th center>Status</Th>
                                        <ThSortable field="created_at" label="Created At" sortField={sortField} sortDir={sortDir} onSort={toggleSort} sortIcon={sortIcon} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.map((log, i) => (
                                        <tr key={log.id || i} className={i % 2 === 0 ? 'bg-[#0A0F1E]/50' : ''} style={{ borderBottom: `1px solid ${BORDER}40` }}>
                                            <td className="px-5 py-3 font-mono text-xs max-w-[120px] truncate" style={{ color: TEXT_SECONDARY }} title={log.user_id}>
                                                {log.user_id ? log.user_id.slice(0, 8) + '…' : '—'}
                                            </td>
                                            <td className="px-5 py-3 font-mono text-xs max-w-[180px] truncate" style={{ color: TEXT_PRIMARY }}>
                                                {log.model}
                                            </td>
                                            <td className="px-5 py-3 text-right font-mono text-xs" style={{ color: TEXT_PRIMARY }}>
                                                {log.input_tokens?.toLocaleString() ?? '—'}
                                            </td>
                                            <td className="px-5 py-3 text-right font-mono text-xs" style={{ color: TEXT_PRIMARY }}>
                                                {log.output_tokens?.toLocaleString() ?? '—'}
                                            </td>
                                            <td className="px-5 py-3 text-right font-mono text-xs" style={{ color: TEXT_PRIMARY }}>
                                                {log.latency_ms != null ? `${log.latency_ms}ms` : '—'}
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                {log.success ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: EMERALD }}>✓</span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold cursor-help" style={{ background: 'rgba(239,68,68,0.15)', color: RED }} title={log.error_message || 'Failed'}>✗</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap font-mono text-xs" style={{ color: TEXT_SECONDARY }}>
                                                {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </ChartCard>
            </div>
        </div>
    );
}

/* ── Table header helpers ── */
function Th({ children, right, center }) {
    return (
        <th
            className={`px-5 py-3 font-semibold text-[10px] uppercase tracking-widest ${right ? 'text-right' : ''} ${center ? 'text-center' : ''}`}
            style={{ color: TEXT_MUTED }}
        >
            {children}
        </th>
    );
}

function ThSortable({ field, label, right, sortField, sortDir, onSort, sortIcon }) {
    return (
        <th
            className={`px-5 py-3 font-semibold text-[10px] uppercase tracking-widest cursor-pointer select-none hover:text-white transition-colors ${right ? 'text-right' : ''}`}
            style={{ color: sortField === field ? AMBER : TEXT_MUTED }}
            onClick={() => onSort(field)}
        >
            {label} <span className="ml-1">{sortIcon(field)}</span>
        </th>
    );
}

/* ── Empty chart placeholder ── */
function EmptyChart({ message }) {
    return (
        <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: AMBER_GLOW, border: `1px solid ${AMBER}30` }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                </svg>
            </div>
            <p className="text-[13px]" style={{ color: TEXT_MUTED }}>{message}</p>
        </div>
    );
}
