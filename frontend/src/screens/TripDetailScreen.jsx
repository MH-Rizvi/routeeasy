/**
 * TripDetailScreen.jsx — View a single saved trip.
 *
 * Shows trip info, map preview, stop list, and action buttons
 * (Navigate Now, Open in Google Maps, Delete).
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

    useEffect(() => {
        if (tripId) fetchTrip(Number(tripId));
    }, [tripId, fetchTrip]);

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
                <span className="text-4xl animate-spin">⏳</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="px-4 pt-6">
                <button onClick={() => navigate(-1)} className="min-h-touch text-primary font-medium mb-4">← Back</button>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-danger">⚠️ {error}</p>
                </div>
            </div>
        );
    }

    if (!currentTrip) {
        return (
            <div className="px-4 pt-6 text-center py-16">
                <p className="text-secondary text-lg">Trip not found</p>
                <button onClick={() => navigate('/trips')} className="mt-4 min-h-touch px-6 rounded-xl bg-primary text-white font-semibold">
                    Go to Trips
                </button>
            </div>
        );
    }

    const stops = currentTrip.stops || [];

    return (
        <div className="min-h-full px-4 pt-4 pb-6">
            <button onClick={() => navigate(-1)} className="min-h-touch flex items-center gap-1 text-primary font-medium mb-3">← Back</button>

            <h1 className="text-2xl font-bold text-body mb-1">{currentTrip.name}</h1>
            {currentTrip.notes && (
                <p className="text-secondary text-sm mb-4">{currentTrip.notes}</p>
            )}

            {/* Map preview */}
            {stops.length > 0 && <MapPreview stops={stops} />}

            {/* Stop list */}
            <div className="mt-4 mb-2">
                <h2 className="text-lg font-semibold text-body">
                    {stops.length} Stop{stops.length !== 1 ? 's' : ''}
                </h2>
            </div>

            <div className="flex flex-col gap-2 mb-6">
                {stops.map((stop, i) => (
                    <div key={stop.id || i} className="flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center shrink-0">
                            {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-base font-medium text-body truncate">{stop.label || stop.resolved}</p>
                            {stop.resolved && stop.resolved !== stop.label && (
                                <p className="text-sm text-secondary truncate">{stop.resolved}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
                <button
                    onClick={handleNavigate}
                    disabled={stops.length < 2}
                    className="w-full min-h-touch rounded-xl bg-primary hover:bg-blue-700 text-white font-semibold text-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
                >
                    🧭 Navigate Now
                </button>

                <button
                    onClick={() => navigate('/preview', { state: { stops, tripId: currentTrip.id } })}
                    className="w-full min-h-touch rounded-xl bg-gray-100 hover:bg-gray-200 text-body font-semibold text-lg flex items-center justify-center gap-2 transition-colors"
                >
                    ✏️ Edit Route
                </button>

                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full min-h-touch rounded-xl border-2 border-danger text-danger font-semibold text-lg flex items-center justify-center gap-2 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                    {deleting ? '⏳ Deleting…' : '🗑️ Delete Trip'}
                </button>
            </div>
        </div>
    );
}
