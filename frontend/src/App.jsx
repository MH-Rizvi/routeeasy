/**
 * App.jsx — Root with dark enterprise tab bar.
 */
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import PreviewScreen from './screens/PreviewScreen';
import TripsScreen from './screens/TripsScreen';
import TripDetailScreen from './screens/TripDetailScreen';
import HistoryScreen from './screens/HistoryScreen';
import LLMLogsScreen from './screens/LLMLogsScreen';
import AuthScreen from './screens/AuthScreen';
import Toast from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import useAuthStore from './store/authStore';
import { logout } from './api/client';

const TABS = [
    {
        path: '/', label: 'Home', icon: (
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
        path: '/admin/logs', label: 'Logs', icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
        )
    },
];

function BottomTabBar() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 glass-bar border-t border-border safe-area-bottom">
            <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
                {TABS.map((tab) => (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        end={tab.path === '/'}
                        className={({ isActive }) =>
                            `relative flex flex-col items-center justify-center min-w-touch min-h-touch px-2 py-1 transition-colors duration-150 ${isActive ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {tab.icon}
                                <span className={`text-[10px] mt-1 font-medium tracking-wide ${isActive ? 'text-accent' : ''}`}>
                                    {tab.label}
                                </span>
                                {isActive && (
                                    <span className="absolute -bottom-0 w-5 h-0.5 rounded-full bg-accent" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
                {/* Logout Button */}
                <button
                    onClick={() => {
                        useAuthStore.getState().clearUser();
                        logout();
                    }}
                    className="relative flex flex-col items-center justify-center min-w-touch min-h-touch px-2 py-1 transition-colors duration-150 text-text-muted hover:text-red-500"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    <span className="text-[10px] mt-1 font-medium tracking-wide">
                        Logout
                    </span>
                </button>
            </div>
        </nav>
    );
}

function AppShell() {
    const location = useLocation();
    const hideTabBar = location.pathname.startsWith('/preview') || location.pathname === '/login';
    const hydrate = useAuthStore((state) => state.hydrate);

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    return (
        <div className="flex flex-col min-h-screen relative">
            <Toast />
            <main className={`flex-1 flex flex-col overflow-y-auto ${hideTabBar ? '' : 'pb-safe-tabbar'}`}>
                <Routes>
                    <Route path="/login" element={<AuthScreen />} />

                    <Route element={<ProtectedRoute />}>
                        <Route path="/" element={<HomeScreen />} />
                        <Route path="/chat" element={<ChatScreen />} />
                        <Route path="/preview" element={<PreviewScreen />} />
                        <Route path="/trips" element={<TripsScreen />} />
                        <Route path="/trips/:tripId" element={<TripDetailScreen />} />
                        <Route path="/history" element={<HistoryScreen />} />
                        <Route path="/admin/logs" element={<LLMLogsScreen />} />
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
