/**
 * Trip Store — Zustand store for trips state.
 *
 * Manages: trips list, current trip, loading flags, error messages,
 * semantic search results, and trip history.
 */
import { create } from 'zustand';
import {
    getTrips,
    getTripById,
    createTrip,
    updateTrip,
    deleteTrip,
    launchTrip,
    searchTrips,
    getHistory,
} from '../api/client';

const useTripStore = create((set, get) => ({
    // ── State ──────────────────────────────────
    trips: [],
    currentTrip: null,
    history: [],
    searchResults: [],
    loading: false,
    error: null,

    // ── Helpers ────────────────────────────────
    _startLoading: () => set({ loading: true, error: null }),
    _setError: (err) =>
        set({
            loading: false,
            error: err?.response?.data?.detail || 'Something went wrong. Please try again.',
        }),
    clearError: () => set({ error: null }),

    // ── Actions ────────────────────────────────

    /** Fetch all saved trips. */
    fetchTrips: async () => {
        get()._startLoading();
        try {
            const data = await getTrips();
            set({ trips: data, loading: false });
        } catch (err) {
            get()._setError(err);
        }
    },

    /** Fetch a single trip by ID (sets currentTrip). */
    fetchTrip: async (tripId) => {
        get()._startLoading();
        try {
            const data = await getTripById(tripId);
            set({ currentTrip: data, loading: false });
        } catch (err) {
            get()._setError(err);
        }
    },

    /** Save a new trip and refresh the list. */
    saveTrip: async (tripData) => {
        get()._startLoading();
        try {
            const saved = await createTrip(tripData);
            set((state) => ({
                trips: [saved, ...state.trips],
                currentTrip: saved,
                loading: false,
            }));
            return saved;
        } catch (err) {
            get()._setError(err);
            return null;
        }
    },

    /** Update an existing trip. */
    editTrip: async (tripId, tripData) => {
        get()._startLoading();
        try {
            const updated = await updateTrip(tripId, tripData);
            set((state) => ({
                trips: state.trips.map((t) => (t.id === tripId ? updated : t)),
                currentTrip: updated,
                loading: false,
            }));
            return updated;
        } catch (err) {
            get()._setError(err);
            return null;
        }
    },

    /** Delete a trip and remove it from local state. */
    removeTrip: async (tripId) => {
        get()._startLoading();
        try {
            await deleteTrip(tripId);
            set((state) => ({
                trips: state.trips.filter((t) => t.id !== tripId),
                currentTrip: state.currentTrip?.id === tripId ? null : state.currentTrip,
                loading: false,
            }));
        } catch (err) {
            get()._setError(err);
        }
    },

    /** Launch a trip — records in history and opens navigation. */
    launchCurrentTrip: async (tripId) => {
        get()._startLoading();
        try {
            const result = await launchTrip(tripId);
            set({ loading: false });
            return result;
        } catch (err) {
            get()._setError(err);
            return null;
        }
    },

    /** Semantic search trips. */
    searchTrips: async (query) => {
        if (!query || !query.trim()) {
            set({ searchResults: [] });
            return;
        }
        get()._startLoading();
        try {
            const data = await searchTrips(query);
            set({ searchResults: data.results || [], loading: false });
        } catch (err) {
            get()._setError(err);
        }
    },

    /** Fetch recent launch history. */
    fetchHistory: async () => {
        get()._startLoading();
        try {
            const data = await getHistory();
            // API returns { items: [...] } — extract the array
            const items = Array.isArray(data) ? data : (data?.items || []);
            set({ history: items, loading: false });
        } catch (err) {
            get()._setError(err);
        }
    },

    /** Clear current trip selection. */
    clearCurrentTrip: () => set({ currentTrip: null }),

    /** Reset the store entirely. */
    reset: () =>
        set({
            trips: [],
            currentTrip: null,
            history: [],
            searchResults: [],
            loading: false,
            error: null,
        }),
}));

export default useTripStore;
