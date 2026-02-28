/**
 * TripCard.jsx — Dark enterprise trip card with amber accent.
 */
import { useNavigate } from 'react-router-dom';
import useTripStore from '../store/tripStore';
import { buildGoogleMapsUrl } from '../utils/mapsLinks';

export default function TripCard({ trip }) {
    const navigate = useNavigate();
    const { launchCurrentTrip } = useTripStore();

    const stopCount = trip.stops?.length || 0;
    const lastUsed = trip.last_used
        ? new Date(trip.last_used).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : 'Never';

    const handleNavigate = async (e) => {
        e.stopPropagation();
        if (!trip.stops || trip.stops.length < 2) { navigate(`/trips/${trip.id}`); return; }
        await launchCurrentTrip(trip.id);
        const url = buildGoogleMapsUrl(trip.stops);
        if (url) window.open(url, '_blank');
    };

    return (
        <div
            className="card card-accent p-4 flex items-center gap-4 cursor-pointer"
            onClick={() => navigate(`/trips/${trip.id}`)}
            role="button"
            tabIndex={0}
        >
            {/* Route dots visualization */}
            <div className="flex flex-col items-center gap-1 shrink-0 py-1">
                <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                {stopCount > 2 && <span className="w-px h-3 bg-border-hl" />}
                {stopCount > 2 && <span className="w-1.5 h-1.5 rounded-full bg-border-hl" />}
                <span className="w-px h-3 bg-border-hl" />
                <span className="w-2.5 h-2.5 rounded-full border-2 border-accent bg-transparent" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-text-primary truncate">{trip.name}</h3>
                <div className="flex items-center gap-3 text-sm text-text-muted mt-1">
                    <span className="font-mono">{stopCount} stops</span>
                    <span className="text-border-hl">•</span>
                    <span>{lastUsed}</span>
                </div>
            </div>

            {/* Navigate */}
            <button
                onClick={handleNavigate}
                className="btn-accent min-h-touch px-4 text-sm shrink-0"
            >
                Navigate
            </button>
        </div>
    );
}
