import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import { setTokens, getMe } from '../api/client';

const useAuthStore = create((set) => ({
    user: null,
    isAuthenticated: false,
    isHydrating: true,

    setUser: (user) => set({ user, isAuthenticated: !!user }),
    clearUser: () => set({ user: null, isAuthenticated: false }),

    /**
     * Hydrate auth state on app load.
     * 
     * IMPORTANT: We ask Supabase JS for its persisted session FIRST.
     * If a session exists, we extract the access_token, feed it to
     * the axios client, and THEN call our backend /auth/me.
     * 
     * This replaces the old approach that called getMe() blind and
     * relied on a custom /auth/refresh endpoint that no longer exists.
     */
    hydrate: async () => {
        try {
            // Step 1: Ask Supabase JS if it has a stored session
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                // No Supabase session → user is not logged in
                set({ user: null, isAuthenticated: false, isHydrating: false });
                return;
            }

            // Step 2: Push the Supabase tokens into our axios client
            setTokens(session.access_token, session.refresh_token);

            // Step 3: Fetch our backend profile
            const userData = await getMe();
            set({ user: userData, isAuthenticated: true, isHydrating: false });

            // Redirect users with incomplete profiles to setup
            if (userData.is_new_user) {
                const path = window.location.pathname;
                if (path !== '/complete-profile' && path !== '/auth/callback') {
                    window.location.href = '/complete-profile';
                }
            }
        } catch (error) {
            console.error('[AuthStore] Hydration failed:', error);
            set({ user: null, isAuthenticated: false, isHydrating: false });
        }
    }
}));

export default useAuthStore;
