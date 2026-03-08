/**
 * ChatScreen.jsx — Premium dark enterprise agent chat interface.
 */
import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useChatStore from '../store/chatStore';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import useToastStore from '../store/toastStore';
import Header from '../components/Header';

const PROMPTS = [
    {
        text: 'Morning school run',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
    },
    {
        text: 'My usual Monday route',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    },
    {
        text: 'What did I drive last week?',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    },
    {
        text: 'From depot to Oak Avenue',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg>,
    },
];

export default function ChatScreen() {
    const navigate = useNavigate();
    const { messages, lastRoute, loading, error, sendMessage, clearError, clearPendingStops, resetChat } = useChatStore();
    const scrollRef = useRef(null);

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

    useEffect(() => {
        if (error) {
            useToastStore.getState().showToast(error, 'error');
            clearError();
        }
    }, [error, clearError]);

    const handlePreviewRoute = (stops) => {
        if (!stops) return;
        navigate('/preview', { state: { stops } });
        clearPendingStops();
    };

    return (
        <div className="flex flex-col flex-1 w-full relative animate-page-enter lg:flex-row h-full overflow-hidden">
            {/* ── Desktop Left Panel: Prompts ── */}
            <div className="hidden lg:flex flex-col w-72 shrink-0 h-full overflow-y-auto relative z-10" style={{ background: 'rgba(13,17,23,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                {/* Panel header */}
                <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.15)', boxShadow: '0 0 10px rgba(245,158,11,0.1)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[14px] font-bold text-white/90">RoutAura AI</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        </div>
                    </div>
                    {messages.length > 0 && (
                        <button onClick={resetChat} className="px-2.5 py-1 text-[11px] text-accent font-bold rounded-lg transition-all hover:bg-accent/20 hover:shadow-[0_0_12px_rgba(245,158,11,0.3)]" style={{ border: '1px solid rgba(245,158,11,0.2)' }}>
                            + New Chat
                        </button>
                    )}
                </div>

                {/* Prompt suggestions */}
                <div className="p-4 space-y-1.5 flex-1">
                    <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.15em] mb-3 px-1">Quick prompts</p>
                    {PROMPTS.map((p) => (
                        <button
                            key={p.text}
                            onClick={() => sendMessage(p.text)}
                            className="w-full rounded-xl p-3 text-left transition-all duration-300 group flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-[0_4px_15px_rgba(245,158,11,0.1)] relative overflow-hidden"
                            style={{
                                background: 'rgba(20,26,45,0.4)',
                                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderLeft: '3px solid rgba(245,158,11,0.4)'
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(245,158,11,0.1)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            <span className="shrink-0 text-white/40 group-hover:text-amber-400 transition-colors drop-shadow-[0_0_8px_rgba(245,158,11,0)] group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] relative z-10">{p.icon}</span>
                            <span className="text-white/50 text-[13px] font-medium leading-tight group-hover:text-white/90 transition-colors relative z-10">{p.text}</span>
                        </button>
                    ))}
                </div>

                {/* Bottom tips */}
                <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                    <p className="text-[11px] text-white/20 leading-relaxed">
                        Tip: Describe your stops naturally — the AI finds addresses and optimizes your route.
                    </p>
                </div>
            </div>

            {/* ── Right Panel: Chat Area ── */}
            <div className="flex flex-col flex-1 min-w-0 relative bg-[#0A0F1E]">
                {/* Subtle depth effects */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.04)_0%,transparent_80%)] z-0" />
                <div className="absolute inset-0 pointer-events-none noise-bg mix-blend-overlay opacity-20 z-0" />

                <div className="relative z-10 w-full">
                    <Header
                        rightElement={messages.length > 0 && (
                            <button onClick={resetChat} className="min-h-touch px-3 text-[13px] text-accent font-bold tracking-wide hover:opacity-100 hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.8)] transition-all drop-shadow-md">
                                + New Chat
                            </button>
                        )}
                    />
                </div>

                {/* Messages area — fills all remaining space */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-5 lg:px-8 py-4 flex flex-col relative z-10">
                    {messages.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center h-full text-center animate-fade-up max-w-md mx-auto lg:max-w-lg select-none">
                            {/* Animated gradient orb */}
                            <div className="relative mb-8 group">
                                <div className="absolute -inset-4 rounded-full opacity-40 group-hover:opacity-70 transition-opacity duration-1000" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)', filter: 'blur(20px)' }} />
                                <div
                                    className="w-20 h-20 rounded-2xl flex items-center justify-center relative z-10 transition-transform duration-500 group-hover:scale-105"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(30,41,59,0.5) 100%)',
                                        border: '1px solid rgba(245,158,11,0.2)',
                                        boxShadow: '0 0 30px rgba(245,158,11,0.12), 0 8px 24px rgba(0,0,0,0.3)',
                                    }}
                                >
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="10" r="3" />
                                        <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
                                    </svg>
                                </div>
                            </div>

                            <h2 className="text-[26px] font-bold text-white mb-2 tracking-tight">Where to next?</h2>
                            <p className="text-white/40 mb-8 text-[15px] leading-relaxed max-w-xs">
                                Describe your route in plain language and I'll find the best path.
                            </p>

                            {/* Prompt cards — mobile only */}
                            <div className="grid grid-cols-2 gap-2.5 w-full lg:hidden">
                                {PROMPTS.map((p, i) => (
                                    <button
                                        key={p.text}
                                        onClick={() => sendMessage(p.text)}
                                        className="rounded-xl p-3.5 text-left transition-all duration-300 group flex items-center gap-2.5 hover:-translate-y-0.5 active:scale-[0.98] relative overflow-hidden"
                                        style={{
                                            background: 'rgba(20,26,45,0.4)',
                                            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            borderLeft: '3px solid rgba(245,158,11,0.4)',
                                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                            animationDelay: `${i * 80}ms`,
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(245,158,11,0.1)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                        <span className="text-white/40 group-hover:text-amber-400 transition-colors drop-shadow-[0_0_8px_rgba(245,158,11,0)] group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] relative z-10">{p.icon}</span>
                                        <span className="text-white/60 text-[13px] font-medium leading-tight group-hover:text-white/90 transition-colors relative z-10">
                                            {p.text}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Desktop hint */}
                            <p className="hidden lg:block text-[12px] text-white/20 mt-1">Use prompts on the left or type below</p>
                        </div>
                    )}

                    {messages.length > 0 && (
                        <div className="mt-auto flex flex-col space-y-4">
                            {messages.map((msg) => (
                                <MessageBubble
                                    key={msg.id}
                                    role={msg.role}
                                    content={msg.content}
                                    timestamp={msg.timestamp}
                                    routeStops={msg.routeStops}
                                    onPreviewRoute={() => handlePreviewRoute(msg.routeStops)}
                                />
                            ))}

                            {loading && (
                                <div className="flex justify-start mb-3 animate-fade-up">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2.5 mt-1 shrink-0" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg>
                                    </div>
                                    <div className="rounded-2xl rounded-bl-md px-5 py-3.5" style={{ background: 'linear-gradient(135deg, rgba(20,26,45,0.6) 0%, rgba(13,17,23,0.8) 100%)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                        <div className="typing-dots"><span /><span /><span /></div>
                                        <p className="text-[10px] text-white/25 mt-1.5 font-medium tracking-wide">Mapping route…</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {messages.length === 0 && loading && (
                        <div className="mt-auto flex justify-start mb-3 animate-fade-up">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2.5 mt-1 shrink-0" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg>
                            </div>
                            <div className="rounded-2xl rounded-bl-md px-5 py-3.5" style={{ background: 'linear-gradient(135deg, rgba(20,26,45,0.6) 0%, rgba(13,17,23,0.8) 100%)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div className="typing-dots"><span /><span /><span /></div>
                                <p className="text-[10px] text-white/25 mt-1.5 font-medium tracking-wide">Mapping route…</p>
                            </div>
                        </div>
                    )}

                    <div ref={scrollRef} />
                </div>

                <div className="relative z-10">
                    <ChatInput onSend={sendMessage} loading={loading} />
                </div>
            </div>
        </div>
    );
}
