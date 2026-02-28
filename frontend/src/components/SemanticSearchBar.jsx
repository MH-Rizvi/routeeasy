/**
 * SemanticSearchBar.jsx — Dark enterprise search with amber focus ring.
 */
import { useState, useRef, useCallback } from 'react';
import useTripStore from '../store/tripStore';

export default function SemanticSearchBar() {
    const { searchTrips, clearSearch } = useTripStore();
    const [query, setQuery] = useState('');
    const timerRef = useRef(null);

    const handleChange = useCallback((e) => {
        const value = e.target.value;
        setQuery(value);
        clearTimeout(timerRef.current);
        if (!value.trim()) { clearSearch(); return; }
        timerRef.current = setTimeout(() => searchTrips(value.trim()), 300);
    }, [searchTrips, clearSearch]);

    return (
        <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
                type="text" value={query} onChange={handleChange}
                placeholder="Search trips by meaning…"
                className="w-full min-h-touch rounded-xl border border-border bg-surface pl-10 pr-10 py-3 text-base text-text-primary placeholder:text-text-muted"
            />
            {query && (
                <button onClick={() => { setQuery(''); clearSearch(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-border hover:bg-border-hl flex items-center justify-center text-text-muted text-xs transition-colors">
                    ✕
                </button>
            )}
        </div>
    );
}
