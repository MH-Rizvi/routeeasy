/**
 * TripDetailScreen.jsx — Dark enterprise single trip view.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useTripStore from '../store/tripStore';
import MapPreview from '../components/MapPreview';
import { buildGoogleMapsUrl, buildAppleMapsUrl } from '../utils/mapsLinks';
import useToastStore from '../store/toastStore';
import Header from '../components/Header';

export default function TripDetailScreen() {
    const { tripId } = useParams();
    const navigate = useNavigate();
    const { currentTrip, loading, error, fetchTrip, launchCurrentTrip, removeTrip } = useTripStore();
    const [deleting, setDeleting] = useState(false);

    useEffect(() => { if (tripId) fetchTrip(Number(tripId)); }, [tripId, fetchTrip]);

    useEffect(() => {
        if (error) {
            useToastStore.getState().showToast(error, 'error');
        }
    }, [error]);

    const handleGoogleMaps = () => {
        if (!currentTrip?.stops?.length) return;

        launchCurrentTrip(currentTrip.id).catch(err => console.error("Failed to track launch", err));
        useToastStore.getState().showToast('🚌 Opening Google Maps...', 'info');

        const url = buildGoogleMapsUrl(currentTrip.stops);
        if (url) window.location.href = url;
    };

    const handleAppleMaps = () => {
        if (!currentTrip?.stops?.length) return;

        launchCurrentTrip(currentTrip.id).catch(err => console.error("Failed to track launch", err));
        useToastStore.getState().showToast('🚌 Opening Apple Maps...', 'info');

        const url = buildAppleMapsUrl(currentTrip.stops);
        if (url) window.location.href = url;
    };

    const handleDelete = async () => {
        if (!currentTrip) return;
        setDeleting(true);
        await removeTrip(currentTrip.id);
        setDeleting(false);
        useToastStore.getState().showToast('Trip deleted', 'success');
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
                <div className="card p-4 border-danger/30"><p className="text-danger flex items-center justify-center py-4">Going back...</p></div>
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
            <Header
                rightElement={
                    <button onClick={() => navigate(-1)} className="min-h-touch flex items-center gap-[4px] text-accent font-bold tracking-wide text-sm hover:opacity-80 transition-opacity">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                        Back
                    </button>
                }
            />

            <div className="px-4 sm:px-5 mt-4 sm:mt-5 animate-fade-up pb-24">
                <h1 className="text-2xl font-bold text-text-primary mb-1">{currentTrip.name}</h1>
                {currentTrip.notes && <p className="text-text-secondary text-sm mb-3">{currentTrip.notes}</p>}

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
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleAppleMaps} disabled={stops.length < 2} className="w-full h-16 rounded-xl bg-surface border border-border-hl text-text-primary text-sm font-semibold flex flex-col items-center justify-center gap-1 hover:bg-border-hl transition-colors disabled:opacity-30">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.05 2.53.81 3.19.81.79 0 2.21-1.01 3.84-.86 1.63.13 3.13.84 4.02 2.11-3.41 1.98-2.88 6.51.35 7.84-.79 1.83-2.09 3.85-3.4 5.07zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.28-1.9 4.2-3.74 4.25z" />
                            </svg>
                            Apple Maps
                        </button>
                        <button onClick={handleGoogleMaps} disabled={stops.length < 2} className="w-full h-16 rounded-xl btn-accent text-sm font-semibold text-black flex flex-col items-center justify-center gap-1 disabled:opacity-30">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                            </svg>
                            Google Maps
                        </button>
                    </div>
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
