/**
 * LLMLogsScreen.jsx — Portfolio-grade LLMOps dashboard.
 */
import { useEffect, useState } from 'react';
import { getLLMLogs } from '../api/client';

export default function LLMLogsScreen() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            setLoading(true); setError(null);
            try { const d = await getLLMLogs(); setLogs(d.items || []); }
            catch { setError('Could not load LLM logs.'); }
            finally { setLoading(false); }
        })();
    }, []);

    const totalCalls = logs.length;
    const totalIn = logs.reduce((s, l) => s + (l.input_tokens || 0), 0);
    const totalOut = logs.reduce((s, l) => s + (l.output_tokens || 0), 0);
    const totalTokens = totalIn + totalOut;
    const avgLatency = totalCalls > 0 ? Math.round(logs.reduce((s, l) => s + (l.latency_ms || 0), 0) / totalCalls) : 0;
    const maxLatency = logs.length > 0 ? Math.max(...logs.map(l => l.latency_ms || 0)) : 1;
    const successCount = logs.filter(l => l.success).length;
    const successRate = totalCalls > 0 ? Math.round((successCount / totalCalls) * 100) : 0;

    return (
        <div className="min-h-full px-4 pt-6 pb-4">
            <div className="flex items-center justify-between mb-1">
                <h1 className="text-2xl font-extrabold text-text-primary">LLM Logs</h1>
                <span className="text-xs text-text-muted font-mono bg-elevated px-2 py-1 rounded border border-border">LLMOps</span>
            </div>
            <p className="text-sm text-text-secondary mb-1">Every AI call tracked for cost & performance observability</p>
            <div className="accent-line mb-6" />

            {loading && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton rounded-2xl h-24" />)}
                </div>
            )}

            {error && (
                <div className="card p-4 mb-4 border-danger/30 animate-fade-up">
                    <p className="text-danger text-sm">⚠ {error}</p>
                </div>
            )}

            {!loading && !error && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                        <MetricCard icon={<BarIcon />} label="Total Calls" value={totalCalls} />
                        <MetricCard icon={<TokenIcon />} label="Total Tokens" value={totalTokens.toLocaleString()} />
                        <MetricCard icon={<BoltIcon />} label="Avg Latency" value={`${avgLatency}ms`} />
                        <MetricCard icon={successRate >= 90 ? <CheckIcon /> : <WarnIcon />} label="Success Rate" value={`${successRate}%`} highlight={successRate >= 90} />
                    </div>

                    {logs.length === 0 ? (
                        <div className="text-center py-12 animate-fade-up">
                            <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                                <BarIcon />
                            </div>
                            <p className="text-text-secondary text-sm">No LLM calls logged yet. Chat with the agent to generate logs.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left">
                                        <Th>Time</Th><Th>Model</Th><Th>Version</Th><Th right>In</Th><Th right>Out</Th><Th right>Latency</Th><Th center>Status</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log, i) => {
                                        const ts = new Date(log.timestamp);
                                        const latPct = maxLatency > 0 ? Math.round(((log.latency_ms || 0) / maxLatency) * 100) : 0;
                                        return (
                                            <tr key={log.id} className="border-b border-border/50 hover:bg-elevated/50 transition-colors animate-fade-up" style={{ animationDelay: `${100 + i * 15}ms` }}>
                                                <td className="px-4 py-3 whitespace-nowrap text-text-secondary font-mono text-xs">
                                                    {ts.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                                                    {ts.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                                </td>
                                                <td className="px-4 py-3 text-text-primary truncate max-w-[110px] font-mono text-xs">{log.model}</td>
                                                <td className="px-4 py-3 text-text-muted font-mono text-xs">{log.prompt_version}</td>
                                                <td className="px-4 py-3 text-right text-text-primary font-mono text-xs">{log.input_tokens ?? '—'}</td>
                                                <td className="px-4 py-3 text-right text-text-primary font-mono text-xs">{log.output_tokens ?? '—'}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
                                                            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${latPct}%` }} />
                                                        </div>
                                                        <span className="text-text-secondary font-mono text-xs w-12 text-right">{log.latency_ms ? `${log.latency_ms}ms` : '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {log.success ? (
                                                        <span className="w-5 h-5 rounded-full bg-success/20 text-success inline-flex items-center justify-center text-[10px] font-bold">✓</span>
                                                    ) : (
                                                        <span className="w-5 h-5 rounded-full bg-danger/20 text-danger inline-flex items-center justify-center text-[10px] font-bold" title={log.error_message}>✗</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function Th({ children, right, center }) {
    return <th className={`px-4 py-3 font-semibold text-text-muted text-[10px] uppercase tracking-widest ${right ? 'text-right' : ''} ${center ? 'text-center' : ''}`}>{children}</th>;
}

function MetricCard({ icon, label, value, highlight }) {
    return (
        <div className={`card p-4 text-center animate-fade-up ${highlight ? 'border-success/30' : ''}`}>
            <div className="flex justify-center mb-2 text-accent">{icon}</div>
            <p className="text-xl font-extrabold text-text-primary font-mono">{value}</p>
            <p className="text-[10px] text-text-muted uppercase tracking-widest mt-1">{label}</p>
        </div>
    );
}

/* Mini SVG icons */
function BarIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>; }
function TokenIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>; }
function BoltIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>; }
function CheckIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>; }
function WarnIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>; }
