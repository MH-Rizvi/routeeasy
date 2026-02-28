/**
 * App.jsx — Root component with React Router v6 and
 * bottom tab bar navigation.
 *
 * Tabs: Home, Chat, Trips, History, Logs
 * All following CLAUDE.md UI rules: 48px touch targets,
 * bottom nav, mobile-first layout.
 */
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';

// Screen components
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import PreviewScreen from './screens/PreviewScreen';
import TripsScreen from './screens/TripsScreen';
import TripDetailScreen from './screens/TripDetailScreen';
import HistoryScreen from './screens/HistoryScreen';
import LLMLogsScreen from './screens/LLMLogsScreen';

// ── Tab config ───────────────────────────────

const TABS = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/chat', label: 'Chat', icon: '💬' },
    { path: '/trips', label: 'Trips', icon: '🗺️' },
    { path: '/history', label: 'History', icon: '📋' },
    { path: '/admin/logs', label: 'Logs', icon: '📊' },
];

// ── Bottom Tab Bar ───────────────────────────

function BottomTabBar() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-gray-200 safe-area-bottom">
            <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
                {TABS.map((tab) => (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        end={tab.path === '/'}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center min-w-touch min-h-touch px-2 py-1 rounded-lg transition-colors duration-150 ${isActive
                                ? 'text-primary font-semibold'
                                : 'text-secondary hover:text-body'
                            }`
                        }
                    >
                        <span className="text-xl leading-none">{tab.icon}</span>
                        <span className="text-xs mt-1">{tab.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}

// ── App Shell ────────────────────────────────

function AppShell() {
    const location = useLocation();

    // Hide bottom nav on preview screen (needs full viewport)
    const hideTabBar = location.pathname.startsWith('/preview');

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Main content area — leave room for bottom tab bar */}
            <main className={`flex-1 overflow-y-auto ${hideTabBar ? '' : 'pb-20'}`}>
                <Routes>
                    <Route path="/" element={<HomeScreen />} />
                    <Route path="/chat" element={<ChatScreen />} />
                    <Route path="/preview" element={<PreviewScreen />} />
                    <Route path="/trips" element={<TripsScreen />} />
                    <Route path="/trips/:tripId" element={<TripDetailScreen />} />
                    <Route path="/history" element={<HistoryScreen />} />
                    <Route path="/admin/logs" element={<LLMLogsScreen />} />
                </Routes>
            </main>

            {!hideTabBar && <BottomTabBar />}
        </div>
    );
}

// ── Root Export ───────────────────────────────

export default function App() {
    return (
        <BrowserRouter>
            <AppShell />
        </BrowserRouter>
    );
}
