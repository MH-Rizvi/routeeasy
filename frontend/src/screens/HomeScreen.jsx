/**
 * HomeScreen.jsx — Dark enterprise home with stats and horizontal scroll.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useTripStore from '../store/tripStore';
import TripCard from '../components/TripCard';

export default function HomeScreen() {
    const navigate = useNavigate();
    const { trips, loading, error, fetchTrips, clearError } = useTripStore();

    useEffect(() => { fetchTrips(); }, [fetchTrips]);

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
        <div className="min-h-full px-4 pt-8 pb-4">
            {/* Greeting */}
            <div className="mb-8 animate-fade-up">
                <img src="/logo.png" alt="RouteEasy" className="h-10 w-auto mb-4" />
                <p className="text-text-secondary text-sm font-medium tracking-wide uppercase mb-1">RouteEasy</p>
                <h1 className="text-3xl font-extrabold text-text-primary">Ready to Roll</h1>
                <div className="accent-line mt-3" />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-8 animate-fade-up" style={{ animationDelay: '50ms' }}>
                <StatCard label="This Week" value={tripsThisWeek} />
                <StatCard label="Total Stops" value={totalStops} />
                <StatCard label="Saved Routes" value={trips.length} />
            </div>

            {/* Error */}
            {error && (
                <div className="card p-4 mb-4 border-danger/30 animate-fade-up">
                    <p className="text-danger text-sm">⚠ {error}</p>
                    <button onClick={clearError} className="text-sm text-accent mt-1 underline min-h-touch">Dismiss</button>
                </div>
            )}

            {/* Loading */}
            {loading && trips.length === 0 && (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="skeleton rounded-2xl h-28" />)}
                </div>
            )}

            {/* Empty state */}
            {!loading && trips.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-up">
                    <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg>
                    </div>
                    <h2 className="text-xl font-bold text-text-primary mb-2">No routes saved</h2>
                    <p className="text-text-secondary mb-6 max-w-xs">Plan your first route with our AI assistant</p>
                    <button onClick={() => navigate('/chat')} className="btn-accent min-h-touch px-8 text-lg">
                        Plan New Route
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
            <div className="space-y-3">
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
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="card p-3 text-center">
            <p className="text-2xl font-extrabold text-accent font-mono">{value}</p>
            <p className="text-[11px] text-text-muted uppercase tracking-wider mt-0.5">{label}</p>
        </div>
    );
}
