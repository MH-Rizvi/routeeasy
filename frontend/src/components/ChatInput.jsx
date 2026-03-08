/**
 * ChatInput.jsx — Premium cockpit-style input bar with magical amber effects.
 * Glowing gradient border, frosted glass, animated send slide-in, typing underline.
 */
import { useState, useRef, useEffect } from 'react';
import VoiceInputButton from './VoiceInputButton';

export default function ChatInput({ onSend, loading = false }) {
    const [text, setText] = useState('');
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [focused, setFocused] = useState(false);
    const inputRef = useRef(null);

    const hasText = text.trim().length > 0;
    const canSend = hasText && !loading && !isTranscribing;

    const handleSubmit = () => {
        const trimmed = text.trim();
        if (!trimmed || loading) return;
        onSend(trimmed);
        setText('');
    };

    return (
        <div className="shrink-0 px-3 sm:px-4 pb-1" style={{ background: 'transparent' }}>
            <div className="max-w-3xl mx-auto">
                {/* ── Outer glow wrapper — provides the ambient light-source effect ── */}
                <div
                    className="relative rounded-2xl transition-all duration-500"
                    style={{
                        transform: focused ? 'translateY(-2px)' : 'translateY(0)',
                    }}
                >
                    {/* Ambient glow beneath the bar */}
                    <div
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full pointer-events-none transition-all duration-700"
                        style={{
                            width: focused ? '80%' : '40%',
                            height: '12px',
                            background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.35) 0%, transparent 70%)',
                            opacity: focused ? 1 : 0.3,
                            filter: 'blur(8px)',
                        }}
                    />

                    {/* ── Gradient border wrapper ── */}
                    <div
                        className="rounded-2xl p-[1px] transition-all duration-500"
                        style={{
                            background: focused
                                ? 'linear-gradient(135deg, rgba(245,158,11,0.6), rgba(251,191,36,0.3), rgba(245,158,11,0.6))'
                                : 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(255,255,255,0.06), rgba(245,158,11,0.15))',
                            animation: !focused ? 'borderPulse 3s ease-in-out infinite' : 'none',
                        }}
                    >
                        {/* ── Glass pill ── */}
                        <div
                            className="relative flex items-center gap-1.5 rounded-[15px] px-1.5 py-1.5 overflow-hidden"
                            style={{
                                background: 'rgba(13,17,23,0.75)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                            }}
                        >
                            {/* Inner top highlight */}
                            <div
                                className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                                style={{
                                    background: 'linear-gradient(90deg, transparent 10%, rgba(245,158,11,0.15) 50%, transparent 90%)',
                                }}
                            />

                            {/* Mic button */}
                            <VoiceInputButton
                                onTranscript={(t) => setText((p) => p + (p && !p.endsWith(' ') ? ' ' : '') + t)}
                                disabled={loading || isTranscribing}
                                onTranscribing={setIsTranscribing}
                            />

                            {/* Text input */}
                            <input
                                ref={inputRef}
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
                                className="chat-input-field flex-1 bg-transparent py-2.5 px-2 text-[15px] text-white outline-none disabled:opacity-40 min-w-0"
                            />

                            {/* Send button — slides in when there's text */}
                            <button
                                onClick={handleSubmit}
                                disabled={!canSend}
                                className="shrink-0 flex items-center justify-center rounded-xl transition-all duration-300 ease-out"
                                style={{
                                    width: hasText || loading ? '40px' : '0px',
                                    height: '40px',
                                    opacity: hasText || loading ? 1 : 0,
                                    marginRight: hasText || loading ? '0px' : '-4px',
                                    overflow: 'hidden',
                                    background: canSend
                                        ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                                        : loading
                                            ? 'rgba(245,158,11,0.15)'
                                            : 'rgba(245,158,11,0.08)',
                                    boxShadow: canSend
                                        ? '0 0 20px rgba(245,158,11,0.4), 0 2px 10px rgba(245,158,11,0.25)'
                                        : 'none',
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

                            {/* Typing underline — animated amber line when user types */}
                            <div
                                className="absolute bottom-0 left-0 h-[2px] rounded-full pointer-events-none transition-all duration-500 ease-out"
                                style={{
                                    width: hasText ? '100%' : '0%',
                                    background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.5), rgba(251,191,36,0.6), rgba(245,158,11,0.5), transparent)',
                                    opacity: hasText ? 1 : 0,
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Helper text */}
                <p className="text-[11px] text-white/20 text-center pt-1.5 pb-0 leading-none font-medium tracking-wide">
                    {isTranscribing ? '🎙️ Recording… tap mic to stop' : 'Describe stops, addresses, or ask about past routes'}
                </p>
            </div>
        </div>
    );
}
