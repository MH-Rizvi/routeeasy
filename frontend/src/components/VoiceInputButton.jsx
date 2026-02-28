/**
 * VoiceInputButton.jsx — Dark enterprise voice input.
 */
import { useState, useRef } from 'react';

export default function VoiceInputButton({ onTranscript, disabled = false }) {
    const [recording, setRecording] = useState(false);
    const recognitionRef = useRef(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const handleToggle = () => {
        if (recording) { recognitionRef.current?.stop(); setRecording(false); return; }
        const r = new SpeechRecognition();
        r.continuous = false; r.interimResults = false; r.lang = 'en-US';
        r.onresult = (e) => { onTranscript(e.results[0][0].transcript); setRecording(false); };
        r.onerror = () => setRecording(false);
        r.onend = () => setRecording(false);
        recognitionRef.current = r;
        r.start();
        setRecording(true);
    };

    return (
        <button onClick={handleToggle} disabled={disabled}
            className={`min-w-touch min-h-touch rounded-xl flex items-center justify-center transition-all ${recording ? 'bg-danger text-white shadow-glow animate-pulse' : 'bg-elevated text-text-muted hover:text-text-secondary border border-border'
                } disabled:opacity-30`}
            aria-label={recording ? 'Stop recording' : 'Start voice input'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {recording
                    ? <rect x="6" y="6" width="12" height="12" rx="2" />
                    : <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></>}
            </svg>
        </button>
    );
}
