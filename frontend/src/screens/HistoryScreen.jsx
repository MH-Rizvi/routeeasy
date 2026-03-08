/**
 * HistoryScreen.jsx — Dark enterprise history with amber timeline.
 */
import { useEffect, useState } from 'react';
import useTripStore from '../store/tripStore';
import { queryRAG } from '../api/client';
import useToastStore from '../store/toastStore';
import Header from '../components/Header';

const RAG_EXAMPLES = ['What route did I do last Friday?', 'Have I been to Oak Avenue?', 'How many stops does my morning run have?', 'What was my most recent trip?'];

function formatRagText(text) {
    if (!text) return '';
    return text.replace(/\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)?/g, (match) => {
        try {
            // If it's just a date without time, append T12:00:00 to avoid timezone shift pushing it back a day
            const dateStr = match.includes('T') ? match : `${match}T12:00:00`;
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) {
            return match;
        }
    });
}

export default function HistoryScreen() {
    const { history, loading: histLoading, fetchHistory, removeHistoryOptimistic, undoRemoveHistory, commitRemoveHistory, clearAllHistoryOptimistic, undoClearAllHistory, commitClearAllHistory } = useTripStore();
    const [ragQuestion, setRagQuestion] = useState('');
    const [ragAnswer, setRagAnswer] = useState(null);
    const [ragError, setRagError] = useState(null);
    const [ragLoading, setRagLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    const handleAskRAG = async (questionToAsk) => {
        const q = typeof questionToAsk === 'string' ? questionToAsk : ragQuestion.trim();
        if (!q) return;

        if (typeof questionToAsk === 'string') {
            setRagQuestion(questionToAsk);
        }

        setRagError(null); setRagAnswer(null); setRagLoading(true);
        try {
            const result = await queryRAG(q);
            if (result) setRagAnswer(result);
            else setRagError('Could not get an answer.');
        } catch { setRagError('Something went wrong.'); }
        finally { setRagLoading(false); }
    };

    return (
        <div className="min-h-full h-full pb-4 animate-page-enter relative bg-[#0A0F1E]">
            {/* Ambient Multi-layered Background */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.05)_0%,transparent_80%)] z-0" />
            <div className="absolute inset-0 pointer-events-none noise-bg mix-blend-overlay opacity-20 z-0" />

            <div className="relative z-10 flex flex-col h-full">
                <Header
                    rightElement={
                        <span className="text-[#F59E0B] text-[12px] font-bold tracking-widest uppercase hidden sm:inline drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">History</span>
                    }
                />

                <div className="px-5 lg:px-12 mt-6 pb-24 lg:pb-12 max-w-[1400px] mx-auto w-full flex flex-col gap-6 lg:gap-8">

                    {/* RAG Panel */}
                    <section className="animate-fade-up w-full flex flex-col items-center">
                        <div className="flex flex-col items-center mb-6 text-center">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(20,26,45,0.6) 100%)', border: '1px solid rgba(245,158,11,0.2)', backdropFilter: 'blur(12px)', boxShadow: '0 0 20px rgba(245,158,11,0.1)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" className="drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            </div>
                            <h2 className="text-[26px] font-bold text-white tracking-tight">Ask About Your History</h2>
                            <p className="text-white/40 text-[15px] mt-1.5 max-w-sm">Search through your past routes using natural language.</p>
                        </div>

                        <div className="flex w-full gap-3 mb-6">
                            <input
                                type="text" value={ragQuestion}
                                onChange={(e) => setRagQuestion(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAskRAG()}
                                placeholder="e.g. What route did I drive last Friday?"
                                className="flex-1 rounded-2xl px-5 py-4 text-[16px] text-white placeholder:text-white/30 disabled:opacity-50 transition-all focus:translate-y-[-2px] focus:shadow-[0_0_20px_rgba(245,158,11,0.2)] focus:border-[#F59E0B] outline-none"
                                style={{ background: 'rgba(20,26,45,0.6)', border: '1px solid rgba(245,158,11,0.25)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}
                                disabled={ragLoading}
                            />
                            <button onClick={() => handleAskRAG()} disabled={ragLoading || !ragQuestion.trim()} className="rounded-2xl px-7 font-bold text-[16px] text-[#0A0F1E] disabled:opacity-30 transition-all hover:scale-105 active:scale-[0.98] outline-none" style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', boxShadow: '0 4px 15px rgba(245,158,11,0.3)', border: 'none' }}>
                                {ragLoading ? '• • •' : 'Ask'}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full mb-6">
                            {RAG_EXAMPLES.map((q) => (
                                <button
                                    key={q}
                                    onClick={() => { setRagQuestion(q); handleAskRAG(q); }}
                                    disabled={ragLoading}
                                    className="rounded-full px-5 py-2.5 text-white/70 hover:text-white hover:text-amber-400 text-[13px] font-medium text-center disabled:opacity-50 transition-all hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(245,158,11,0.15)] active:scale-[0.98] group relative overflow-hidden outline-none"
                                    style={{ background: 'rgba(20,26,45,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(245,158,11,0.15)' }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-[rgba(245,158,11,0.1)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="relative z-10 transition-shadow group-hover:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{q}</span>
                                </button>
                            ))}
                        </div>

                        {ragAnswer && (
                            <div className="glow-card p-4 animate-fade-up" style={{ borderLeft: '3px solid #F59E0B' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-accent text-sm font-bold">AI Answer</span>
                                    <span className="text-xs text-text-muted">• Based on your history</span>
                                </div>
                                <div className="max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    <p className="text-base text-text-primary whitespace-pre-wrap">
                                        {formatRagText(typeof ragAnswer === 'string' ? ragAnswer : ragAnswer.answer || JSON.stringify(ragAnswer))}
                                    </p>
                                </div>
                                {ragAnswer.sources_used > 0 && (
                                    <p className="text-xs text-text-muted mt-2 font-mono">{ragAnswer.sources_used} source{ragAnswer.sources_used !== 1 ? 's' : ''}</p>
                                )}
                            </div>
                        )}
                        {ragError && <div className="card p-3 border-danger/30 animate-fade-up"><p className="text-danger text-sm">⚠ {ragError}</p></div>}
                    </section>

                    {/* ── Right column (or below on mobile): Timeline ── */}

                    {/* Timeline */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Recent Launches</h2>
                            {history.length > 0 && (
                                <button onClick={async () => {
                                    if (window.confirm("Are you sure you want to delete all history?")) {
                                        const deletedAll = clearAllHistoryOptimistic();
                                        let isUndoing = false;
                                        useToastStore.getState().showToast('All history cleared.', 'success', {
                                            label: 'Undo',
                                            onClick: () => {
                                                isUndoing = true;
                                                undoClearAllHistory(deletedAll);
                                            }
                                        }, 5000);
                                        setTimeout(() => {
                                            if (!isUndoing) commitClearAllHistory();
                                        }, 5000);
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
                            <div className="text-center py-10 flex flex-col items-center justify-center animate-fade-up rounded-3xl mt-2 relative overflow-hidden" style={{ background: 'rgba(20,26,45,0.4)', backdropFilter: 'blur(12px)', border: '1px dashed rgba(245,158,11,0.15)' }}>
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.03)_0%,transparent_60%)] pointer-events-none" />
                                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 relative group">
                                    <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-lg group-hover:bg-amber-500/30 transition-colors duration-500" />
                                    <div className="relative z-10 w-full h-full rounded-full flex flex-col items-center justify-center transition-transform group-hover:scale-105 duration-300" style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(13,17,23,0.8))', backdropFilter: 'blur(8px)', border: '1px solid rgba(245,158,11,0.3)', boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.4)' }}>
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                    </div>
                                </div>
                                <h3 className="text-[20px] font-bold text-white mb-2 tracking-tight relative z-10">No trips yet</h3>
                                <p className="text-[14px] text-white/40 max-w-[260px] leading-relaxed relative z-10">Your completed routes and past launches will appear here.</p>
                            </div>
                        )}

                        {/* Timeline layout */}
                        <div className="relative">
                            {history.length > 0 && (
                                <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gradient-to-b from-[#F59E0B]/30 via-[#1F2937] to-[#F59E0B]/30" />
                            )}
                            <div className="space-y-4">
                                {history.map((h, idx) => {
                                    const date = new Date(h.launched_at);
                                    let stopsCount = 0;
                                    try { stopsCount = JSON.parse(h.stops_json || '[]').length; } catch { stopsCount = 0; }

                                    return (
                                        <div key={h.id} className="flex gap-4 animate-fade-up items-stretch" style={{ animationDelay: `${idx * 40}ms` }}>
                                            {/* Timeline dot */}
                                            <div className="relative z-10 w-4 h-4 rounded-full shrink-0 mt-5" style={{ background: '#0A0F1E', border: '4px solid #F59E0B', boxShadow: '0 0 6px rgba(245,158,11,0.4)' }} />

                                            {/* Card */}
                                            <div className="rounded-xl p-4 flex-1 flex justify-between items-start gap-2 relative group transition-all duration-300 hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)] hover:border-[rgba(245,158,11,0.3)] hover:-translate-y-[1px]" style={{ background: 'rgba(20,26,45,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(245,158,11,0.15)', borderLeft: '3px solid #F59E0B' }}>
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
                                                        const deletedItem = removeHistoryOptimistic(h.id);
                                                        let isUndoing = false;
                                                        useToastStore.getState().showToast('History item deleted', 'success', {
                                                            label: 'Undo',
                                                            onClick: () => {
                                                                isUndoing = true;
                                                                undoRemoveHistory(deletedItem);
                                                            }
                                                        }, 5000);
                                                        setTimeout(() => {
                                                            if (!isUndoing) commitRemoveHistory(h.id);
                                                        }, 5000);
                                                    }}
                                                    disabled={deletingId === h.id}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-danger hover:border-danger/50 hover:bg-danger/10 transition-colors shrink-0 disabled:opacity-50"
                                                    style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}
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
        </div>
    );
}
