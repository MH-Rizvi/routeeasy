/**
 * MessageBubble.jsx — Dark enterprise chat bubbles.
 * User: elevated surface with amber border. AI: surface with amber left border.
 */
export default function MessageBubble({ role, content, timestamp }) {
    const isUser = role === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-fade-up`}>
            {/* AI avatar */}
            {!isUser && (
                <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mr-2 mt-1 shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" /></svg>
                </div>
            )}

            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser
                    ? 'bg-elevated border border-accent/30 rounded-br-md'
                    : 'bg-surface border-l-2 border-l-accent border border-border rounded-bl-md'
                }`}>
                <p className="text-base text-text-primary whitespace-pre-wrap break-words leading-relaxed">
                    {content}
                </p>
                {timestamp && (
                    <p className={`text-[11px] mt-1.5 font-mono ${isUser ? 'text-text-muted' : 'text-text-muted'}`}>
                        {new Date(timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </p>
                )}
            </div>
        </div>
    );
}
