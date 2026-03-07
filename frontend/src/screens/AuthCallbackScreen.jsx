import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { getMe } from '../api/client';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';

/**
 * AuthCallbackScreen — Handover point for Google OAuth.
 * 
 * Flow:
 * 1. Supabase JS (with detectSessionInUrl: true) processes the URL automatically
 * 2. We listen for SIGNED_IN via onAuthStateChange
 * 3. We also do a direct getSession() check after 1.5s as fallback
 * 4. Once we have a session, we call /auth/me
 * 5. If is_new_user → /complete-profile, else → /home
 * 6. 6 second timeout → /login
 */
export default function AuthCallbackScreen() {
    const navigate = useNavigate();
    const setUser = useAuthStore(state => state.setUser);
    const showToast = useToastStore(state => state.showToast);
    const hasHandled = useRef(false);

    useEffect(() => {
        // console.log('[Callback] Component mounted');
        // console.log('[Callback] URL:', window.location.href);

        const handleSession = async (session) => {
            if (hasHandled.current) return;
            hasHandled.current = true;

            // console.log('[Callback] Processing session. Token length:', session.access_token?.length);

            try {
                // Call backend to get/create user profile
                const userData = await getMe();
                // console.log('[Callback] Backend profile:', userData);

                // Push user into zustand store
                setUser(userData);

                if (userData.is_new_user) {
                    showToast("Welcome! Let's finish setting up your profile.", 'success');
                    navigate('/complete-profile', { replace: true });
                } else {
                    showToast(`Welcome back, ${userData.first_name || 'Driver'}!`, 'success');
                    navigate('/home', { replace: true });
                }
            } catch (err) {
                console.error('[Callback] Backend /me failed:', err);
                showToast('Failed to load profile. Please try again.', 'error');
                navigate('/login', { replace: true });
            }
        };

        // === Strategy 1: Listen for auth state change ===
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // console.log('[Callback] onAuthStateChange event:', event, '| session:', !!session);
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
                handleSession(session);
            }
        });

        // === Strategy 2: Direct check after 1.5s (fallback) ===
        const fallback = setTimeout(async () => {
            if (hasHandled.current) return;
            // console.log('[Callback] Fallback: checking getSession directly...');
            const { data: { session } } = await supabase.auth.getSession();
            // console.log('[Callback] Fallback getSession result:', !!session);
            if (session) {
                handleSession(session);
            }
        }, 1500);

        // === Strategy 3: Hard timeout after 6s ===
        const timeout = setTimeout(() => {
            if (!hasHandled.current) {
                console.warn('[Callback] TIMEOUT: No session after 6s.');
                showToast('Login timed out. Please try again.', 'error');
                navigate('/login', { replace: true });
            }
        }, 6000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(fallback);
            clearTimeout(timeout);
        };
    }, [navigate, setUser, showToast]);

    return (
        <div className="min-h-screen bg-base flex flex-col items-center justify-center p-6 text-center">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-accent/[0.1] rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-4 w-8 h-8 rounded-full bg-accent/20 blur-xl animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white mt-8 mb-2">Setting up your account...</h2>
            <p className="text-white/40 italic font-medium tracking-wide">Securing your session. Please wait.</p>
        </div>
    );
}
