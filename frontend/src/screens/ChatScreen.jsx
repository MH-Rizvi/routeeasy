/**
 * ChatScreen.jsx — Dark enterprise agent chat interface.
 */
import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useChatStore from '../store/chatStore';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import useToastStore from '../store/toastStore';
import Header from '../components/Header';

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
        <div className="flex flex-col h-full">
            <Header
                rightElement={messages.length > 0 && (
                    <button onClick={resetChat} className="min-h-touch px-3 text-sm text-accent font-bold tracking-wide hover:opacity-80 transition-opacity drop-shadow-md">
                        New Chat
                    </button>
                )}
            />

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 pb-24">
                {messages.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-up">
                        <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-5">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                        </div>
                        <h2 className="text-[26px] font-bold text-white mb-2">Where to?</h2>
                        <p className="text-[#6B7280] mb-6 max-w-xs text-[14px]">Describe your route in plain language</p>
                        <div className="grid grid-cols-2 gap-[10px] max-w-sm w-full px-2">
                            {PROMPTS.map((p) => (
                                <button
                                    key={p}
                                    onClick={() => sendMessage(p)}
                                    className="bg-[#111827] border border-[#F59E0B] rounded-[20px] px-4 py-2.5 text-[#F59E0B] text-[14px] text-center transition-colors active:bg-[#F59E0B]/10"
                                >
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

                <div ref={scrollRef} />
            </div>

            <ChatInput onSend={sendMessage} loading={loading} />
        </div>
    );
}
