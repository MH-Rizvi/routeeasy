/**
 * PreviewScreen.jsx — Dark enterprise route preview.
 */
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import StopList from '../components/StopList';
import MapPreview from '../components/MapPreview';
import SaveTripModal from '../components/SaveTripModal';
import { buildGoogleMapsUrl, buildAppleMapsUrl, isIOS } from '../utils/mapsLinks';
import useTripStore from '../store/tripStore';
import useToastStore from '../store/toastStore';
import Header from '../components/Header';

export default function PreviewScreen() {
    const location = useLocation();
    const navigate = useNavigate();
    const { editTrip } = useTripStore();

    const initialStops = location.state?.stops || [];
    const tripId = location.state?.tripId || null;
    const [stops, setStops] = useState(initialStops);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleReorder = (reordered) => setStops(reordered);
    const handleDeleteStop = (index) => setStops((prev) => prev.filter((_, i) => i !== index));

    const handleOverwriteCurrent = async () => {
        if (!tripId || stops.length < 2) return;
        setIsSaving(true);
        const updated = await editTrip(tripId, { stops });
        setIsSaving(false);
        if (updated) {
            navigate(`/trips/${tripId}`);
        }
    };

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

            <div className="px-4 sm:px-5 mt-4 sm:mt-5 pb-24">

                {stops.length === 0 ? (
                    <div className="text-center py-16 animate-fade-up">
                        <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg>
                        </div>
                        <p className="text-text-secondary">No stops to preview</p>
                        <button onClick={() => navigate('/chat')} className="mt-4 min-h-touch px-6 rounded-xl btn-accent">Plan a Route</button>
                    </div>
                ) : (
                    <>
                        <MapPreview stops={stops} />

                        <div className="flex items-center justify-between mt-4 mb-2">
                            <h2 className="text-sm font-bold text-text-primary font-mono">{stops.length} Stop{stops.length !== 1 ? 's' : ''}</h2>
                            <p className="text-xs text-text-muted">Drag to reorder</p>
                        </div>

                        {stops.length > 10 && (
                            <div className="card p-3 mb-3 border-accent/30">
                                <p className="text-xs text-accent">⚠ Google Maps supports ~8 waypoints on free tier.</p>
                            </div>
                        )}

                        <StopList stops={stops} onReorder={handleReorder} onDelete={handleDeleteStop} />

                        <div className="grid grid-cols-2 gap-3 mt-6">
                            <button onClick={() => {
                                useToastStore.getState().showToast('🚌 Opening Apple Maps...', 'info');
                                const url = buildAppleMapsUrl(stops);
                                if (url) window.location.href = url;
                            }} disabled={stops.length < 2 || isSaving} className="w-full h-16 rounded-xl bg-surface border border-border-hl text-text-primary text-sm font-semibold flex flex-col items-center justify-center gap-1 hover:bg-border-hl transition-colors disabled:opacity-30">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.05 2.53.81 3.19.81.79 0 2.21-1.01 3.84-.86 1.63.13 3.13.84 4.02 2.11-3.41 1.98-2.88 6.51.35 7.84-.79 1.83-2.09 3.85-3.4 5.07zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.28-1.9 4.2-3.74 4.25z" /></svg>
                                Apple Maps
                            </button>
                            <button onClick={() => {
                                useToastStore.getState().showToast('🚌 Opening Google Maps...', 'info');
                                const url = buildGoogleMapsUrl(stops);
                                if (url) window.location.href = url;
                            }} disabled={stops.length < 2 || isSaving} className="w-full h-16 rounded-xl btn-accent text-sm font-semibold text-black flex flex-col items-center justify-center gap-1 disabled:opacity-30">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" /></svg>
                                Google Maps
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 mt-4">
                            {tripId ? (
                                <>
                                    <button onClick={handleOverwriteCurrent} disabled={stops.length < 2 || isSaving} className="w-full min-h-touch rounded-xl bg-success hover:bg-emerald-600 text-white font-bold text-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                                        {isSaving ? 'Saving...' : 'Overwrite Current'}
                                    </button>
                                    <button onClick={() => setShowSaveModal(true)} disabled={stops.length < 2 || isSaving} className="w-full min-h-touch rounded-xl btn-surface text-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                                        Save as New
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setShowSaveModal(true)} disabled={stops.length < 2 || isSaving} className="w-full min-h-touch rounded-xl bg-success hover:bg-emerald-600 text-white font-bold text-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                                    Save Route
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

            {showSaveModal && (
                <SaveTripModal stops={stops} onClose={() => setShowSaveModal(false)} onSaved={(s) => { setShowSaveModal(false); navigate(`/trips/${s.id}`); }} />
            )}
        </div>
    );
}
