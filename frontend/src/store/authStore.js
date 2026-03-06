import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import { getMe } from '../api/client';

const useAuthStore = create((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isHydrating: true,

    setUser: (user, token) => set({ user, token, isAuthenticated: !!user }),
    clearUser: () => set({ user: null, token: null, isAuthenticated: false }),

    hydrate: async () => {
        try {
            // Start the token/session lifecycle listener
            supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_OUT' || !session) {
                    set({ user: null, token: null, isAuthenticated: false, isHydrating: false });
                } else if (session) {
                    set((state) => ({ ...state, token: session.access_token, isAuthenticated: true }));
                }
            });

            // Step 1: Ask Supabase JS if it has a stored session
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                // No Supabase session → user is not logged in
                set({ user: null, token: null, isAuthenticated: false, isHydrating: false });
                return;
            }

            // Step 2: Fetch our backend profile
            const userData = await getMe();
            set({ user: userData, token: session.access_token, isAuthenticated: true, isHydrating: false });

            // Redirect users with incomplete profiles to setup
            if (userData?.is_new_user) {
                const path = window.location.pathname;
                if (path !== '/complete-profile' && path !== '/auth/callback') {
                    window.location.href = '/complete-profile';
                }
            }
        } catch (error) {
            console.error('[AuthStore] Hydration failed:', error);
            // Don't hard redirect here natively. Let interceptors catch true 401s.
            set({ user: null, isAuthenticated: false, isHydrating: false });
        }
    }
}));

export default useAuthStore;
