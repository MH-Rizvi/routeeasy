/**
 * API Client — Centralized axios instance for all backend calls.
 * All API calls in the app go through this module — never use
 * fetch() or axios directly in components.
 */
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 120000, // 120 s — agent calls can take a while with key rotation retries
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
    },
});

let _accessToken = null;

export const setTokens = (access) => {
    if (access) _accessToken = access;
};

export const clearTokens = () => {
    _accessToken = null;
};

// Request Interceptor: Attach Bearer token to all requests if present
api.interceptors.request.use((config) => {
    if (_accessToken) {
        config.headers.Authorization = `Bearer ${_accessToken}`;
    }
    return config;
});

let isRefreshing = false;

// Response Interceptor: Handle 401s by attempting to refresh the token automatically
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only attempt refresh if it's a 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {

            // If the failed request was a login, just reject
            if (originalRequest.url.includes('/auth/login')) {
                return Promise.reject(error);
            }

            // If the failed request WAS the refresh endpoint itself, we are completely logged out
            if (originalRequest.url.includes('/auth/refresh')) {
                clearTokens();
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }

            // If a refresh is already in flight, reject the other concurrent requests 
            // to avoid spamming the refresh endpoint. (Can be improved with a queue later)
            if (isRefreshing) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Call refresh endpoint directly with axios to avoid interceptor loop
                // Cookie will automatically be included due to withCredentials
                const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh`, {}, {
                    withCredentials: true
                });

                // Update in-memory token and retry the failed request
                _accessToken = data.access_token;
                originalRequest.headers.Authorization = `Bearer ${_accessToken}`;
                isRefreshing = false;
                return api(originalRequest);
            } catch (refreshError) {
                // If refresh fails, clear tokens and aggressively redirect to login
                isRefreshing = false;
                clearTokens();
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);
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

/** Delete a single history entry */
export const deleteHistoryItem = async (historyId) => {
    const { data } = await api.delete(`/history/${historyId}`);
    return data;
};

/** Clear all history entries */
export const clearAllHistory = async () => {
    const { data } = await api.delete('/history');
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

// ─────────────────────────────────────────────
// Authentication
// ─────────────────────────────────────────────

/** Login with email and password */
export const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setTokens(data.access_token);
    return data;
};

/** Signup new user */
export const signup = async (email, password, city, state, zip_code) => {
    const { data } = await api.post('/auth/signup', { email, password, city, state, zip_code });
    setTokens(data.access_token);
    return data;
};

/** Logout user */
export const logout = async () => {
    try {
        await api.post('/auth/logout');
    } catch (e) {
        console.error('Logout failed:', e);
    }
    clearTokens();
    window.location.href = '/login';
};

/** Get the currently logged-in user profile */
export const getMe = async () => {
    const { data } = await api.get('/auth/me');
    return data;
};

// ─────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────

export const getStatsSummary = async () => {
    const { data } = await api.get('/stats/summary');
    return data;
};

export const getStatsDaily = async (days = 30) => {
    const { data } = await api.get(`/stats/daily?days=${days}`);
    return data;
};

export default api;
