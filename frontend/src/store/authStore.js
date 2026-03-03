import { create } from 'zustand';
import { getMe } from '../api/client';

const useAuthStore = create((set) => ({
    user: null,
    isAuthenticated: false,
    isHydrating: true,

    // Auth actions
    setUser: (user) => set({ user, isAuthenticated: !!user }),

    clearUser: () => set({ user: null, isAuthenticated: false }),

    /**
     * Check if the user is authenticated on app mount.
     * Note: Since tokens are strictly in-memory (module-level), a hard page
     * refresh will clear them. This try-block will only succeed if the token 
     * is already in the api client memory or if a cookie-based refresh exists.
     */
    hydrate: async () => {
        try {
            const userData = await getMe();
            set({ user: userData, isAuthenticated: true, isHydrating: false });
        } catch (error) {
            console.error('Auth hydration failed. User needs to login.');
            set({ user: null, isAuthenticated: false, isHydrating: false });
        }
    }
}));

export default useAuthStore;
