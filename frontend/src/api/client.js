/**
 * API Client — Centralized axios instance for all backend calls.
 * All API calls in the app go through this module — never use
 * fetch() or axios directly in components.
 */
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 120000, // 120 s — agent calls can take a while with key rotation retries
    headers: {
        'Content-Type': 'application/json',
    },
});

// ─────────────────────────────────────────────
// Agent
// ─────────────────────────────────────────────

/**
 * Send a message to the LangChain ReAct agent.
 * @param {string} message  — driver's natural language input
 * @param {Array}  conversationHistory — [{role, content}, ...]
 * @param {string} sessionId — unique session identifier
 * @returns {Promise<Object>} — { reply, stops, trip_found, trip_id, needs_confirmation, agent_steps }
 */
export const sendAgentMessage = async (message, conversationHistory = [], sessionId = '') => {
    const { data } = await api.post('/agent/chat', {
        message,
        conversation_history: conversationHistory,
        session_id: sessionId,
    });
    return data;
};

// ─────────────────────────────────────────────
// RAG — History Q&A
// ─────────────────────────────────────────────

/**
 * Ask a natural language question about trip history (RAG pipeline).
 * @param {string} question
 * @returns {Promise<Object>} — { answer, sources_used }
 */
export const queryRAG = async (question) => {
    const { data } = await api.post('/rag/query', { question });
    return data;
};

// ─────────────────────────────────────────────
// Trips CRUD
// ─────────────────────────────────────────────

/** List all saved trips. */
export const getTrips = async () => {
    const { data } = await api.get('/trips');
    return data;
};

/** Get a single trip with all stops. */
export const getTripById = async (tripId) => {
    const { data } = await api.get(`/trips/${tripId}`);
    return data;
};

/** Save a new trip (writes to SQLite + ChromaDB). */
export const createTrip = async (tripData) => {
    const { data } = await api.post('/trips', tripData);
    return data;
};

/** Update trip name / notes / stops. */
export const updateTrip = async (tripId, tripData) => {
    const { data } = await api.put(`/trips/${tripId}`, tripData);
    return data;
};

/** Delete a trip (removes from SQLite + ChromaDB). */
export const deleteTrip = async (tripId) => {
    const { data } = await api.delete(`/trips/${tripId}`);
    return data;
};

/** Record a trip launch — update stats, add to history + ChromaDB. */
export const launchTrip = async (tripId) => {
    const { data } = await api.post(`/trips/${tripId}/launch`);
    return data;
};

// ─────────────────────────────────────────────
// Semantic Search
// ─────────────────────────────────────────────

/**
 * Semantic search trips by query string.
 * @param {string} query — e.g. "school run"
 * @returns {Promise<Object>} — { results: [{ id, name, stop_count, similarity }] }
 */
export const searchTrips = async (query) => {
    const { data } = await api.get('/trips/search', { params: { q: query } });
    return data;
};

// ─────────────────────────────────────────────
// History
// ─────────────────────────────────────────────

/** Get recent trip launch history. */
export const getHistory = async () => {
    const { data } = await api.get('/history');
    return data;
};

// ─────────────────────────────────────────────
// Admin / LLMOps
// ─────────────────────────────────────────────

/** Get LLM call logs (token usage, latency, errors). */
export const getLLMLogs = async () => {
    const { data } = await api.get('/admin/llm-logs');
    return data;
};

// ─────────────────────────────────────────────
// Voice
// ─────────────────────────────────────────────

/**
 * Transcribe recorded audio blob using Groq Whisper.
 * @param {Blob} audioBlob
 * @returns {Promise<Object>} — { text: "transcription" }
 */
export const transcribeVoice = async (audioBlob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.mp4');

    const { data } = await api.post('/voice/transcribe', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return data;
};

export default api;
