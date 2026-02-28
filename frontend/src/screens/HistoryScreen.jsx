/**
 * HistoryScreen.jsx — Dark enterprise history with amber timeline.
 */
import { useEffect, useState } from 'react';
import useTripStore from '../store/tripStore';
import { queryRAG } from '../api/client';

const RAG_EXAMPLES = ['What route did I do last Friday?', 'Have I been to Oak Avenue?', 'How many stops does my morning run have?', 'What was my most recent trip?'];

export default function HistoryScreen() {
    const { history, loading: histLoading, fetchHistory } = useTripStore();
    const [ragQuestion, setRagQuestion] = useState('');
    const [ragAnswer, setRagAnswer] = useState(null);
    const [ragError, setRagError] = useState(null);
    const [ragLoading, setRagLoading] = useState(false);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    const handleAskRAG = async (question) => {
        const q = question || ragQuestion.trim();
        if (!q) return;
        setRagError(null); setRagAnswer(null); setRagLoading(true);
        try {
            const result = await queryRAG(q);
            if (result) setRagAnswer(result);
            else setRagError('Could not get an answer.');
        } catch { setRagError('Something went wrong.'); }
        finally { setRagLoading(false); }
    };

    return (
        <div className="min-h-full px-4 pt-6 pb-4">
            <img src="/logo.png" alt="RouteEasy" className="h-8 w-auto mb-4" />
            <h1 className="text-2xl font-extrabold text-text-primary mb-1">History</h1>
            <div className="accent-line mb-6" />

            {/* RAG Panel */}
            <section className="mb-8 animate-fade-up">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    </div>
                    <h2 className="text-base font-bold text-text-primary">Ask About Your History</h2>
                </div>

                <div className="flex gap-2 mb-3">
                    <input
                        type="text" value={ragQuestion}
                        onChange={(e) => setRagQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAskRAG()}
                        placeholder="Ask a question about your trips…"
                        className="flex-1 min-h-touch rounded-xl border border-border bg-surface px-4 py-3 text-base text-text-primary placeholder:text-text-muted disabled:opacity-50"
                        disabled={ragLoading}
                    />
                    <button onClick={() => handleAskRAG()} disabled={ragLoading || !ragQuestion.trim()} className="min-w-touch min-h-touch rounded-xl btn-accent px-4 font-bold disabled:opacity-30">
                        {ragLoading ? '…' : 'Ask'}
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                    {RAG_EXAMPLES.map((q) => (
                        <button key={q} onClick={() => { setRagQuestion(q); handleAskRAG(q); }} disabled={ragLoading} className="chip min-h-touch px-3 py-2 text-xs disabled:opacity-50">
                            {q}
                        </button>
                    ))}
                </div>

                {ragAnswer && (
                    <div className="card card-accent p-4 animate-fade-up">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-accent text-sm font-bold">AI Answer</span>
                            <span className="text-xs text-text-muted">• Based on your history</span>
                        </div>
                        <p className="text-base text-text-primary whitespace-pre-wrap">
                            {typeof ragAnswer === 'string' ? ragAnswer : ragAnswer.answer || JSON.stringify(ragAnswer)}
                        </p>
                        {ragAnswer.sources_used > 0 && (
                            <p className="text-xs text-text-muted mt-2 font-mono">{ragAnswer.sources_used} source{ragAnswer.sources_used !== 1 ? 's' : ''}</p>
                        )}
                    </div>
                )}
                {ragError && <div className="card p-3 border-danger/30 animate-fade-up"><p className="text-danger text-sm">⚠ {ragError}</p></div>}
            </section>

            {/* Timeline */}
            <section>
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Recent Launches</h2>

                {histLoading && history.length === 0 && (
                    <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton rounded-2xl h-16" />)}</div>
                )}

                {!histLoading && history.length === 0 && (
                    <div className="text-center py-8"><p className="text-text-muted text-sm">No launches yet.</p></div>
                )}

                {/* Timeline layout */}
                <div className="relative">
                    {history.length > 0 && (
                        <div className="absolute left-[11px] top-3 bottom-3 w-px bg-accent/30" />
                    )}
                    <div className="space-y-4">
                        {history.map((h, idx) => {
                            const date = new Date(h.launched_at);
                            let stopsCount = 0;
                            try { stopsCount = JSON.parse(h.stops_json || '[]').length; } catch { stopsCount = 0; }

                            return (
                                <div key={h.id} className="flex gap-3 animate-fade-up" style={{ animationDelay: `${idx * 40}ms` }}>
                                    {/* Timeline dot */}
                                    <div className="relative z-10 w-6 h-6 rounded-full bg-base border-2 border-accent flex items-center justify-center shrink-0 mt-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                    </div>
                                    {/* Card */}
                                    <div className="card p-3 flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-text-primary truncate">{h.trip_name || 'Unnamed Trip'}</h3>
                                            <span className="text-[11px] text-text-muted shrink-0 ml-2 font-mono">
                                                {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                                                {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-text-muted mt-0.5 font-mono">{stopsCount} stops</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
    );
}
