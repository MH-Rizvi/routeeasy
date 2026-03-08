/**
 * App.jsx — Root with dark enterprise tab bar + desktop sidebar.
 */
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import PreviewScreen from './screens/PreviewScreen';
import TripsScreen from './screens/TripsScreen';
import TripDetailScreen from './screens/TripDetailScreen';
import HistoryScreen from './screens/HistoryScreen';
import StatsScreen from './screens/StatsScreen';
import AuthScreen from './screens/AuthScreen';
import AccountScreen from './screens/AccountScreen';
import LandingPage from './screens/LandingPage';
import AuthCallbackScreen from './screens/AuthCallbackScreen';
import CompleteProfileScreen from './screens/CompleteProfileScreen';
import Toast from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import useAuthStore from './store/authStore';
import { logout } from './api/client';

const TABS = [
    {
        path: '/home', label: 'Home', icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
        )
    },
    {
        path: '/chat', label: 'Chat', icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        )
    },
    {
        path: '/trips', label: 'Trips', icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg>
        )
    },
    {
        path: '/history', label: 'History', icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        )
    },
    {
        path: '/stats', label: 'Stats', icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
        )
    },
    {
        path: '/account', label: 'Account', icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        )
    },
];

/* ── Desktop Sidebar (hidden on mobile, visible lg:) ──── */
function DesktopSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U' : 'U';
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleLogout = async () => {
        setShowLogoutConfirm(false);
        await logout();
    };

    return (
        <>
            <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 z-50" style={{ background: 'rgba(13,17,23,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRight: '1px solid rgba(245,158,11,0.15)' }}>
                {/* ── Logo ── */}
                <div className="px-5 pt-6 pb-5 cursor-pointer group" onClick={() => navigate('/home')}>
                    <div className="flex items-center gap-2.5">
                        <div className="relative flex items-center justify-center">
                            <div className="absolute inset-0 bg-accent/30 blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-500 mix-blend-screen" />
                            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center relative z-10 transition-transform duration-500 group-hover:scale-105" style={{ border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 12px rgba(245,158,11,0.25)', background: 'rgba(255,255,255,0.03)' }}>
                                <img src="/logo3_nobg.png" alt="RoutAura" className="w-[140%] h-[140%] max-w-none object-cover rounded-full" />
                            </div>
                        </div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif" }} className="text-[22px] leading-none flex items-baseline tracking-tight">
                            <span className="text-white font-extrabold">Rout</span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-amber-600 font-extrabold ml-[1px] logo-shimmer">Aura</span>
                        </div>
                    </div>
                </div>

                {/* ── Divider ── */}
                <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

                {/* ── Nav Links ── */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {TABS.map((tab) => {
                        const isActive = tab.path === '/home'
                            ? location.pathname === '/home'
                            : location.pathname.startsWith(tab.path);
                        return (
                            <NavLink
                                key={tab.path}
                                to={tab.path}
                                className="relative flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-all duration-200 group"
                                style={isActive ? {
                                    background: 'linear-gradient(90deg, rgba(245,158,11,0.12) 0%, transparent 100%)',
                                    color: '#F59E0B',
                                    borderLeft: '4px solid #F59E0B',
                                    boxShadow: 'inset 4px 0 10px -4px rgba(245,158,11,0.5)',
                                } : {
                                    color: '#94A3B8',
                                    borderLeft: '4px solid transparent',
                                }}
                            >
                                <div className={`transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'}`}>
                                    {tab.icon}
                                </div>
                                <span className={`${isActive ? '' : 'group-hover:text-white'} transition-colors`}>{tab.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* ── Divider ── */}
                <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

                {/* ── User Section ── */}
                {user && (
                    <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 relative" style={{ background: 'linear-gradient(135deg, #1a1a2e, #0d0d1a)', border: '1px solid rgba(245,158,11,0.4)', zIndex: 1 }}>
                                <div className="absolute inset-0 rounded-lg animate-pulse pointer-events-none" style={{ boxShadow: '0 0 12px rgba(245,158,11,0.5)' }} />
                                <span className="text-[#F59E0B] text-[13px] font-extrabold">{initials}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold text-white/90 truncate">{user.first_name} {user.last_name}</p>
                                <p className="text-[11px] text-white/40 truncate">{user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowLogoutConfirm(true)}
                            className="w-full flex items-center justify-center gap-2 py-2 text-[12px] font-bold rounded-lg transition-all duration-200"
                            style={{ color: 'rgba(248,113,113,0.8)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}
                        >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                            Sign Out
                        </button>
                    </div>
                )}
            </aside>

            {/* ── Sidebar Logout Confirmation Modal ── */}
            {showLogoutConfirm && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    onClick={() => setShowLogoutConfirm(false)}
                    style={{ animation: 'fade-in 0.2s ease-out forwards' }}
                >
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
                    <div
                        className="relative w-full max-w-[400px] bg-gradient-to-br from-[#141824] via-[#111827] to-[#0d1117] border border-white/[0.08] rounded-3xl p-8 shadow-[0_25px_60px_rgba(0,0,0,0.6)] text-center"
                        onClick={e => e.stopPropagation()}
                        style={{ animation: 'sidebarModalPop 0.3s cubic-bezier(0.16,1,0.3,1) forwards' }}
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 rounded-b-full bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
                        <img src="/logo3_nobg.png" alt="RoutAura" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-5 border border-white/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]" />
                        <h3 className="text-xl font-extrabold text-white mb-2 tracking-tight">Sign Out</h3>
                        <p className="text-[14px] text-white/50 mb-8 leading-relaxed">Are you sure you want to sign out of RoutAura?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3.5 bg-white/[0.04] border border-white/[0.1] rounded-xl font-bold text-white/80 text-[14px] hover:bg-white/[0.08] transition-all">Cancel</button>
                            <button onClick={handleLogout} className="flex-1 py-3.5 bg-red-500 rounded-xl font-bold text-white text-[14px] hover:bg-red-600 shadow-[0_4px_15px_rgba(239,68,68,0.3)] transition-all active:scale-[0.98]">Yes, Sign Out</button>
                        </div>
                    </div>
                    <style>{`
                    @keyframes sidebarModalPop {
                        from { opacity: 0; transform: scale(0.92) translateY(10px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                    }
                `}</style>
                </div>,
                document.body
            )}
        </>
    );
}

/* ── Bottom Tab Bar (mobile only) ──── */
function BottomTabBar() {
    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] safe-area-bottom lg:hidden" style={{ background: 'rgba(13, 17, 23, 0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                {/* Amber top accent line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#F59E0B]/20 to-transparent" />
                <div className="flex justify-start sm:justify-around items-center h-16 max-w-lg mx-auto overflow-x-auto hide-scrollbar px-2 gap-4 sm:gap-0">
                    {TABS.map((tab) => (
                        <NavLink
                            key={tab.path}
                            to={tab.path}
                            end={tab.path === '/home'}
                            className={({ isActive }) =>
                                `relative flex flex-col items-center justify-center min-w-touch min-h-touch px-2 py-1 transition-colors duration-150 ${isActive ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <div className={`transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]' : ''}`}>
                                        {tab.icon}
                                    </div>
                                    <span className={`text-[10px] mt-1 font-medium tracking-wide ${isActive ? 'text-accent' : ''}`}>
                                        {tab.label}
                                    </span>
                                    {isActive && (
                                        <span className="absolute -bottom-0 w-6 h-1 rounded-full bg-[#F59E0B]" style={{ boxShadow: '0 0 10px rgba(245, 158, 11, 0.5), 0 0 20px rgba(245, 158, 11, 0.2)' }} />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>
        </>
    );
}

function AppShell() {
    const location = useLocation();
    const hideTabBar = location.pathname.startsWith('/preview') ||
        location.pathname === '/login' ||
        location.pathname === '/signup' ||
        location.pathname === '/' ||
        location.pathname === '/complete-profile' ||
        location.pathname === '/auth/callback';

    // Show sidebar only on authenticated app screens (not landing, auth, callback, etc.)
    const showSidebar = !hideTabBar;

    const hydrate = useAuthStore((state) => state.hydrate);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isHydrating = useAuthStore((state) => state.isHydrating);
    const navigate = useNavigate();

    useEffect(() => {
        // PKCE Redirect: If we land on root with a ?code= param, 
        // redirect to /auth/callback to handle the exchange.
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        if (location.pathname === '/' && code) {
            navigate(`/auth/callback?code=${code}`, { replace: true });
        }
    }, [location, navigate]);

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    return (
        <div className="flex h-[100dvh] lg:overflow-hidden relative">
            <Toast />
            {/* Desktop sidebar — only on authenticated screens */}
            {showSidebar && <DesktopSidebar />}
            {/* Main content area — shifts right on desktop when sidebar is visible */}
            <main
                className={`flex-1 flex flex-col overflow-y-auto ${hideTabBar ? '' : 'pb-safe-tabbar lg:pb-0'} ${showSidebar ? 'lg:ml-64' : ''}`}
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                <Routes>
                    <Route path="/login" element={<div key={location.pathname} className="page-transition"><AuthScreen /></div>} />
                    <Route path="/signup" element={<div key={location.pathname} className="page-transition"><AuthScreen /></div>} />
                    <Route path="/auth/callback" element={<AuthCallbackScreen />} />
                    <Route path="/complete-profile" element={<CompleteProfileScreen />} />
                    <Route path="/" element={
                        <div key={location.pathname} className="page-transition">
                            {isHydrating ? (
                                <div className="min-h-screen bg-base flex flex-col items-center justify-center">
                                    <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
                                </div>
                            ) : isAuthenticated ? (
                                <Navigate to="/home" replace />
                            ) : (
                                <LandingPage />
                            )}
                        </div>
                    } />

                    <Route element={<ProtectedRoute />}>
                        <Route path="/home" element={<HomeScreen />} />
                        <Route path="/chat" element={<ChatScreen />} />
                        <Route path="/preview" element={<PreviewScreen />} />
                        <Route path="/trips" element={<TripsScreen />} />
                        <Route path="/trips/:tripId" element={<TripDetailScreen />} />
                        <Route path="/history" element={<HistoryScreen />} />
                        <Route path="/stats" element={<StatsScreen />} />
                        <Route path="/account" element={<AccountScreen />} />
                    </Route>
                </Routes>
            </main>
            {!hideTabBar && <BottomTabBar />}
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppShell />
        </BrowserRouter>
    );
}
