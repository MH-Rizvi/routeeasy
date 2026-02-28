/**
 * ChatScreen.jsx — Dark enterprise agent chat interface.
 */
import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useChatStore from '../store/chatStore';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';

const PROMPTS = [
    'Morning school run',
    'My usual Monday route',
    'What did I drive last week?',
    'From depot to Oak Avenue',
];

export default function ChatScreen() {
    const navigate = useNavigate();
    const { messages, lastRoute, loading, error, sendMessage, clearError, clearPendingStops, resetChat } = useChatStore();
    const scrollRef = useRef(null);

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

    const handlePreviewRoute = (stops) => {
        if (!stops) return;
        navigate('/preview', { state: { stops } });
        clearPendingStops();
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border glass-bar">
                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="RouteEasy" className="h-8 w-auto" />
                    <h1 className="text-lg font-bold text-text-primary">Route Assistant</h1>
                </div>
                {messages.length > 0 && (
                    <button onClick={resetChat} className="min-h-touch px-3 text-sm text-accent font-medium hover:underline">
                        New Chat
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {messages.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-up">
                        <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-5">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-text-primary mb-2">Where to?</h2>
                        <p className="text-text-secondary mb-6 max-w-xs text-sm">Describe your route in plain language</p>
                        <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                            {PROMPTS.map((p) => (
                                <button key={p} onClick={() => sendMessage(p)} className="chip min-h-touch px-4 py-2 text-sm">
                                    {p}
                                </button>
                            ))}
                        </div>
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
                        <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mr-2 mt-1">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg>
                        </div>
                        <div className="bg-surface border border-border rounded-2xl rounded-bl-md px-5 py-4">
                            <div className="typing-dots"><span /><span /><span /></div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="card p-3 mb-3 border-danger/30 animate-fade-up">
                        <p className="text-danger text-sm">⚠ {error}</p>
                        <button onClick={clearError} className="text-xs text-accent mt-1 underline min-h-touch">Dismiss</button>
                    </div>
                )}

                <div ref={scrollRef} />
            </div>

            <ChatInput onSend={sendMessage} loading={loading} />
        </div>
    );
}
