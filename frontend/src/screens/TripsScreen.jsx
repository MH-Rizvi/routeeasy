/**
 * TripsScreen.jsx — Dark enterprise trips library with semantic search.
 */
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useTripStore from '../store/tripStore';
import SemanticSearchBar from '../components/SemanticSearchBar';
import { buildGoogleMapsUrl, buildAppleMapsUrl } from '../utils/mapsLinks';
import useToastStore from '../store/toastStore';
import Header from '../components/Header';

function TripRow({ trip, onDelete, onTap }) {
    const [offset, setOffset] = useState(0);
    const [swiping, setSwiping] = useState(false);
    const startX = useRef(0);

    const handleTouchStart = (e) => { startX.current = e.touches[0].clientX; setSwiping(true); };
    const handleTouchMove = (e) => { if (!swiping) return; const d = startX.current - e.touches[0].clientX; if (d > 0) setOffset(Math.min(d, 100)); };
    const handleTouchEnd = () => { setSwiping(false); if (offset > 60) onDelete(trip.id); setOffset(0); };

    const stopCount = trip.stops?.length || trip.stop_count || 0;
    const lastUsed = trip.last_used
        ? new Date(trip.last_used).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : null;

    return (
        <div className="relative overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-danger flex items-center justify-end pr-6 rounded-2xl">
                <span className="text-white font-bold text-sm">Delete</span>
            </div>
            <div
                className="relative glass-card rounded-xl p-4 cursor-pointer flex items-center justify-between group"
                style={{ transform: `translateX(-${offset}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => onTap(trip.id)}
                role="button"
                tabIndex={0}
            >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-accent to-orange-600 rounded-l-xl opacity-80" />
                <div className="flex items-center gap-3 min-w-0 flex-1 pl-2">
                    <div className="min-w-0">
                        <h3 className="text-[17px] font-bold text-white truncate group-hover:text-accent transition-colors">{trip.name}</h3>
                        <div className="flex items-center gap-2 text-[13px] text-text-secondary mt-1">
                            <span className="bg-surface px-2 py-0.5 rounded-md border border-border">{stopCount} stops</span>
                            {lastUsed && <span className="text-text-muted">• {lastUsed}</span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {trip.similarity !== undefined && (
                        <span className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold font-mono border border-accent/30">
                            {Math.round(trip.similarity * 100)}%
                        </span>
                    )}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!trip.stops || trip.stops.length < 2) return;
                                useTripStore.getState().launchCurrentTrip(trip.id).catch(err => console.error(err));
                                useToastStore.getState().showToast('🚌 Opening Apple Maps...', 'info');
                                const url = buildAppleMapsUrl(trip.stops);
                                if (url) window.location.href = url;
                            }}
                            title="Open in Apple Maps"
                            className="w-8 h-8 rounded-full bg-surface border border-border-hl flex items-center justify-center text-text-primary hover:bg-border-hl transition-colors"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.05 2.53.81 3.19.81.79 0 2.21-1.01 3.84-.86 1.63.13 3.13.84 4.02 2.11-3.41 1.98-2.88 6.51.35 7.84-.79 1.83-2.09 3.85-3.4 5.07zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.28-1.9 4.2-3.74 4.25z" />
                            </svg>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!trip.stops || trip.stops.length < 2) return;
                                useTripStore.getState().launchCurrentTrip(trip.id).catch(err => console.error(err));
                                useToastStore.getState().showToast('🚌 Opening Google Maps...', 'info');
                                const url = buildGoogleMapsUrl(trip.stops);
                                if (url) window.location.href = url;
                            }}
                            title="Open in Google Maps"
                            className="w-8 h-8 rounded-full bg-accent border border-accent/70 flex items-center justify-center text-base hover:brightness-110 transition-colors cursor-pointer text-black"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TripsScreen() {
    const navigate = useNavigate();
    const { trips, searchResults, loading, error, fetchTrips, removeTrip, clearError } = useTripStore();

    useEffect(() => { fetchTrips(); }, [fetchTrips]);

    useEffect(() => {
        if (error) {
            useToastStore.getState().showToast(error, 'error');
            clearError();
        }
    }, [error, clearError]);

    const isSearching = searchResults.length > 0;
    const displayTrips = isSearching ? searchResults : trips;

    const tripsThisWeek = displayTrips.filter((t) => {
        if (!t.last_used) return false;
        const diff = Date.now() - new Date(t.last_used).getTime();
        return diff < 7 * 24 * 60 * 60 * 1000;
    });

    const olderTrips = displayTrips.filter(t => !tripsThisWeek.includes(t));

    return (
        <div className="min-h-full pb-6 flex flex-col">
            <Header
                rightElement={
                    <div className="flex flex-col items-end">
                        <span className="text-text-primary text-[14px] font-bold tracking-tight">My Trips</span>
                        <span className="text-accent text-[11px] font-mono tracking-widest">{trips.length} Total</span>
                    </div>
                }
            />

            <div className="px-4 sm:px-5 mt-4 sm:mt-6 flex-1 pb-24">
                <div className="mb-6"><SemanticSearchBar /></div>

                {loading && displayTrips.length === 0 && (
                    <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="skeleton rounded-2xl h-24" />)}</div>
                )}

                {!loading && displayTrips.length === 0 && (
                    <div className="text-center py-20 animate-fade-up glass-panel rounded-3xl mt-10">
                        <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4 relative overflow-hidden">
                            <div className="absolute inset-0 bg-accent/20 animate-ping rounded-full" />
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" className="relative z-10"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">{isSearching ? 'No routes found' : 'No saved routes'}</h3>
                        <p className="text-text-muted text-sm px-8">{isSearching ? 'Try a different search term or ask naturally' : 'Your saved routes will appear here for easy access'}</p>
                    </div>
                )}

                {isSearching && displayTrips.length > 0 && (
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-white">Search Results</h2>
                        <span className="text-xs text-accent bg-accent/10 px-2 py-1 rounded-md font-mono">{displayTrips.length} Found</span>
                    </div>
                )}

                {!isSearching && displayTrips.length > 0 && tripsThisWeek.length > 0 && (
                    <div className="mb-6 animate-fade-up">
                        <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            Active This Week
                        </h2>
                        <div className="space-y-3">
                            {tripsThisWeek.map((trip, i) => (
                                <div key={trip.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                                    <TripRow trip={trip} onDelete={async (id) => {
                                        await removeTrip(id);
                                        useToastStore.getState().showToast('Trip deleted', 'success');
                                    }} onTap={(id) => navigate(`/trips/${id}`)} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(isSearching || olderTrips.length > 0) && displayTrips.length > 0 && (
                    <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
                        {!isSearching && tripsThisWeek.length > 0 && (
                            <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3 mt-8 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-border-hl" />
                                Older Routes
                            </h2>
                        )}
                        <div className="space-y-3">
                            {(isSearching ? displayTrips : olderTrips).map((trip, i) => (
                                <div key={trip.id} className="animate-fade-up" style={{ animationDelay: `${(tripsThisWeek.length + i) * 40}ms` }}>
                                    <TripRow trip={trip} onDelete={async (id) => {
                                        await removeTrip(id);
                                        useToastStore.getState().showToast('Trip deleted', 'success');
                                    }} onTap={(id) => navigate(`/trips/${id}`)} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!isSearching && trips.length > 0 && (
                    <div className="flex justify-center mt-10 mb-4 opacity-70">
                        <p className="text-xs font-mono text-white flex items-center gap-2 bg-surface px-4 py-2 rounded-full border border-border shadow-lg">
                            <span className="tracking-widest capitalize font-bold">Swipe left on a card to delete</span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
