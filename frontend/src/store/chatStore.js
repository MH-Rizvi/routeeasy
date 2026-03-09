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
            const currentRoute = get().lastRoute?.stops || [];
            const response = await sendAgentMessage(text, conversationHistory, currentRoute, SESSION_ID);

            let finalReply = response.reply;
            if (finalReply && finalReply.includes("Agent stopped due to iteration limit")) {
                if (response.stops && response.stops.length > 0) {
                    finalReply = "Here are your stops! Tap Preview Route to check them.";
                } else {
                    finalReply = "I had trouble planning that route, please try again.";
                }
            }

            let messageStops = null;

            if (response.needs_confirmation) {
                // Do NOT generate a route card. The UI should only show the confirmation question.
                messageStops = null;
            } else if (response.stops && response.stops.length >= 2) {
                // The backend now deterministically manages and returns the full route array.
                messageStops = response.stops;
            }

            let finalDistanceText = response.total_distance_text;
            let finalDurationText = response.total_duration_text;

            // If backend returned partial stops (correction turn), recalculate stats
            // using the fully merged stops array which has all real coordinates.
            if (messageStops && messageStops.length >= 2 && (!finalDistanceText || !finalDurationText || finalDistanceText === 'N/A' || finalDurationText === 'N/A')) {
                try {
                    const statsResponse = await import('../api/client').then(m => m.calculateRouteStats(messageStops));
                    if (statsResponse?.distance && statsResponse.distance !== 'N/A') {
                        finalDistanceText = statsResponse.distance;
                        finalDurationText = statsResponse.duration;
                    }
                } catch (e) {
                    console.warn('Could not recalculate route stats:', e);
                }
            }

            const asstMsg = _addMessage('assistant', finalReply, messageStops, finalDistanceText, finalDurationText);

            // Track stops for confirmation flow
            set({
                loading: false,
                pendingStops: response.needs_confirmation ? (response.stops?.length > 0 ? response.stops : (get().pendingStops || [])) : [],
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
