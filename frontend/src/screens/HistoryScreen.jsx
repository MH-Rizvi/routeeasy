/**
 * HistoryScreen.jsx — Dark enterprise history with amber timeline.
 */
import { useEffect, useState } from 'react';
import useTripStore from '../store/tripStore';
import { queryRAG } from '../api/client';
import useToastStore from '../store/toastStore';
import Header from '../components/Header';

const RAG_EXAMPLES = ['What route did I do last Friday?', 'Have I been to Oak Avenue?', 'How many stops does my morning run have?', 'What was my most recent trip?'];

export default function HistoryScreen() {
    const { history, loading: histLoading, fetchHistory, removeHistoryItem, clearHistory } = useTripStore();
    const [ragQuestion, setRagQuestion] = useState('');
    const [ragAnswer, setRagAnswer] = useState(null);
    const [ragError, setRagError] = useState(null);
    const [ragLoading, setRagLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

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
        <div className="min-h-full pb-4">
            <Header
                rightElement={
                    <span className="text-accent text-[12px] font-bold tracking-widest uppercase hidden sm:inline">History</span>
                }
            />

            <div className="px-4 sm:px-5 mt-4 sm:mt-5 pb-24">

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

                    <div className="grid grid-cols-2 gap-[10px] mb-4">
                        {RAG_EXAMPLES.map((q) => (
                            <button
                                key={q}
                                onClick={() => { setRagQuestion(q); handleAskRAG(q); }}
                                disabled={ragLoading}
                                className="bg-[#111827] border border-[#F59E0B] rounded-[20px] px-3 py-2 text-[#F59E0B] text-[12px] text-center disabled:opacity-50 transition-colors active:bg-[#F59E0B]/10"
                            >
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
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Recent Launches</h2>
                        {history.length > 0 && (
                            <button onClick={async () => {
                                if (window.confirm("Are you sure you want to delete all history?")) {
                                    await clearHistory();
                                    useToastStore.getState().showToast('All history cleared.', 'success');
                                }
                            }} className="text-danger text-[11px] font-bold px-2 py-1 uppercase tracking-wider rounded-md bg-danger/10 hover:bg-danger/20 transition-colors">
                                Clear All
                            </button>
                        )}
                    </div>

                    {histLoading && history.length === 0 && (
                        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton rounded-2xl h-16" />)}</div>
                    )}

                    {!histLoading && history.length === 0 && (
                        <div className="text-center py-8"><p className="text-text-muted text-sm">No launches yet.</p></div>
                    )}

                    {/* Timeline layout */}
                    <div className="relative">
                        {history.length > 0 && (
                            <div className="absolute left-[7px] top-3 bottom-3 w-px bg-[#1F2937]" />
                        )}
                        <div className="space-y-4">
                            {history.map((h, idx) => {
                                const date = new Date(h.launched_at);
                                let stopsCount = 0;
                                try { stopsCount = JSON.parse(h.stops_json || '[]').length; } catch { stopsCount = 0; }

                                return (
                                    <div key={h.id} className="flex gap-4 animate-fade-up items-stretch" style={{ animationDelay: `${idx * 40}ms` }}>
                                        {/* Timeline dot */}
                                        <div className="relative z-10 w-4 h-4 rounded-full bg-[#111827] border-[4px] border-[#F59E0B] shrink-0 mt-5" />

                                        {/* Card */}
                                        <div className="bg-[#111827] border-[1px] border-[#1F2937] border-l-[3px] border-l-[#F59E0B] rounded-xl p-4 flex-1 flex justify-between items-start gap-2 relative group">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-[16px] font-semibold text-white truncate max-w-[200px]">{h.trip_name || 'Unnamed Trip'}</h3>
                                                </div>
                                                <div className="flex items-center gap-2 text-[13px] text-[#6B7280] mt-0.5">
                                                    <span>{stopsCount} stops</span>
                                                    <span>•</span>
                                                    <span>
                                                        {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                                                        {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    setDeletingId(h.id);
                                                    await removeHistoryItem(h.id);
                                                    setDeletingId(null);
                                                    useToastStore.getState().showToast('History item deleted', 'success');
                                                }}
                                                disabled={deletingId === h.id}
                                                className="w-8 h-8 rounded-full bg-surface border border-border-hl flex items-center justify-center text-text-muted hover:text-danger hover:border-danger/50 hover:bg-danger/10 transition-colors shrink-0 disabled:opacity-50"
                                                title="Delete"
                                            >
                                                {deletingId === h.id ? (
                                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                ) : (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
