/**
 * API Client — Centralized axios instance for all backend calls.
 * All API calls in the app go through this module — never use
 * fetch() or axios directly in components.
 * 
 * TOKEN MANAGEMENT:
 * Supabase JS is the source of truth for tokens.
 * This module fetches them dynamically from Supabase on every request.
 */
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 120000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
    },
});

// Request Interceptor: Attach Bearer token from Supabase
api.interceptors.request.use(async (config) => {
    try {
        const { supabase } = await import('../supabaseClient');
        let { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const retrySession = await supabase.auth.getSession();
            session = retrySession.data.session;
        }

        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
        }
    } catch (e) {
        console.error('Error fetching session:', e);
    }
    return config;
});

let isRefreshing = false;

// Response Interceptor: On 401, ask Supabase JS for a fresh session
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            // Never retry login requests
            if (originalRequest.url.includes('/auth/login')) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Dynamically import supabase to avoid circular dependency
                const { supabase } = await import('../supabaseClient');
                // getSession automatically repopulates/refreshes tokens inside the Supabase client
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (session && !sessionError) {
                    originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
                    isRefreshing = false;
                    return api(originalRequest);
                } else {
                    // No valid session at all — user truly needs to log in
                    isRefreshing = false;
                    const path = window.location.pathname;
                    if (path !== '/login' && path !== '/' && path !== '/auth/callback') {
                        window.location.href = '/login';
                    }
                    return Promise.reject(error);
                }
            } catch (refreshError) {
                isRefreshing = false;
                const path = window.location.pathname;
                if (path !== '/login' && path !== '/' && path !== '/auth/callback') {
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

export const sendAgentMessage = async (message, conversationHistory = [], sessionId = '') => {
    const { data } = await api.post('/agent/chat', {
        message,
        conversation_history: conversationHistory,
        session_id: sessionId,
    });
    return data;
};

export const sendDemoMessage = async (message, conversationHistory = []) => {
    const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/agent/demo-chat`, {
        message,
        conversation_history: conversationHistory,
    });
    return data;
};

// ─────────────────────────────────────────────
// RAG — History Q&A
// ─────────────────────────────────────────────

export const queryRAG = async (question) => {
    const { data } = await api.post('/rag/query', { question });
    return data;
};

// ─────────────────────────────────────────────
// Trips CRUD
// ─────────────────────────────────────────────

export const getTrips = async () => {
    const { data } = await api.get('/trips');
    return data;
};

export const getTripById = async (tripId) => {
    const { data } = await api.get(`/trips/${tripId}`);
    return data;
};

export const createTrip = async (tripData) => {
    const { data } = await api.post('/trips', tripData);
    return data;
};

export const updateTrip = async (tripId, tripData) => {
    const { data } = await api.put(`/trips/${tripId}`, tripData);
    return data;
};

export const deleteTrip = async (tripId) => {
    const { data } = await api.delete(`/trips/${tripId}`);
    return data;
};

export const launchTrip = async (tripId) => {
    const { data } = await api.post(`/trips/${tripId}/launch`);
    return data;
};

// ─────────────────────────────────────────────
// Semantic Search
// ─────────────────────────────────────────────

export const searchTrips = async (query) => {
    const { data } = await api.get('/trips/search', { params: { q: query } });
    return data;
};

// ─────────────────────────────────────────────
// History
// ─────────────────────────────────────────────

export const getHistory = async () => {
    const { data } = await api.get('/history');
    return data;
};

export const deleteHistoryItem = async (historyId) => {
    const { data } = await api.delete(`/history/${historyId}`);
    return data;
};

export const clearAllHistory = async () => {
    const { data } = await api.delete('/history');
    return data;
};

// ─────────────────────────────────────────────
// Admin / LLMOps
// ─────────────────────────────────────────────

export const getLLMLogs = async () => {
    const { data } = await api.get('/admin/llm-logs');
    return data;
};

// ─────────────────────────────────────────────
// Voice
// ─────────────────────────────────────────────

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

    if (data.access_token && data.refresh_token) {
        const { supabase } = await import('../supabaseClient');
        await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token
        });
    }

    return data;
};

/** Get Google OAuth URL (legacy — kept for compatibility) */
export const loginWithGoogle = async () => {
    const { data } = await api.post('/auth/google', {});
    return data;
};

/** Signup new user */
export const signup = async (first_name, last_name, birthday, email, password, city, state, zip_code) => {
    const { data } = await api.post('/auth/signup', { first_name, last_name, birthday, email, password, city, state, zip_code });

    if (data.access_token) {
        const { supabase } = await import('../supabaseClient');
        await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token || data.access_token
        });
    }

    return data;
};

export const updateProfile = async (profileData) => {
    const { data } = await api.patch('/auth/me', profileData);
    return data;
};

export const changePassword = async (current_password, new_password) => {
    const { data } = await api.post('/auth/change-password', { current_password, new_password });
    return data;
};

export const deleteAccount = async () => {
    const { data } = await api.delete('/auth/account');
    return data;
};

/** Logout user */
export const logout = async () => {
    try {
        // Sign out from Supabase JS (clears persisted session)
        const { supabase } = await import('../supabaseClient');
        await supabase.auth.signOut();
    } catch (e) {
        console.error('Supabase signOut failed:', e);
    }
    try {
        await api.post('/auth/logout');
    } catch (e) {
        console.error('Backend logout failed:', e);
    }
    window.location.href = '/login';
};

/** Get the currently logged-in user profile */
export const getMe = async () => {
    const { data } = await api.get('/auth/me');
    return data;
};

export const checkEmail = async (email) => {
    const { data } = await api.post('/auth/check-email', { email });
    return data.exists;
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

// ─────────────────────────────────────────────
// Places Autocomplete
// ─────────────────────────────────────────────

export const autocompleteCities = async (input, state = '') => {
    const { data } = await api.get('/places/autocomplete', { params: { input, state } });
    return data.predictions || [];
};

export default api;
