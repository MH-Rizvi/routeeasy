/**
 * StopItem.jsx — Dark enterprise stop item with amber badge.
 */
export default function StopItem({ stop, index, onDelete, dragHandleProps }) {
    return (
        <div className="flex items-center gap-3 card p-3">
            <div {...dragHandleProps} className="flex items-center justify-center w-8 h-8 rounded-lg bg-elevated text-text-muted cursor-grab active:cursor-grabbing shrink-0">
                ⠿
            </div>
            <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/50 text-accent flex items-center justify-center text-xs font-bold font-mono shrink-0">
                {index + 1}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{stop.label}</p>
                {stop.resolved && stop.resolved !== stop.label && (
                    <p className="text-xs text-text-muted truncate">{stop.resolved}</p>
                )}
            </div>
            <button onClick={() => onDelete(index)} className="w-7 h-7 rounded-full bg-danger/10 hover:bg-danger/20 text-danger flex items-center justify-center text-xs shrink-0 transition-colors" aria-label={`Delete stop ${index + 1}`}>
                ✕
            </button>
        </div>
    );
}
