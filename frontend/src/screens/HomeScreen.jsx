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

            {/* Greeting */}
            <div className="px-5 pt-6 animate-fade-up">
                {renderGreeting()}
            </div>

            <div className="px-5 mt-5 flex-1 flex flex-col">
                {/* Hero Action Card */}
                <div className="mb-8 animate-fade-up" style={{ animationDelay: '50ms' }}>
                    <button
                        onClick={() => navigate('/chat')}
                        className="w-full relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent via-orange-500 to-amber-600 p-[1px] group transition-transform active:scale-95 text-left"
                        style={{ boxShadow: '0 8px 32px rgba(245,158,11,0.25)' }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-full h-full bg-[#111827]/90 backdrop-blur-xl rounded-[23px] p-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-white font-bold text-[22px] tracking-tight mb-1">Plan a Route</h2>
                                <p className="text-text-muted text-[13px]">Powered by Routigo AI</p>
                            </div>
                            <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center relative">
                                <div className="absolute inset-0 bg-accent/20 animate-ping rounded-full" />
                                <span className="text-accent text-[28px] relative z-10 leading-none pb-1">＋</span>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Loading */}
                {loading && trips.length === 0 && (
                    <div className="space-y-4">
                        {[1, 2].map((i) => <div key={i} className="skeleton rounded-2xl h-24" />)}
                    </div>
                )}

                {/* Empty state */}
                {!loading && trips.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center pb-12 text-center animate-fade-up style={{ animationDelay: '100ms' }}">
                        <div className="w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center mb-4">
                            <span className="text-[32px]">🛣️</span>
                        </div>
                        <h2 className="text-[18px] font-semibold text-white mb-2">No past routes</h2>
                        <p className="text-[#6B7280] text-[14px] max-w-[250px]">Tap the button above to plan your very first delivery or route with AI.</p>
                    </div>
                )}

                {/* Section header */}
                {topTrips.length > 0 && (
                    <div className="flex items-center justify-between mb-3 animate-fade-up" style={{ animationDelay: '100ms' }}>
                        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Recent Routes</h2>
                        <button onClick={() => navigate('/trips')} className="text-sm text-accent font-medium min-h-touch flex items-center">
                            View All →
                        </button>
                    </div>
                )}

                {/* Trip cards */}
                <div className="space-y-3 mb-20">
                    {topTrips.map((trip, idx) => (
                        <div key={trip.id} className="animate-fade-up" style={{ animationDelay: `${120 + idx * 50}ms` }}>
                            <TripCard trip={trip} />
                        </div>
                    ))}
                </div>

                {/* Spacer to prevent clipping on small screens */}
                <div className="h-12 w-full shrink-0" />
            </div>
        </div>
    );
}
