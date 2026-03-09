/**
 * Chat Store — Zustand store for agent chat messages
 * and conversation history.
 *
 * Manages the chat UI state, sends messages through the
 * LangChain agent endpoint, and tracks pending stops for
 * confirmation.
 */
import { create } from 'zustand';
import { sendAgentMessage, queryRAG } from '../api/client';

// Generate a stable session ID per browser session
const SESSION_ID = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36);

const useChatStore = create((set, get) => ({
    // ── State ──────────────────────────────────
    messages: [],                // UI message objects: { id, role, content, timestamp }
    conversationHistory: [],     // LangChain format: [{ role, content }]
    pendingStops: null,          // Stops returned by agent awaiting driver confirmation
    pendingTripId: null,         // Trip ID if agent found an existing trip
    lastRoute: null,             // { messageId, stops } - Persists for the Preview Route button
    needsConfirmation: false,    // Whether agent is waiting for "yes / no"
    loading: false,
    error: null,

    // ── Helpers ────────────────────────────────
    _addMessage: (role, content, routeStops = null, distanceText = null, durationText = null) => {
        const msg = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            role,
            content,
            timestamp: new Date().toISOString(),
            routeStops,
            distanceText,
            durationText,
        };
        set((state) => ({
            messages: [...state.messages, msg],
            conversationHistory: [
                ...state.conversationHistory,
                { role, content },
            ],
        }));
        return msg;
    },

    clearError: () => set({ error: null }),

    // ── Actions ────────────────────────────────

    /**
     * Send a message to the LangChain agent.
     * Handles the full async flow: add user bubble → call API →
     * add assistant bubble → track pending stops.
     */
    sendMessage: async (text) => {
        if (!text.trim()) return;

        const { _addMessage, conversationHistory } = get();
        _addMessage('user', text);

        set({ loading: true, error: null });

        try {
            const response = await sendAgentMessage(text, conversationHistory, SESSION_ID);

            let finalReply = response.reply;
            if (finalReply && finalReply.includes("Agent stopped due to iteration limit")) {
                if (response.stops && response.stops.length > 0) {
                    finalReply = "Here are your stops! Tap Preview Route to check them.";
                } else {
                    finalReply = "I had trouble planning that route, please try again.";
                }
            }

            // Parse message text for numbered stop lists (e.g. "1. Label - Address")
            const lines = finalReply.split('\n');
            const parsedStops = [];

            lines.forEach((line) => {
                const match = line.match(/^\s*\d+\.\s+(.+)$/);
                if (match) {
                    const text = match[1];
                    // Look for the last ' - ' to avoid splitting on negative coordinate signs like -73.0
                    const dashIdx = text.lastIndexOf(' - ');
                    let label = text.trim();
                    let resolved = text.trim();
                    if (dashIdx !== -1) {
                        label = text.substring(0, dashIdx).trim();
                        resolved = text.substring(dashIdx + 3).trim();
                    }

                    // Strip optional (lat, lng) from the frontend display label if present
                    label = label.replace(/\s*\(-?\d+\.?\d*,\s*-?\d+\.?\d*\)\s*/g, ' ').trim();

                    parsedStops.push({ label, resolved });
                }
            });

            let messageStops = null;

            if (response.stops && response.stops.length >= 2) {
                // Backend returned a full set of stops with real coordinates — use them directly.
                // If parsedStops has matching count, use frontend display labels for cleaner UX.
                if (parsedStops.length === response.stops.length) {
                    messageStops = response.stops.map((bs, idx) => ({
                        ...bs,
                        label: parsedStops[idx]?.label || bs.label,
                        resolved: parsedStops[idx]?.resolved || bs.resolved,
                    }));
                } else {
                    messageStops = response.stops;
                }
            } else if (response.stops && response.stops.length > 0 && get().lastRoute?.stops?.length > 0) {
                // Partial update — agent only geocoded the corrected stop(s).
                // Merge by position: new geocoded stops override their position in lastRoute.
                // This prevents NYC default coordinates from appearing for unchanged stops.
                const lastStops = get().lastRoute.stops;
                const newStops = response.stops;

                // Build a position map of newly geocoded stops
                const newByPosition = {};
                newStops.forEach(s => { newByPosition[s.position] = s; });

                // Also try to match by label if position mapping fails
                messageStops = lastStops.map((old, idx) => {
                    if (newByPosition[idx]) {
                        // Use the freshly geocoded stop for this position
                        return {
                            ...newByPosition[idx],
                            label: parsedStops[idx]?.label || newByPosition[idx].label,
                            position: idx,
                        };
                    }
                    // Keep the existing stop with its real coordinates intact
                    return { ...old, position: idx };
                });

                // Append any new stops that go beyond the original route length
                newStops.forEach(s => {
                    if (s.position >= lastStops.length) {
                        messageStops.push(s);
                    }
                });
            } else if (parsedStops.length >= 2) {
                // Last resort: parse from text only — no coordinate data available at all.
                // Use lastRoute stops as coordinate source via fuzzy match.
                const allKnownStops = [...(get().lastRoute?.stops || [])];
                const normalize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

                messageStops = parsedStops.map((ps, idx) => {
                    const pNorm = normalize(ps.label);
                    const pResNorm = normalize(ps.resolved);
                    const known = allKnownStops.find(ks => {
                        const kNorm = normalize(ks.label);
                        const kResNorm = normalize(ks.resolved);
                        return (kNorm && pNorm && (kNorm.includes(pNorm) || pNorm.includes(kNorm))) ||
                            (kResNorm && pResNorm && (kResNorm.includes(pResNorm) || pResNorm.includes(kResNorm)));
                    });
                    return {
                        label: ps.label,
                        resolved: ps.resolved,
                        lat: known?.lat ?? null,
                        lng: known?.lng ?? null,
                        note: null,
                        position: idx,
                    };
                }).filter(s => s.lat !== null); // Drop stops with no coordinates entirely
            }

            const asstMsg = _addMessage('assistant', finalReply, messageStops, response.total_distance_text, response.total_duration_text);

            // Track stops for confirmation flow
            set({
                loading: false,
                pendingStops: messageStops,
                pendingTripId: response.trip_id || null,
                needsConfirmation: response.needs_confirmation || false,
                lastRoute: messageStops?.length > 0 ? { messageId: asstMsg.id, stops: messageStops } : get().lastRoute,
            });
        } catch (err) {
            set({
                loading: false,
                error: err?.response?.data?.detail || 'Something went wrong. Please try again.',
            });
        }
    },

    /**
     * Ask a RAG question about trip history.
     * Uses the separate /rag/query endpoint.
     */
    askRAGQuestion: async (question) => {
        if (!question.trim()) return null;

        const { _addMessage } = get();
        _addMessage('user', question);

        set({ loading: true, error: null });

        try {
            const response = await queryRAG(question);
            const answerText = response.sources_used
                ? `${response.answer}\n\n📚 Based on ${response.sources_used} source(s).`
                : response.answer;

            _addMessage('assistant', answerText);
            set({ loading: false });
            return response;
        } catch (err) {
            set({
                loading: false,
                error: err?.response?.data?.detail || 'Something went wrong. Please try again.',
            });
            return null;
        }
    },

    /** Clear pending stops (after user confirms or dismisses). */
    clearPendingStops: () =>
        set({ pendingStops: null, pendingTripId: null, needsConfirmation: false }),

    /** Reset entire chat (new conversation). */
    resetChat: () =>
        set({
            messages: [],
            conversationHistory: [],
            pendingStops: null,
            pendingTripId: null,
            lastRoute: null,
            needsConfirmation: false,
            loading: false,
            error: null,
        }),
}));

export default useChatStore;
