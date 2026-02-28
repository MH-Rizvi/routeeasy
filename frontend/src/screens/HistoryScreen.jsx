/**
 * HistoryScreen.jsx — Two sections:
 * 1. Recent launches list (chronological)
 * 2. RAG Q&A panel with example questions and AI Answer card
 */
import { useEffect, useState } from 'react';
import useTripStore from '../store/tripStore';
import { queryRAG } from '../api/client';

const RAG_EXAMPLES = [
    'What route did I do last Friday?',
    'Have I been to Oak Avenue?',
    'How many stops does my morning run have?',
    'What was my most recent trip?',
];

export default function HistoryScreen() {
    const { history, loading: histLoading, fetchHistory } = useTripStore();

    const [ragQuestion, setRagQuestion] = useState('');
    const [ragAnswer, setRagAnswer] = useState(null);
    const [ragError, setRagError] = useState(null);
    const [ragLoading, setRagLoading] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleAskRAG = async (question) => {
        const q = question || ragQuestion.trim();
        if (!q) return;

        setRagError(null);
        setRagAnswer(null);
        setRagLoading(true);

        try {
            const result = await queryRAG(q);
            if (result) {
                setRagAnswer(result);
            } else {
                setRagError('Could not get an answer right now. Please try again.');
            }
        } catch {
            setRagError('Something went wrong. Please try again.');
        } finally {
            setRagLoading(false);
        }
    };

    return (
        <div className="min-h-full px-4 pt-6 pb-4">
            <h1 className="text-2xl font-bold text-body mb-6">History</h1>

            {/* ── RAG Q&A Panel ────────────────────────── */}
            <section className="mb-8">
                <h2 className="text-lg font-semibold text-body mb-3">
                    🤖 Ask About Your History
                </h2>

                {/* Question input */}
                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={ragQuestion}
                        onChange={(e) => setRagQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAskRAG()}
                        placeholder="Ask a question about your trips…"
                        className="flex-1 min-h-touch rounded-xl border border-gray-300 px-4 py-3 text-base text-body bg-card placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={ragLoading}
                    />
                    <button
                        onClick={() => handleAskRAG()}
                        disabled={ragLoading || !ragQuestion.trim()}
                        className="min-w-touch min-h-touch rounded-xl bg-primary text-white font-semibold px-4 disabled:opacity-40 transition-colors"
                    >
                        {ragLoading ? '⏳' : 'Ask'}
                    </button>
                </div>

                {/* Example questions */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {RAG_EXAMPLES.map((q) => (
                        <button
                            key={q}
                            onClick={() => {
                                setRagQuestion(q);
                                handleAskRAG(q);
                            }}
                            disabled={ragLoading}
                            className="min-h-touch px-3 py-2 rounded-full bg-blue-50 text-primary text-sm hover:bg-blue-100 transition-colors disabled:opacity-50"
                        >
                            {q}
                        </button>
                    ))}
                </div>

                {/* AI Answer card */}
                {ragAnswer && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🤖</span>
                            <span className="text-sm font-semibold text-primary">AI Answer</span>
                            <span className="text-xs text-secondary">
                                Based on your history
                            </span>
                        </div>
                        <p className="text-base text-body whitespace-pre-wrap">
                            {typeof ragAnswer === 'string'
                                ? ragAnswer
                                : ragAnswer.answer || JSON.stringify(ragAnswer)}
                        </p>
                        {ragAnswer.sources_used > 0 && (
                            <p className="text-xs text-secondary mt-2">
                                📚 Based on {ragAnswer.sources_used} source{ragAnswer.sources_used !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                )}

                {/* RAG error */}
                {ragError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <p className="text-danger text-sm">⚠️ {ragError}</p>
                    </div>
                )}
            </section>

            {/* ── Recent Launches ──────────────────────── */}
            <section>
                <h2 className="text-lg font-semibold text-body mb-3">📋 Recent Launches</h2>

                {histLoading && history.length === 0 && (
                    <div className="text-center py-8">
                        <span className="text-3xl animate-spin">⏳</span>
                        <p className="text-secondary mt-2">Loading history…</p>
                    </div>
                )}

                {!histLoading && history.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-secondary">No launches recorded yet. Navigate a trip to see it here.</p>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    {history.map((h) => {
                        const date = new Date(h.launched_at);
                        let stopsCount = 0;
                        try {
                            const parsed = JSON.parse(h.stops_json || '[]');
                            stopsCount = parsed.length;
                        } catch {
                            stopsCount = 0;
                        }

                        return (
                            <div
                                key={h.id}
                                className="bg-card border border-gray-100 rounded-xl p-4"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-body truncate">
                                        {h.trip_name || 'Unnamed Trip'}
                                    </h3>
                                    <span className="text-xs text-secondary shrink-0 ml-2">
                                        {date.toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                        })}{' '}
                                        {date.toLocaleTimeString(undefined, {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                                <p className="text-sm text-secondary mt-1">
                                    📍 {stopsCount} stop{stopsCount !== 1 ? 's' : ''}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
