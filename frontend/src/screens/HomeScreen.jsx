/**
 * HomeScreen.jsx — Dark enterprise home with stats and horizontal scroll.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useTripStore from '../store/tripStore';
import TripCard from '../components/TripCard';
import useToastStore from '../store/toastStore';
import Header from '../components/Header';
import useAuthStore from '../store/authStore';

export default function HomeScreen() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { trips, loading, error, fetchTrips, clearError } = useTripStore();

    useEffect(() => { fetchTrips(); }, [fetchTrips]);

    useEffect(() => {
        if (error) {
            useToastStore.getState().showToast(error, 'error');
            clearError();
        }
    }, [error, clearError]);

    const topTrips = [...trips]
        .sort((a, b) => {
            if (!a.last_used && !b.last_used) return 0;
            if (!a.last_used) return 1;
            if (!b.last_used) return -1;
            return new Date(b.last_used) - new Date(a.last_used);
        })
        .slice(0, 6);

    const totalStops = trips.reduce((sum, t) => sum + (t.stops?.length || 0), 0);
    const tripsThisWeek = trips.filter((t) => {
        if (!t.last_used) return false;
        const diff = Date.now() - new Date(t.last_used).getTime();
        return diff < 7 * 24 * 60 * 60 * 1000;
    }).length;

    const currentHour = new Date().getHours();
    let timeGreeting = 'Good evening';
    if (currentHour < 12) timeGreeting = 'Good morning';
    else if (currentHour < 17) timeGreeting = 'Good afternoon';

    const renderGreeting = () => {
        if (user?.first_name) {
            return (
                <>
                    <p className="text-accent text-[14px] font-bold tracking-widest uppercase">Welcome back</p>
                    <h1 className="text-white text-[32px] font-extrabold mt-1 tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text">
                        {timeGreeting}, {user.first_name}!
                    </h1>
                </>
            );
        }
        return (
            <>
                <p className="text-accent text-[14px] font-bold tracking-widest uppercase">{timeGreeting}</p>
                <h1 className="text-white text-[32px] font-extrabold mt-1 tracking-tight">Ready to roll?</h1>
            </>
        );
    };

    return (
        <div className="min-h-full pb-4 flex flex-col animate-page-enter">
            <Header />

            <div className="px-5 lg:px-8 lg:max-w-7xl lg:mx-auto lg:w-full pt-6 lg:pt-8 flex-1 flex flex-col">
                {/* Desktop: two-column grid */}
                <div className="lg:grid lg:grid-cols-3 lg:gap-8 flex-1">
                    {/* ── Left column (main content) ── */}
                    <div className="lg:col-span-2">
                        {/* Greeting */}
                        <div className="animate-fade-up mb-5">
                            {renderGreeting()}
                        </div>

                        {/* Hero Action Card */}
                        <div className="mb-8 animate-fade-up" style={{ animationDelay: '50ms' }}>
                            <button
                                onClick={() => navigate('/chat')}
                                className="w-full relative overflow-hidden rounded-3xl p-[1px] group transition-transform active:scale-95 text-left"
                                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.4), rgba(245,158,11,0.1), rgba(251,191,36,0.3))', boxShadow: '0 8px 32px rgba(245,158,11,0.2), 0 0 60px rgba(245,158,11,0.05)' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-full h-full rounded-[23px] p-6 lg:p-8 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(13,17,23,0.95) 0%, rgba(30,41,59,0.6) 100%)', backdropFilter: 'blur(20px)' }}>
                                    <div>
                                        <h2 className="text-white font-bold text-[22px] lg:text-[26px] tracking-tight mb-1">Plan a Route</h2>
                                        <p className="text-text-muted text-[13px] lg:text-[15px]">Powered by RoutAura AI</p>
                                    </div>
                                    <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center relative">
                                        <div className="absolute inset-0 bg-accent/20 animate-ping rounded-full" />
                                        <span className="text-accent text-[28px] lg:text-[32px] relative z-10 leading-none pb-1">＋</span>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Loading */}
                        {loading && trips.length === 0 && (
                            <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                                {[1, 2].map((i) => <div key={i} className="skeleton rounded-2xl h-24" />)}
                            </div>
                        )}

                        {/* Empty state */}
                        {!loading && trips.length === 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center pb-12 text-center animate-fade-up" style={{ animationDelay: '100ms' }}>
                                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(245,158,11,0.15)', boxShadow: '0 0 20px rgba(245,158,11,0.08)' }}>
                                    <span className="text-[32px]">🛣️</span>
                                </div>
                                <h2 className="text-[18px] font-semibold text-white mb-2">No past routes</h2>
                                <p className="text-[#6B7280] text-[14px] max-w-[250px]">Tap the button above to plan your very first delivery or route with AI.</p>
                            </div>
                        )}

                        {/* Section header */}
                        {topTrips.length > 0 && (
                            <div className="flex items-center justify-between mb-3 animate-fade-up" style={{ animationDelay: '100ms' }}>
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 rounded-full bg-[#F59E0B]" />
                                    <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Recent Routes</h2>
                                </div>
                                <button onClick={() => navigate('/trips')} className="text-sm text-accent font-medium min-h-touch flex items-center">
                                    View All →
                                </button>
                            </div>
                        )}

                        {/* Trip cards — 2-col grid on desktop */}
                        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 mb-20 lg:mb-8">
                            {topTrips.map((trip, idx) => (
                                <div key={trip.id} className="animate-fade-up" style={{ animationDelay: `${120 + idx * 50}ms` }}>
                                    <TripCard trip={trip} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Right column (desktop stats sidebar) ── */}
                    <div className="hidden lg:block lg:col-span-1 space-y-5">
                        {/* Quick Stats */}
                        <div className="animate-fade-up rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.4) 0%, rgba(13,17,23,0.7) 100%)', border: '1px solid rgba(245,158,11,0.1)', animationDelay: '150ms' }}>
                            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                                <div className="w-1 h-3 rounded-full bg-[#F59E0B]" />
                                Quick Stats
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[13px] text-white/50">Total Trips</span>
                                    <span className="text-[18px] font-bold text-white">{trips.length}</span>
                                </div>
                                <div className="h-px bg-white/[0.04]" />
                                <div className="flex items-center justify-between">
                                    <span className="text-[13px] text-white/50">Total Stops</span>
                                    <span className="text-[18px] font-bold text-white">{totalStops}</span>
                                </div>
                                <div className="h-px bg-white/[0.04]" />
                                <div className="flex items-center justify-between">
                                    <span className="text-[13px] text-white/50">Active This Week</span>
                                    <span className="text-[18px] font-bold text-[#F59E0B]">{tripsThisWeek}</span>
                                </div>
                            </div>
                        </div>

                        {/* Ask History Shortcut */}
                        <button
                            onClick={() => navigate('/history')}
                            className="w-full animate-fade-up rounded-2xl p-5 text-left group transition-all"
                            style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.3) 0%, rgba(13,17,23,0.6) 100%)', border: '1px solid rgba(255,255,255,0.05)', animationDelay: '250ms' }}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                </div>
                                <h3 className="text-[14px] font-semibold text-white/90">Ask Your History</h3>
                            </div>
                            <p className="text-[12px] text-white/40 leading-relaxed">Ask questions about your past routes using AI-powered memory search.</p>
                            <div className="mt-3 text-[12px] text-[#F59E0B] font-semibold group-hover:translate-x-1 transition-transform">
                                Go to History →
                            </div>
                        </button>

                        {/* Tips */}
                        <div className="animate-fade-up rounded-2xl p-5" style={{ background: 'rgba(13,17,23,0.4)', border: '1px solid rgba(255,255,255,0.04)', animationDelay: '350ms' }}>
                            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Pro Tips</h3>
                            <ul className="space-y-2.5 text-[12px] text-white/40 leading-relaxed">
                                <li className="flex items-start gap-2">
                                    <span className="text-[#F59E0B] mt-0.5">•</span>
                                    Describe routes in plain English — the AI handles the rest
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-[#F59E0B] mt-0.5">•</span>
                                    Say "my usual Monday route" to recall saved patterns
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-[#F59E0B] mt-0.5">•</span>
                                    Save frequent routes to launch them in one tap
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Spacer to prevent clipping on small screens */}
                <div className="h-12 w-full shrink-0 lg:hidden" />
            </div>
        </div>
    );
}
