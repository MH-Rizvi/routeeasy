/**
 * ChatInput.jsx — Premium unified input bar with integrated voice & send.
 * Voice mic on the left, text area in the center, send arrow on the right,
 * all inside one cohesive pill container.
 */
import { useState } from 'react';
import VoiceInputButton from './VoiceInputButton';

export default function ChatInput({ onSend, loading = false }) {
    const [text, setText] = useState('');
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [focused, setFocused] = useState(false);

    const handleSubmit = () => {
        const trimmed = text.trim();
        if (!trimmed || loading) return;
        onSend(trimmed);
        setText('');
    };

    const canSend = text.trim() && !loading && !isTranscribing;

    return (
        <div
            className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3"
            style={{
                background: 'linear-gradient(to top, rgba(10,15,30,0.98) 0%, rgba(10,15,30,0.85) 100%)',
                backdropFilter: 'blur(24px)',
            }}
        >
            <div className="max-w-3xl mx-auto">
                {/* ── Unified pill container ── */}
                <div
                    className="flex items-center gap-1 rounded-2xl px-1.5 py-1.5 transition-all duration-300"
                    style={{
                        background: focused
                            ? 'linear-gradient(135deg, rgba(20,26,45,0.95) 0%, rgba(17,24,39,0.95) 100%)'
                            : 'linear-gradient(135deg, rgba(20,26,45,0.8) 0%, rgba(17,24,39,0.8) 100%)',
                        border: focused
                            ? '1px solid rgba(245,158,11,0.35)'
                            : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: focused
                            ? '0 0 20px rgba(245,158,11,0.08), 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)'
                            : '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.02)',
                    }}
                >
                    {/* Mic button — integrated inside the pill */}
                    <VoiceInputButton
                        onTranscript={(t) => setText((p) => p + (p && !p.endsWith(' ') ? ' ' : '') + t)}
                        disabled={loading || isTranscribing}
                        onTranscribing={setIsTranscribing}
                    />

                    {/* Text input */}
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        placeholder={
                            loading ? 'Planning your route…'
                                : isTranscribing ? 'Listening…'
                                    : 'Where do you want to go?'
                        }
                        disabled={loading || isTranscribing}
                        autoComplete="off"
                        className="flex-1 bg-transparent py-2.5 px-2 text-[15px] text-white placeholder:text-white/30 outline-none disabled:opacity-40 min-w-0"
                    />

                    {/* Send button */}
                    <button
                        onClick={handleSubmit}
                        disabled={!canSend}
                        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-20 disabled:scale-95"
                        style={{
                            background: canSend
                                ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                                : 'rgba(245,158,11,0.08)',
                            boxShadow: canSend
                                ? '0 0 16px rgba(245,158,11,0.35), 0 2px 8px rgba(245,158,11,0.2)'
                                : 'none',
                            transform: canSend ? 'scale(1)' : 'scale(0.92)',
                        }}
                        aria-label="Send message"
                    >
                        {loading ? (
                            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={canSend ? '#0A0F1E' : 'rgba(245,158,11,0.5)'}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M5 12h14" />
                                <path d="M12 5l7 7-7 7" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Subtle helper text */}
                <p className="text-[11px] text-white/20 text-center mt-2 font-medium tracking-wide">
                    {isTranscribing ? '🎙️ Recording… tap mic to stop' : 'Describe stops, addresses, or ask about past routes'}
                </p>
            </div>
        </div>
    );
}
