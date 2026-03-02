/**
 * HomeScreen.jsx — Dark enterprise home with stats and horizontal scroll.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useTripStore from '../store/tripStore';
import TripCard from '../components/TripCard';
import useToastStore from '../store/toastStore';
import Header from '../components/Header';

export default function HomeScreen() {
    const navigate = useNavigate();
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

    return (
        <div className="min-h-full pb-4 flex flex-col">
            <Header />

            {/* Greeting */}
            <div className="px-5 pt-6 animate-fade-up">
                <p className="text-[#9CA3AF] text-[14px]">Good morning</p>
                <h1 className="text-white text-[28px] font-bold mt-1">Ready to roll?</h1>
            </div>

            <div className="px-5 mt-5 flex-1 flex flex-col">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-0 animate-fade-up" style={{ animationDelay: '50ms' }}>
                    <StatCard label="This Week" value={tripsThisWeek} />
                    <StatCard label="Total Stops" value={totalStops} />
                    <StatCard label="Saved Routes" value={trips.length} />
                </div>

                {/* Loading */}
                {loading && trips.length === 0 && (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => <div key={i} className="skeleton rounded-2xl h-28" />)}
                    </div>
                )}

                {/* Empty state */}
                {!loading && trips.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center pb-12 text-center animate-fade-up mt-8">
                        <div className="text-[48px] mb-4 leading-none">🚌</div>
                        <h2 className="text-[18px] font-semibold text-white mb-2">No routes saved yet</h2>
                        <p className="text-[#6B7280] text-[14px] mb-6 max-w-xs px-4">Describe your first route to the AI assistant</p>
                        <button
                            onClick={() => navigate('/chat')}
                            className="w-full h-14 bg-[#F59E0B] text-black font-bold text-[18px] rounded-2xl flex items-center justify-center transition-transform active:scale-95"
                            style={{ boxShadow: '0 4px 24px rgba(245,158,11,0.25)' }}
                        >
                            ＋ Plan New Route
                        </button>
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

                {/* FAB */}
                {trips.length > 0 && (
                    <button
                        onClick={() => navigate('/chat')}
                        className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full btn-accent text-2xl shadow-glow flex items-center justify-center animate-glow-pulse"
                        aria-label="Plan a new route"
                    >
                        +
                    </button>
                )}

                {/* Spacer to prevent FAB clipping */}
                <div className="h-24 sm:h-12 w-full shrink-0" />
            </div>
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 text-center">
            <p className="text-[32px] font-bold text-white mb-0.5 leading-none">{String(value)}</p>
            <p className="text-[#6B7280] text-[11px] uppercase tracking-wider">{label}</p>
        </div>
    );
}
