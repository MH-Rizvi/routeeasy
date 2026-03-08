/**
 * VoiceInputButton.jsx — Dark enterprise voice input.
 */
import { useState, useRef } from 'react';
import { transcribeVoice } from '../api/client';

export default function VoiceInputButton({ onTranscript, disabled = false, onTranscribing }) {
    const [recording, setRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const handleToggle = async () => {
        if (recording) {
            // Stop recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Prefer mp4 for iOS, webm for others (MediaRecorder determines support)
            let mimeType = 'audio/mp4';
            if (MediaRecorder.isTypeSupported('audio/webm')) {
                mimeType = 'audio/webm';
            }

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.addEventListener('dataavailable', (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            });

            mediaRecorder.addEventListener('stop', async () => {
                setRecording(false);
                if (onTranscribing) onTranscribing(true);

                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

                // Stop microphone tracks completely
                stream.getTracks().forEach(track => track.stop());

                try {
                    const result = await transcribeVoice(audioBlob);
                    if (result && result.text) {
                        onTranscript(result.text + " ");
                    }
                } catch (error) {
                    console.error("Transcription failed", error);
                    alert("Couldn't hear that, please try again.");
                } finally {
                    if (onTranscribing) onTranscribing(false);
                }
            });

            mediaRecorder.start();
            setRecording(true);
        } catch (err) {
            console.error('Microphone error:', err);
            alert("Microphone access is required for voice input.");
        }
    };

    return (
        <button onClick={handleToggle} disabled={disabled}
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${recording
                ? 'text-white animate-pulse'
                : 'text-white/40 hover:text-white/70'
                } disabled:opacity-20`}
            style={recording
                ? { background: 'rgba(239,68,68,0.2)', boxShadow: '0 0 12px rgba(239,68,68,0.3)' }
                : { background: 'rgba(255,255,255,0.04)' }
            }
            aria-label={recording ? 'Stop recording' : 'Start voice input'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {recording
                    ? <rect x="6" y="6" width="12" height="12" rx="2" />
                    : <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></>}
            </svg>
        </button>
    );
}
