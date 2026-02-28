/**
 * SaveTripModal.jsx — Dark enterprise save modal.
 */
import { useState } from 'react';
import useTripStore from '../store/tripStore';

export default function SaveTripModal({ stops, onClose, onSaved }) {
    const { saveTrip, loading } = useTripStore();
    const defaultName = stops?.length >= 2 ? `${stops[0].label} → ${stops[stops.length - 1].label}` : 'My Trip';
    const [name, setName] = useState(defaultName);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState(null);

    const handleSave = async () => {
        if (!name.trim()) { setError('Please enter a trip name.'); return; }
        setError(null);
        const tripData = {
            name: name.trim(), notes: notes.trim() || null,
            stops: stops.map((s, i) => ({ label: s.label, resolved: s.resolved, lat: s.lat, lng: s.lng, note: s.note || null, position: i })),
        };
        const saved = await saveTrip(tripData);
        if (saved) onSaved?.(saved);
        else setError('Something went wrong.');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
            <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-card-lg animate-slide-up overflow-hidden">
                <div className="h-1 bg-accent" />
                <div className="p-6">
                    <h2 className="text-xl font-bold text-text-primary mb-4">Save This Trip</h2>

                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Trip Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                        className="w-full min-h-touch rounded-xl border border-border bg-elevated px-4 py-3 text-base text-text-primary placeholder:text-text-muted mb-4"
                        placeholder="e.g. Morning School Run" />

                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Notes (optional)</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                        className="w-full rounded-xl border border-border bg-elevated px-4 py-3 text-base text-text-primary placeholder:text-text-muted mb-4 resize-none"
                        placeholder="Any notes about this route…" />

                    {error && <p className="text-danger text-sm mb-3 animate-fade-up">⚠ {error}</p>}

                    <div className="flex gap-3">
                        <button onClick={onClose} disabled={loading} className="flex-1 min-h-touch rounded-xl btn-surface text-base">Cancel</button>
                        <button onClick={handleSave} disabled={loading} className="flex-1 min-h-touch rounded-xl bg-success hover:bg-emerald-600 text-white font-bold text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <span className="typing-dots"><span /><span /><span /></span> : 'Save Trip'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
