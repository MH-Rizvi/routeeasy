/**
 * MessageBubble.jsx — Dark enterprise chat bubbles.
 * User: elevated surface with amber border. AI: surface with amber left border.
 */
export default function MessageBubble({ role, content, timestamp, routeStops, onPreviewRoute }) {
    const isUser = role === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-fade-up`}>
            {/* AI avatar */}
            {!isUser && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2 mt-1 shrink-0" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', boxShadow: '0 0 8px rgba(245,158,11,0.15)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg>
                </div>
            )}

            <div className={`max-w-[80%] rounded-2xl px-4 py-3 relative ${isUser
                ? 'rounded-br-[4px]'
                : 'rounded-bl-[4px]'
                }`}
                style={isUser
                    ? {
                        background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                        boxShadow: '0 4px 15px rgba(245,158,11,0.08)'
                    }
                    : {
                        background: 'rgba(13,17,23,0.6)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderLeft: '3px solid rgba(245,158,11,0.6)',
                        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }
                }
            >
                <p className="text-base text-text-primary whitespace-pre-wrap break-words leading-relaxed">
                    {isUser ? content : content.replace(/\s*\(-?\d+\.?\d*,\s*-?\d+\.?\d*\)\s*/g, ' ').trim()}
                </p>
                {timestamp && (
                    <p className={`text-[11px] mt-1.5 font-mono ${isUser ? 'text-text-muted' : 'text-text-muted'}`}>
                        {new Date(timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </p>
                )}
                {routeStops && routeStops.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                        <button
                            onClick={onPreviewRoute}
                            className="w-full min-h-touch rounded-xl text-[#F59E0B] font-bold text-sm flex items-center justify-center gap-2 transition-all py-2.5"
                            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', boxShadow: '0 0 15px rgba(245,158,11,0.1)' }}>
                            🗺️ Preview Route
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
