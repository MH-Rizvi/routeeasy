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
    { text: 'Morning school run', icon: '🏫' },
    { text: 'My usual Monday route', icon: '📅' },
    { text: 'What did I drive last week?', icon: '🔍' },
    { text: 'From depot to Oak Avenue', icon: '📍' },
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
            <div className="hidden lg:flex flex-col w-72 shrink-0 h-full overflow-y-auto" style={{ background: 'linear-gradient(180deg, #0C1120 0%, #0A0F1E 100%)', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                {/* Panel header */}
                <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.15)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg>
                        </div>
                        <span className="text-[14px] font-bold text-white/90">Route AI</span>
                    </div>
                    {messages.length > 0 && (
                        <button onClick={resetChat} className="px-2.5 py-1 text-[11px] text-accent font-bold rounded-lg transition-all hover:bg-accent/10" style={{ border: '1px solid rgba(245,158,11,0.15)' }}>
                            + New
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
                            className="w-full rounded-xl p-3 text-left transition-all duration-200 group flex items-center gap-3 hover:bg-white/[0.03]"
                            style={{ border: '1px solid transparent' }}
                        >
                            <span className="text-[14px] shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">{p.icon}</span>
                            <span className="text-white/50 text-[13px] font-medium leading-tight group-hover:text-white/80 transition-colors">{p.text}</span>
                        </button>
                    ))}
                </div>

                {/* Bottom tips */}
                <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                    <p className="text-[11px] text-white/20 leading-relaxed">
                        💡 Tip: Describe your stops naturally — the AI finds addresses and optimizes your route.
                    </p>
                </div>
            </div>

            {/* ── Right Panel: Chat Area ── */}
            <div className="flex flex-col flex-1 min-w-0 relative">
                <Header
                    rightElement={messages.length > 0 && (
                        <button onClick={resetChat} className="min-h-touch px-3 text-sm text-accent font-bold tracking-wide hover:opacity-80 transition-opacity drop-shadow-md">
                            New Chat
                        </button>
                    )}
                />

                {/* Messages area — fills all remaining space */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-5 lg:px-8 py-4">
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
                                        className="rounded-xl p-3.5 text-left transition-all duration-300 group flex items-center gap-2.5 hover:-translate-y-0.5 active:scale-[0.98]"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(20,26,45,0.6) 0%, rgba(13,17,23,0.8) 100%)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            animationDelay: `${i * 80}ms`,
                                        }}
                                    >
                                        <span className="text-[16px] opacity-60">{p.icon}</span>
                                        <span className="text-white/60 text-[13px] font-medium leading-tight group-hover:text-white/90 transition-colors">
                                            {p.text}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Desktop hint */}
                            <p className="hidden lg:block text-[12px] text-white/20 mt-1">Use prompts on the left or type below</p>
                        </div>
                    )}

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
                            <div className="rounded-2xl rounded-bl-md px-5 py-4" style={{ background: 'linear-gradient(135deg, rgba(20,26,45,0.6) 0%, rgba(13,17,23,0.8) 100%)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div className="typing-dots"><span /><span /><span /></div>
                            </div>
                        </div>
                    )}

                    <div ref={scrollRef} />
                </div>

                {/* Input bar — snaps to bottom, no blank space */}
                <ChatInput onSend={sendMessage} loading={loading} />
            </div>
        </div>
    );
}
