/**
 * TripDetailScreen.jsx — Dark enterprise single trip view.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useTripStore from '../store/tripStore';
import MapPreview from '../components/MapPreview';
import { buildGoogleMapsUrl } from '../utils/mapsLinks';

export default function TripDetailScreen() {
    const { tripId } = useParams();
    const navigate = useNavigate();
    const { currentTrip, loading, error, fetchTrip, launchCurrentTrip, removeTrip } = useTripStore();
    const [deleting, setDeleting] = useState(false);

    useEffect(() => { if (tripId) fetchTrip(Number(tripId)); }, [tripId, fetchTrip]);

    const handleNavigate = async () => {
        if (!currentTrip?.stops?.length) return;
        await launchCurrentTrip(currentTrip.id);
        const url = buildGoogleMapsUrl(currentTrip.stops);
        if (url) window.open(url, '_blank');
    };

    const handleDelete = async () => {
        if (!currentTrip) return;
        setDeleting(true);
        await removeTrip(currentTrip.id);
        setDeleting(false);
        navigate('/trips');
    };

    if (loading && !currentTrip) {
        return (
            <div className="flex items-center justify-center min-h-full">
                <div className="flex flex-col items-center gap-3 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg>
                    </div>
                    <p className="text-text-muted text-sm font-mono">Loading…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-full px-4 pt-4">
                <button onClick={() => navigate(-1)} className="min-h-touch text-accent font-semibold text-sm mb-4">← Back</button>
                <div className="card p-4 border-danger/30"><p className="text-danger">⚠ {error}</p></div>
            </div>
        );
    }

    if (!currentTrip) {
        return (
            <div className="px-4 pt-6 text-center py-16 animate-fade-up">
                <p className="text-text-secondary">Trip not found</p>
                <button onClick={() => navigate('/trips')} className="mt-4 min-h-touch px-6 rounded-xl btn-accent">Go to Trips</button>
            </div>
        );
    }

    const stops = currentTrip.stops || [];

    return (
        <div className="min-h-full pb-6">
            <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border glass-bar">
                <img src="/logo.png" alt="RouteEasy" className="h-8 w-auto" />
                <button onClick={() => navigate(-1)} className="min-h-touch flex items-center gap-1 text-accent font-semibold text-sm">← Back</button>
            </div>

            <div className="px-4 pt-4 animate-fade-up">
                <h1 className="text-2xl font-bold text-text-primary mb-1">{currentTrip.name}</h1>
                {currentTrip.notes && <p className="text-text-secondary text-sm mb-3">{currentTrip.notes}</p>}
                <div className="accent-line mb-4" />

                {stops.length > 0 && <MapPreview stops={stops} />}

                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mt-4 mb-3 font-mono">{stops.length} Stop{stops.length !== 1 ? 's' : ''}</h2>

                {/* Stop list with route dots */}
                <div className="relative mb-6">
                    {stops.length > 1 && <div className="absolute left-[11px] top-3 bottom-3 w-px bg-accent/30" />}
                    <div className="space-y-3">
                        {stops.map((stop, i) => (
                            <div key={stop.id || i} className="flex gap-3 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                                <div className="relative z-10 w-6 h-6 rounded-full bg-base border-2 border-accent flex items-center justify-center shrink-0 mt-1">
                                    <span className="text-[9px] font-bold text-accent font-mono">{i + 1}</span>
                                </div>
                                <div className="card p-3 flex-1">
                                    <p className="text-sm font-semibold text-text-primary truncate">{stop.label || stop.resolved}</p>
                                    {stop.resolved && stop.resolved !== stop.label && (
                                        <p className="text-xs text-text-muted truncate mt-0.5">{stop.resolved}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button onClick={handleNavigate} disabled={stops.length < 2} className="w-full min-h-touch rounded-xl btn-accent text-lg flex items-center justify-center gap-2 disabled:opacity-30">
                        Navigate Now
                    </button>
                    <button onClick={() => navigate('/preview', { state: { stops, tripId: currentTrip.id } })} className="w-full min-h-touch rounded-xl btn-surface text-lg flex items-center justify-center gap-2">
                        Edit Route
                    </button>
                    <button onClick={handleDelete} disabled={deleting} className="w-full min-h-touch rounded-xl border-2 border-danger/50 text-danger font-semibold text-lg flex items-center justify-center gap-2 hover:bg-danger/10 transition-colors disabled:opacity-50">
                        {deleting ? <span className="typing-dots"><span /><span /><span /></span> : 'Delete Trip'}
                    </button>
                </div>
            </div>
        </div>
    );
}
