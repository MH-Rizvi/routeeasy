/**
 * LandingPage.jsx — Premium landing page with auto-playing agent demo.
 * RoutAura: AI-powered route planning for drivers.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
    MapPin, Zap, Clock, Brain, Search, Shield, BarChart3,
    ChevronDown, ArrowRight, Star, Menu, X, MessageSquare,
    Navigation, Globe, Truck
} from 'lucide-react';


/* ──────────────────────────────────────────────
   SCROLL ANIMATION WRAPPER (Intersection Observer)
   ────────────────────────────────────────────── */
function RevealOnScroll({ children, className = '', delay = 0 }) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            setIsVisible(true);
            return;
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(el);
                }
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );
        observer.observe(el);
        return () => { if (el) observer.unobserve(el); };
    }, []);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const effectiveDelay = isMobile ? Math.min(delay, 100) : delay;

    return (
        <div
            ref={ref}
            className={`reveal-base reveal-fade-up ${isVisible ? 'is-revealed' : ''} ${className}`}
            style={{ transitionDelay: `${effectiveDelay}ms` }}
        >
            {children}
        </div>
    );
}


/* ──────────────────────────────────────────────
   COUNT-UP NUMBER (Intersection Observer trigger)
   ────────────────────────────────────────────── */
function CountUpNumber({ target, suffix = '', duration = 1500 }) {
    const [count, setCount] = useState(0);
    const [started, setStarted] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started) {
                    setStarted(true);
                    observer.unobserve(el);
                }
            },
            { threshold: 0.3 }
        );
        observer.observe(el);
        return () => { if (el) observer.unobserve(el); };
    }, [started]);

    useEffect(() => {
        if (!started) return;
        const steps = 40;
        const increment = target / steps;
        let current = 0;
        const interval = setInterval(() => {
            current += increment;
            if (current >= target) {
                setCount(target);
                clearInterval(interval);
            } else {
                setCount(Math.floor(current));
            }
        }, duration / steps);
        return () => clearInterval(interval);
    }, [started, target, duration]);

    return <span ref={ref}>{count}{suffix}</span>;
}


/* ──────────────────────────────────────────────
   AUTO-PLAYING AGENT DEMO CHAT WIDGET
   ────────────────────────────────────────────── */
function AutoDemoChat() {
    const [messages, setMessages] = useState([]);
    const [thinkingText, setThinkingText] = useState('');
    const [showTyping, setShowTyping] = useState(false);
    const [showLaunchBtn, setShowLaunchBtn] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const scrollRef = useRef(null);
    const timeoutRefs = useRef([]);

    const clearAllTimeouts = useCallback(() => {
        timeoutRefs.current.forEach(id => clearTimeout(id));
        timeoutRefs.current = [];
    }, []);

    const addTimeout = useCallback((fn, ms) => {
        const id = setTimeout(fn, ms);
        timeoutRefs.current.push(id);
        return id;
    }, []);

    const runSequence = useCallback(() => {
        setMessages([]);
        setThinkingText('');
        setShowTyping(false);
        setShowLaunchBtn(false);
        setShowToast(false);
        setIsResetting(false);

        // [0ms] User bubble
        addTimeout(() => {
            setMessages([{ role: 'user', content: 'Do my usual morning school run' }]);
        }, 400);

        // [800ms] Typing indicator
        addTimeout(() => {
            setShowTyping(true);
        }, 1200);

        // [1800ms] Thinking pill 1
        addTimeout(() => {
            setShowTyping(false);
            setThinkingText('🔍 Searching saved trips...');
        }, 2200);

        // [2800ms] Thinking pill 2
        addTimeout(() => {
            setThinkingText('📍 Geocoding stops...');
        }, 3200);

        // [3800ms] Agent bubble with stops
        addTimeout(() => {
            setThinkingText('');
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Found your Morning School Run! Geocoding 4 stops...\n\n✓ St Mary's Primary School, Oak Ave, NY\n✓ Riverside Community Centre, NY\n✓ Depot Yard, Industrial Estate, NY\n✓ Elmwood Park & Ride, NY`
            }]);
        }, 4200);

        // [5200ms] Launch button
        addTimeout(() => {
            setShowLaunchBtn(true);
        }, 5600);

        // [6500ms] Success toast
        addTimeout(() => {
            setShowToast(true);
        }, 6900);

        // [9500ms] Fade out and restart
        addTimeout(() => {
            setIsResetting(true);
        }, 9900);

        addTimeout(() => {
            runSequence();
        }, 11400);
    }, [addTimeout]);

    useEffect(() => {
        runSequence();
        return () => clearAllTimeouts();
    }, [runSequence, clearAllTimeouts]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, showTyping, thinkingText, showLaunchBtn]);

    return (
        <div className={`w-full max-w-[420px] mx-auto lg:mx-0 rounded-2xl border border-white/[0.08] bg-[#1E293B]/90 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.5),0_0_40px_rgba(245,158,11,0.08)] overflow-hidden flex flex-col transition-opacity duration-700 ${isResetting ? 'opacity-0' : 'opacity-100'}`} style={{ height: '380px' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center overflow-hidden shadow-lg shadow-amber-500/10">
                    <img src="/logo3_nobg.png" alt="AI Agent" className="w-[140%] h-[140%] max-w-none object-cover rounded-full" />
                </div>
                <div>
                    <p className="text-white text-[13px] font-semibold tracking-tight">RoutAura AI Agent</p>
                    <p className="text-emerald-400 text-[11px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                        Online
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 hide-scrollbar">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}>
                        <div className={`max-w-[90%] px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                            ? 'bg-amber-600 text-white rounded-br-md'
                            : 'bg-white/[0.06] text-white/90 rounded-bl-md border border-white/[0.06]'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}

                {/* Thinking pill */}
                {thinkingText && (
                    <div className="flex justify-start animate-fade-up">
                        <div className="px-3.5 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[12px] font-medium animate-pulse">
                            {thinkingText}
                        </div>
                    </div>
                )}

                {/* Typing indicator */}
                {showTyping && (
                    <div className="flex justify-start animate-fade-up">
                        <div className="bg-white/[0.06] border border-white/[0.06] px-4 py-3 rounded-2xl rounded-bl-md">
                            <div className="flex gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-typing-dot" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-typing-dot" style={{ animationDelay: '200ms' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-typing-dot" style={{ animationDelay: '400ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Launch button */}
                {showLaunchBtn && (
                    <div className="flex justify-start animate-fade-up">
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white text-[12px] font-bold shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all">
                            🗺 Open in Google Maps →
                        </button>
                    </div>
                )}
            </div>

            {/* Toast */}
            {showToast && (
                <div className="absolute top-14 right-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium px-3 py-1.5 rounded-lg animate-fade-up">
                    ✓ Route saved to your library
                </div>
            )}
        </div>
    );
}


/* ──────────────────────────────────────────────
   STEP 1 ANIMATION — Chat input flow
   ────────────────────────────────────────────── */
function StepOneAnimation() {
    const FULL_TEXT = 'Do my usual morning school run...';
    const [phase, setPhase] = useState('waiting');   // waiting | typing | done
    const [charIdx, setCharIdx] = useState(0);
    const [showConfirm, setShowConfirm] = useState(false);

    /* waiting → typing transition (runs every time phase becomes 'waiting') */
    useEffect(() => {
        if (phase !== 'waiting') return;
        const id = setTimeout(() => setPhase('typing'), 1200);
        return () => clearTimeout(id);
    }, [phase]);

    /* typing phase — advance chars */
    useEffect(() => {
        if (phase !== 'typing') return;
        if (charIdx >= FULL_TEXT.length) {
            setPhase('done');
            return;
        }
        const id = setTimeout(() => setCharIdx(c => c + 1), 55);
        return () => clearTimeout(id);
    }, [phase, charIdx]);

    /* done phase — show confirm then loop */
    useEffect(() => {
        if (phase !== 'done') return;
        const ids = [];
        ids.push(setTimeout(() => setShowConfirm(true), 400));
        ids.push(setTimeout(() => {
            setPhase('waiting');
            setCharIdx(0);
            setShowConfirm(false);
        }, 2400));
        return () => ids.forEach(clearTimeout);
    }, [phase]);

    return (
        <div className="min-h-[12rem] w-full rounded-xl bg-[#0D1117] border border-white/[0.06] p-3 flex flex-col gap-2 overflow-hidden mt-3">
            {/* Waiting text */}
            {phase === 'waiting' && (
                <p className="text-white/30 text-[11px]" style={{ animation: 'hiw-fade-in 0.5s ease' }}>
                    Waiting for your route...
                </p>
            )}

            {/* Input box */}
            {(phase === 'typing' || phase === 'done') && (
                <div className="rounded-lg border border-amber-500/30 bg-[#1E293B] px-3 py-2" style={{ boxShadow: '0 0 12px rgba(245,158,11,0.08)' }}>
                    <span className="font-mono text-[12px] text-amber-300/90">
                        {FULL_TEXT.slice(0, charIdx)}
                    </span>
                    {phase === 'typing' && (
                        <span className="inline-block w-[2px] h-[14px] bg-amber-400 align-middle ml-[1px] rounded-sm" style={{ animation: 'hiw-blink 0.7s step-end infinite' }} />
                    )}
                </div>
            )}

            {/* Listening indicator */}
            {phase === 'typing' && (
                <div className="flex items-center gap-1.5 mt-1" style={{ animation: 'hiw-fade-in 0.4s ease' }}>
                    <span className="w-[6px] h-[6px] rounded-full bg-amber-400" style={{ animation: 'hiw-dot-pulse 1.2s ease-in-out infinite' }} />
                    <span className="text-[10px] text-amber-400/60">RoutAura AI is listening...</span>
                </div>
            )}

            {/* Confirmation */}
            {showConfirm && (
                <div className="flex items-center gap-1.5 mt-auto" style={{ animation: 'hiw-fade-in 0.5s ease' }}>
                    <span className="text-emerald-400 text-[12px] font-medium">✓ Message received</span>
                </div>
            )}
        </div>
    );
}


/* ──────────────────────────────────────────────
   STEP 2 ANIMATION — Agent reasoning flow
   ────────────────────────────────────────────── */
function StepTwoAnimation() {
    const ADDRESSES = [
        "St Mary's Primary School, Oak Ave, NY",
        'Riverside Community Centre, NY',
        'Home Depot, Syosset, NY',
    ];
    const [pillText, setPillText] = useState('');
    const [visibleRows, setVisibleRows] = useState(0);
    const [barFill, setBarFill] = useState(false);
    const timeouts = useRef([]);

    const enqueue = useCallback((fn, ms) => {
        const id = setTimeout(fn, ms);
        timeouts.current.push(id);
        return id;
    }, []);

    const reset = useCallback(() => {
        timeouts.current.forEach(clearTimeout);
        timeouts.current = [];
        setPillText('');
        setVisibleRows(0);
        setBarFill(false);
    }, []);

    useEffect(() => {
        let cancelled = false;
        function run() {
            reset();
            enqueue(() => { if (!cancelled) setPillText('🔍 Searching saved trips...'); }, 200);
            enqueue(() => { if (!cancelled) setPillText('📍 Geocoding stops...'); }, 1000);
            enqueue(() => { if (!cancelled) setVisibleRows(1); }, 1800);
            enqueue(() => { if (!cancelled) setVisibleRows(2); }, 2100);
            enqueue(() => { if (!cancelled) setVisibleRows(3); }, 2400);
            enqueue(() => { if (!cancelled) setBarFill(true); }, 3200);
            enqueue(() => { if (!cancelled) { run(); } }, 5000);
        }
        run();
        return () => { cancelled = true; reset(); };
    }, [enqueue, reset]);

    return (
        <div className="min-h-[12rem] w-full rounded-xl bg-[#0D1117] border border-white/[0.06] p-3 flex flex-col gap-2 overflow-hidden mt-3">
            {/* Pill */}
            {pillText && (
                <div className="inline-flex self-start px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium"
                    style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
                    {pillText}
                </div>
            )}

            {/* Address rows */}
            <div className="flex flex-col gap-1.5 mt-1">
                {ADDRESSES.map((addr, i) => (
                    i < visibleRows && (
                        <div key={i} className="flex items-start gap-2 text-[11px]"
                            style={{ animation: 'hiw-slide-left 0.35s ease both' }}>
                            <span className="text-emerald-400 shrink-0">✓</span>
                            <span className="text-white/70">{addr}</span>
                        </div>
                    )
                ))}
            </div>

            {/* Progress bar */}
            {barFill && (
                <div className="mt-auto">
                    <div className="w-full h-[6px] rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-amber-500" style={{ animation: 'hiw-bar-fill 1.2s ease forwards' }} />
                    </div>
                    <p className="text-amber-400/70 text-[10px] text-right mt-1" style={{ animation: 'hiw-fade-in 0.6s ease 0.8s both' }}>100%</p>
                </div>
            )}
        </div>
    );
}


/* ──────────────────────────────────────────────
   STEP 3 ANIMATION — Navigation launch flow
   ────────────────────────────────────────────── */
function StepThreeAnimation() {
    const [showSummary, setShowSummary] = useState(false);
    const [showButtons, setShowButtons] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [showRing, setShowRing] = useState(false);
    const timeouts = useRef([]);

    const enqueue = useCallback((fn, ms) => {
        const id = setTimeout(fn, ms);
        timeouts.current.push(id);
        return id;
    }, []);

    const reset = useCallback(() => {
        timeouts.current.forEach(clearTimeout);
        timeouts.current = [];
        setShowSummary(false);
        setShowButtons(false);
        setShowToast(false);
        setShowRing(false);
    }, []);

    useEffect(() => {
        let cancelled = false;
        function run() {
            reset();
            enqueue(() => { if (!cancelled) setShowSummary(true); }, 200);
            enqueue(() => { if (!cancelled) setShowButtons(true); }, 1000);
            enqueue(() => { if (!cancelled) setShowToast(true); }, 2000);
            enqueue(() => { if (!cancelled) setShowRing(true); }, 3000);
            enqueue(() => { if (!cancelled) setShowRing(false); }, 3800);
            enqueue(() => { if (!cancelled) run(); }, 4800);
        }
        run();
        return () => { cancelled = true; reset(); };
    }, [enqueue, reset]);

    /* Simple SVG route line */
    const routeSvg = (
        <svg width="100%" height="24" viewBox="0 0 160 24" fill="none" className="mt-2 mb-1">
            <line x1="20" y1="12" x2="140" y2="12" stroke="rgba(245,158,11,0.3)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="20" cy="12" r="5" fill="#F59E0B" />
            <circle cx="80" cy="12" r="5" fill="#F59E0B" />
            <circle cx="140" cy="12" r="5" fill="#F59E0B" />
        </svg>
    );

    return (
        <div className="min-h-[12rem] w-full rounded-xl bg-[#0D1117] border border-white/[0.06] p-3 flex flex-col gap-2 overflow-hidden mt-3 relative">
            {/* Route summary card */}
            {showSummary && (
                <div className="rounded-lg border border-white/[0.08] bg-[#1E293B] p-3" style={{ animation: 'hiw-fade-in 0.4s ease' }}>
                    <p className="text-white/80 text-[12px] font-semibold">3 stops · 12.4 miles</p>
                    {routeSvg}
                </div>
            )}

            {/* Buttons */}
            {showButtons && (
                <div className="flex gap-2 mt-1" style={{ animation: 'hiw-fade-in 0.4s ease' }}>
                    <div className="flex-1 text-center py-2 rounded-lg text-[11px] font-bold text-white/80 border border-white/[0.1] bg-white/[0.04] backdrop-blur-sm" style={{ minWidth: 0, minHeight: 0 }}>
                        Apple Maps
                    </div>
                    <div className="flex-1 text-center py-2 rounded-lg text-[11px] font-bold text-[#0D1117] bg-amber-500 relative overflow-visible" id="hiw-gmaps-btn" style={{ minWidth: 0, minHeight: 0 }}>
                        Google Maps
                        {showRing && (
                            <span className="absolute inset-0 rounded-lg border-2 border-amber-400 pointer-events-none"
                                style={{ animation: 'hiw-pulse-ring 0.8s ease-out forwards' }} />
                        )}
                    </div>
                </div>
            )}

            {/* Success toast */}
            {showToast && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[11px] font-medium whitespace-nowrap"
                    style={{ animation: 'hiw-slide-top 0.4s ease', minWidth: 0, minHeight: 0 }}>
                    ✓ Navigation launched!
                </div>
            )}
        </div>
    );
}


/* ──────────────────────────────────────────────
   FAQ ACCORDION ITEM
   ────────────────────────────────────────────── */
function FAQItem({ q, a, isOpen, onToggle }) {
    return (
        <div className={`rounded-2xl border transition-all duration-300 ${isOpen ? 'border-amber-500/30 bg-white/[0.03]' : 'border-white/[0.06] bg-white/[0.01] hover:border-amber-500/20 hover:bg-white/[0.02]'}`}>
            <button onClick={onToggle} className="w-full flex items-center justify-between p-5 sm:p-6 text-left group">
                <span className={`text-[15px] sm:text-[16px] font-medium pr-4 transition-colors ${isOpen ? 'text-amber-400' : 'text-white group-hover:text-amber-400'}`}>{q}</span>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${isOpen ? 'bg-amber-500/15 rotate-180' : 'bg-white/[0.05] group-hover:bg-amber-500/10'}`}>
                    <ChevronDown className="w-4 h-4 text-amber-400 transition-transform duration-300" />
                </div>
            </button>
            <div className={`overflow-hidden transition-all duration-500 ${isOpen ? 'max-h-48 pb-5 px-5 sm:px-6 opacity-100' : 'max-h-0 px-5 sm:px-6 opacity-0'}`}>
                <p className="text-white/50 text-[14px] leading-relaxed">{a}</p>
            </div>
        </div>
    );
}


/* ──────────────────────────────────────────────
   ANIMATED ROAD BACKGROUND — Road network with vehicles
   ────────────────────────────────────────────── */
function AnimatedRoadBackground() {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return null;

    /*
     * Layout: 4 curving highway paths across the viewport.
     * Each road has: a subtle road surface, dashed lane-markings,
     * and 1-2 vehicle silhouettes travelling along it.
     */
    const roads = [
        { d: 'M -80 180 C 250 140, 500 320, 780 260 S 1100 120, 1400 220 S 1700 340, 2000 200', len: 2200 },
        { d: 'M -60 480 C 180 430, 400 580, 640 510 S 900 370, 1150 470 S 1450 590, 2000 440', len: 2150 },
        { d: 'M 2000 140 C 1680 190, 1380 80, 1060 170 S 680 310, 380 200 S 80 90, -80 160', len: 2250 },
        { d: 'M -60 780 C 220 730, 480 870, 720 800 S 1000 670, 1280 770 S 1580 880, 2000 740', len: 2100 },
    ];

    /* Vehicle configs: pathIndex, duration, delay, type (car|truck), direction */
    const vehicles = [
        { pi: 0, dur: 14, del: 0, type: 'car' },
        { pi: 0, dur: 18, del: 5, type: 'truck' },
        { pi: 1, dur: 16, del: 1, type: 'car' },
        { pi: 1, dur: 20, del: 8, type: 'car' },
        { pi: 2, dur: 15, del: 2, type: 'truck' },
        { pi: 2, dur: 19, del: 7, type: 'car' },
        { pi: 3, dur: 17, del: 3, type: 'car' },
        { pi: 3, dur: 22, del: 10, type: 'truck' },
    ];

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                pointerEvents: 'none',
            }}
        >
            <svg
                viewBox="0 0 1920 1080"
                preserveAspectRatio="xMidYMid slice"
                style={{ width: '100%', height: '100%' }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {/* Headlight glow filter */}
                    <filter id="headlight-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    {/* Intersection pattern */}
                    <pattern id="road-grid" width="120" height="120" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="0" x2="0" y2="120" stroke="rgba(245,158,11,0.03)" strokeWidth="1" />
                        <line x1="0" y1="0" x2="120" y2="0" stroke="rgba(245,158,11,0.03)" strokeWidth="1" />
                    </pattern>
                </defs>

                {/* Faint city grid underneath */}
                <rect width="100%" height="100%" fill="url(#road-grid)" />

                <style>{`
                    @keyframes road-dash-scroll {
                        to { stroke-dashoffset: -40; }
                    }
                    @keyframes vehicle-pulse {
                        0%, 100% { opacity: 0.5; }
                        50% { opacity: 0.9; }
                    }
                `}</style>

                {/* Roads */}
                {roads.map((road, i) => (
                    <g key={`road-${i}`}>
                        {/* Road surface (wide, very faint) */}
                        <path
                            d={road.d}
                            fill="none"
                            stroke="rgba(245, 158, 11, 0.04)"
                            strokeWidth="18"
                            strokeLinecap="round"
                        />
                        {/* Lane-marking dashes — animated scroll */}
                        <path
                            d={road.d}
                            fill="none"
                            stroke="rgba(245, 158, 11, 0.12)"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeDasharray="12 28"
                            style={{
                                animation: `road-dash-scroll ${3 + i * 0.5}s linear infinite`,
                            }}
                        />
                    </g>
                ))}

                {/* Vehicles */}
                {vehicles.map((v, i) => {
                    const isTruck = v.type === 'truck';
                    return (
                        <g key={`v-${i}`} style={{ animation: 'vehicle-pulse 3s ease-in-out infinite', animationDelay: `${v.del}s` }}>
                            {/* Vehicle body */}
                            <rect
                                x={isTruck ? -10 : -6}
                                y="-3"
                                width={isTruck ? 20 : 12}
                                height="6"
                                rx="2"
                                fill={isTruck ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255, 255, 255, 0.25)'}
                            >
                                <animateMotion
                                    dur={`${v.dur}s`}
                                    repeatCount="indefinite"
                                    begin={`${v.del}s`}
                                    rotate="auto"
                                    path={roads[v.pi].d}
                                />
                            </rect>
                            {/* Headlight glow */}
                            <circle
                                r="4"
                                fill="rgba(245, 158, 11, 0.25)"
                                filter="url(#headlight-glow)"
                            >
                                <animateMotion
                                    dur={`${v.dur}s`}
                                    repeatCount="indefinite"
                                    begin={`${v.del}s`}
                                    rotate="auto"
                                    path={roads[v.pi].d}
                                />
                            </circle>
                        </g>
                    );
                })}

                {/* Subtle intersection crosshairs */}
                {[
                    { x: 640, y: 380 }, { x: 1150, y: 280 },
                    { x: 380, y: 680 }, { x: 900, y: 520 },
                ].map((pt, i) => (
                    <g key={`int-${i}`} opacity="0.08">
                        <line x1={pt.x - 20} y1={pt.y} x2={pt.x + 20} y2={pt.y} stroke="#F59E0B" strokeWidth="1" />
                        <line x1={pt.x} y1={pt.y - 20} x2={pt.x} y2={pt.y + 20} stroke="#F59E0B" strokeWidth="1" />
                        <circle cx={pt.x} cy={pt.y} r="3" fill="none" stroke="#F59E0B" strokeWidth="0.8" />
                    </g>
                ))}
            </svg>
        </div>
    );
}


/* ──────────────────────────────────────────────
   MAIN LANDING PAGE
   ────────────────────────────────────────────── */
export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [openFaq, setOpenFaq] = useState(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const NAV_LINKS = [
        { label: 'How it Works', href: '#how-it-works' },
        { label: 'Features', href: '#features' },
        { label: 'FAQ', href: '#faq' },
    ];

    const FAQ_DATA = [
        { q: 'Is RoutAura free to use?', a: 'Yes, completely free. No credit card required. Sign up and start planning routes in under 2 minutes.' },
        { q: 'Does it work on my phone?', a: 'Yes. RoutAura is a Progressive Web App (PWA) optimised for iOS Safari and Android Chrome. Add it to your home screen for a native app experience.' },
        { q: 'Do I need to type exact addresses?', a: 'No. That\'s the whole point. Say "the co-op", "main school", or "morning run" and the AI figures out the rest using your saved location history.' },
        { q: 'What if I drive the same route every day?', a: 'Save it once, re-launch it with one tap. The agent recognises "do my usual run" and retrieves the right route automatically via semantic search.' },
        { q: 'How is this different from just using Google Maps?', a: 'Google Maps has no memory of your routes, no natural language input, and forces you to re-enter every stop manually every single day. RoutAura remembers everything.' },
        { q: 'Is my data private?', a: 'Yes. All your trips and stops are isolated to your account using Supabase PostgreSQL with per-user data partitioning. No data is shared between users.' },
    ];

    return (
        <div className="min-h-screen bg-[#0D1117] text-[#F8FAFC] overflow-x-hidden">

            {/* Animated SVG road background */}
            <AnimatedRoadBackground />


            {/* ═══════════════════════════════════════
                SECTION 1: NAVBAR
               ═══════════════════════════════════════ */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#0D1117]/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.3)]' : 'bg-transparent'}`} style={{ borderBottom: scrolled ? '1px solid rgba(245,158,11,0.12)' : '1px solid transparent', paddingTop: 'env(safe-area-inset-top)' }}>
                <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 sm:h-[72px] flex items-center justify-between">
                    {/* Logo */}
                    <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-2.5 group shrink-0">
                        <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-[#1E293B]/80 group-hover:scale-105 group-hover:border-amber-500/40 transition-all duration-300">
                            <img src="/logo3_nobg.png" alt="RoutAura" className="w-[140%] h-[140%] max-w-none object-cover rounded-full" />
                        </div>
                        <span className="text-[#F59E0B] font-bold text-lg tracking-tight">RoutAura</span>
                    </a>

                    {/* Desktop — Centered glass pill nav */}
                    <div className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.07] backdrop-blur-md shadow-[0_2px_20px_rgba(0,0,0,0.15)]">
                        {NAV_LINKS.map(link => (
                            <a key={link.href} href={link.href} className="relative px-4 py-2 text-white/55 hover:text-white text-[13px] font-medium transition-all duration-200 rounded-full hover:bg-white/[0.06] group" style={{ minWidth: 0, minHeight: 0 }}>
                                {link.label}
                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-amber-400 rounded-full group-hover:w-4 transition-all duration-300" />
                            </a>
                        ))}
                        <div className="w-px h-5 bg-white/[0.1] mx-1" />
                        <a href="/login" className="px-4 py-2 text-white/55 hover:text-white text-[13px] font-medium transition-all duration-200 rounded-full hover:bg-white/[0.06]" style={{ minWidth: 0, minHeight: 0 }}>Sign In</a>
                        <a href="/signup" className="ml-1 px-5 py-2 rounded-full bg-[#F59E0B] text-[#0D1117] text-[13px] font-bold hover:bg-amber-400 transition-all duration-200 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.25)]" style={{ minWidth: 0, minHeight: 0 }}>Get Started</a>
                    </div>

                    {/* Mobile hamburger */}
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile menu dropdown */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-[#0D1117]/95 backdrop-blur-xl border-t border-white/[0.06] animate-fade-up">
                        <div className="max-w-6xl mx-auto px-5 py-4 flex flex-col gap-3">
                            {NAV_LINKS.map(link => (
                                <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="text-white/60 hover:text-white text-[14px] font-medium py-2 transition-colors">{link.label}</a>
                            ))}
                            <div className="border-t border-white/[0.06] pt-3 mt-1 flex flex-col gap-2">
                                <a href="/login" className="text-white/60 hover:text-white text-[14px] font-medium py-2 transition-colors">Sign In</a>
                                <a href="/signup" className="inline-block text-center px-5 py-3 rounded-xl bg-[#F59E0B] text-[#0D1117] text-[14px] font-bold hover:brightness-110 transition-all">Get Started Free</a>
                            </div>
                        </div>
                    </div>
                )}
            </nav>


            {/* ═══════════════════════════════════════
                SECTION 2: HERO
               ═══════════════════════════════════════ */}
            <section className="relative z-[1] pt-28 sm:pt-36 lg:pt-40 pb-16 lg:pb-24 px-5 sm:px-8 overflow-hidden">
                {/* Background effects — road scene + gradient blobs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {/* === Hero road scene SVG === */}
                    <svg
                        viewBox="0 0 1200 700"
                        preserveAspectRatio="xMidYMid slice"
                        className="absolute inset-0 w-full h-full"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ opacity: 0.55 }}
                    >
                        <defs>
                            <filter id="hero-glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="4" result="b" />
                                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                            <linearGradient id="road-fade-l" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#0D1117" stopOpacity="1" />
                                <stop offset="15%" stopColor="#0D1117" stopOpacity="0" />
                                <stop offset="85%" stopColor="#0D1117" stopOpacity="0" />
                                <stop offset="100%" stopColor="#0D1117" stopOpacity="1" />
                            </linearGradient>
                        </defs>

                        <style>{`
                            @keyframes hero-dash { to { stroke-dashoffset: -60; } }
                            @keyframes hero-pin-bounce {
                                0%, 100% { transform: translateY(0); }
                                50% { transform: translateY(-6px); }
                            }
                            @keyframes hero-ring-pulse {
                                0% { r: 6; opacity: 0.6; }
                                100% { r: 22; opacity: 0; }
                            }
                        `}</style>

                        {/* Main diagonal highway — wide road surface */}
                        <path d="M -50 520 C 200 480, 400 400, 600 350 S 900 250, 1250 180"
                            fill="none" stroke="rgba(245,158,11,0.06)" strokeWidth="60" strokeLinecap="round" />
                        {/* Road edge lines */}
                        <path d="M -50 490 C 200 450, 400 370, 600 320 S 900 220, 1250 150"
                            fill="none" stroke="rgba(245,158,11,0.08)" strokeWidth="1" strokeLinecap="round" />
                        <path d="M -50 550 C 200 510, 400 430, 600 380 S 900 280, 1250 210"
                            fill="none" stroke="rgba(245,158,11,0.08)" strokeWidth="1" strokeLinecap="round" />
                        {/* Center lane dashes — animated */}
                        <path d="M -50 520 C 200 480, 400 400, 600 350 S 900 250, 1250 180"
                            fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="1.5" strokeLinecap="round"
                            strokeDasharray="16 32"
                            style={{ animation: 'hero-dash 2.5s linear infinite' }} />

                        {/* Secondary road crossing diagonally */}
                        <path d="M 350 -20 C 380 150, 500 350, 650 550 S 780 650, 850 750"
                            fill="none" stroke="rgba(245,158,11,0.035)" strokeWidth="40" strokeLinecap="round" />
                        <path d="M 350 -20 C 380 150, 500 350, 650 550 S 780 650, 850 750"
                            fill="none" stroke="rgba(245,158,11,0.1)" strokeWidth="1" strokeLinecap="round"
                            strokeDasharray="12 28"
                            style={{ animation: 'hero-dash 3s linear infinite' }} />

                        {/* Vehicles on main highway */}
                        {[
                            { dur: 10, del: 0, w: 14, h: 7, color: 'rgba(255,255,255,0.3)' },
                            { dur: 13, del: 3, w: 22, h: 8, color: 'rgba(245,158,11,0.4)' },
                            { dur: 11, del: 6, w: 14, h: 7, color: 'rgba(255,255,255,0.25)' },
                            { dur: 15, del: 1, w: 14, h: 7, color: 'rgba(255,255,255,0.2)' },
                            { dur: 12, del: 8, w: 14, h: 7, color: 'rgba(245,158,11,0.3)' },
                        ].map((v, i) => (
                            <g key={`hv-${i}`}>
                                <rect x={-v.w / 2} y={-v.h / 2} width={v.w} height={v.h} rx="3" fill={v.color}>
                                    <animateMotion dur={`${v.dur}s`} repeatCount="indefinite" begin={`${v.del}s`} rotate="auto"
                                        path="M -50 520 C 200 480, 400 400, 600 350 S 900 250, 1250 180" />
                                </rect>
                                <circle r="5" fill="rgba(245,158,11,0.2)" filter="url(#hero-glow)">
                                    <animateMotion dur={`${v.dur}s`} repeatCount="indefinite" begin={`${v.del}s`} rotate="auto"
                                        path="M -50 520 C 200 480, 400 400, 600 350 S 900 250, 1250 180" />
                                </circle>
                            </g>
                        ))}

                        {/* Vehicle on secondary road */}
                        <g>
                            <rect x="-6" y="-3" width="12" height="6" rx="2" fill="rgba(255,255,255,0.18)">
                                <animateMotion dur="14s" repeatCount="indefinite" begin="2s" rotate="auto"
                                    path="M 350 -20 C 380 150, 500 350, 650 550 S 780 650, 850 750" />
                            </rect>
                        </g>

                        {/* Map pin markers at destinations */}
                        {[
                            { cx: 250, cy: 470 },
                            { cx: 620, cy: 340 },
                            { cx: 1000, cy: 230 },
                        ].map((pin, i) => (
                            <g key={`pin-${i}`} style={{ animation: `hero-pin-bounce 3s ease-in-out ${i * 0.8}s infinite` }}>
                                {/* Pin body */}
                                <path d={`M ${pin.cx} ${pin.cy - 18} 
                                          a 8 8 0 1 1 0 0.01 Z 
                                          M ${pin.cx} ${pin.cy - 4} l -4 -8 h 8 Z`}
                                    fill="rgba(245,158,11,0.4)" stroke="rgba(245,158,11,0.6)" strokeWidth="0.8" />
                                {/* Pulse ring */}
                                <circle cx={pin.cx} cy={pin.cy} fill="none" stroke="rgba(245,158,11,0.3)" strokeWidth="1">
                                    <animate attributeName="r" values="6;22" dur="2.5s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
                                    <animate attributeName="opacity" values="0.5;0" dur="2.5s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
                                </circle>
                            </g>
                        ))}

                        {/* Fade edges so it blends into page */}
                        <rect width="100%" height="100%" fill="url(#road-fade-l)" />
                    </svg>

                    {/* Original gradient ambient blobs (on top for depth) */}
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-amber-500/[0.06] rounded-full blur-[120px]" />
                    <div className="absolute top-40 left-1/4 w-[400px] h-[400px] bg-amber-600/[0.04] rounded-full blur-[100px]" />
                    <div className="absolute top-60 right-1/4 w-[300px] h-[300px] bg-amber-400/[0.03] rounded-full blur-[80px]" />
                </div>

                <div className="relative max-w-6xl mx-auto z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
                        {/* Left side — Text */}
                        <div className="flex-1 text-center lg:text-left">
                            <RevealOnScroll>
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[12px] font-medium mb-6">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                    Powered by LangChain ReAct Agent
                                </div>
                            </RevealOnScroll>

                            <RevealOnScroll delay={100}>
                                <h1 className="text-[clamp(36px,6vw,64px)] font-extrabold leading-[1.08] tracking-tight mb-6">
                                    <span className="bg-gradient-to-b from-white via-white to-white/50 bg-clip-text text-transparent">Describe your route.</span>
                                    <br />
                                    <span className="bg-gradient-to-r from-[#FBBF24] via-[#F59E0B] to-yellow-500 bg-clip-text text-transparent">Drive in seconds.</span>
                                </h1>
                            </RevealOnScroll>

                            <RevealOnScroll delay={200}>
                                <p className="text-[#94A3B8] text-[clamp(15px,1.8vw,18px)] max-w-lg mx-auto lg:mx-0 leading-relaxed mb-8">
                                    Tell the AI where you need to go in plain English. It geocodes every stop, checks your saved routes, and launches Google Maps — instantly.
                                </p>
                            </RevealOnScroll>

                            <RevealOnScroll delay={300}>
                                <div className="flex flex-col sm:flex-row items-center gap-3 mb-8 justify-center lg:justify-start">
                                    <a href="/signup" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#F59E0B] text-[#0D1117] text-[15px] font-bold hover:brightness-110 transition-all active:scale-95 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                                        Get Started Free <ArrowRight className="w-4 h-4" />
                                    </a>
                                    <a href="#how-it-works" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-white/[0.1] text-white/70 text-[15px] font-medium hover:bg-white/[0.05] hover:text-white transition-all">
                                        Watch it work <ChevronDown className="w-4 h-4" />
                                    </a>
                                </div>
                            </RevealOnScroll>

                            <RevealOnScroll delay={400}>
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 justify-center lg:justify-start text-[13px] text-white/40">
                                    <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Free forever</span>
                                    <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> No addresses needed</span>
                                    <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Works on any phone</span>
                                </div>
                            </RevealOnScroll>
                        </div>

                        {/* Right side — Animated Demo Widget */}
                        <div className="flex-1 w-full max-w-md lg:max-w-none relative">
                            <RevealOnScroll delay={400}>
                                <AutoDemoChat />
                            </RevealOnScroll>
                        </div>
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════
                SECTION 3: SOCIAL PROOF BAR
               ═══════════════════════════════════════ */}
            <section className="relative z-[1] py-8 px-5 sm:px-8 border-y border-white/[0.04] bg-white/[0.01] overflow-hidden">
                {/* Road lane divider animation */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1200 60" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.4 }}>
                    <line x1="0" y1="30" x2="1200" y2="30" stroke="rgba(245,158,11,0.08)" strokeWidth="40" />
                    <line x1="0" y1="30" x2="1200" y2="30" stroke="rgba(245,158,11,0.15)" strokeWidth="1" strokeDasharray="20 30" style={{ animation: 'hero-dash 2s linear infinite' }} />
                    <rect x="-8" y="26" width="16" height="8" rx="3" fill="rgba(245,158,11,0.3)">
                        <animateMotion dur="6s" repeatCount="indefinite" path="M 0 30 L 1200 30" />
                    </rect>
                </svg>
                <div className="max-w-6xl mx-auto relative">
                    <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar">
                        <span className="text-white/30 text-[12px] font-medium tracking-wider uppercase whitespace-nowrap shrink-0">Built with</span>
                        <div className="w-px h-4 bg-white/10 shrink-0" />
                        {['LangChain', 'ChromaDB', 'Groq AI', 'Supabase', 'FastAPI', 'Fastembed'].map(tech => (
                            <span key={tech} className="px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/40 text-[12px] font-medium whitespace-nowrap shrink-0 hover:text-white/60 hover:border-white/[0.1] transition-colors">
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════
                SECTION 4: METRICS
               ═══════════════════════════════════════ */}
            <section className="py-20 lg:py-28 px-5 sm:px-8 relative z-[1] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/[0.02] to-transparent pointer-events-none" />
                {/* Speedometer arcs + highway */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 500" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.3 }}>
                    <path d="M -50 400 C 200 370, 450 300, 650 320 S 950 250, 1250 280" fill="none" stroke="rgba(245,158,11,0.06)" strokeWidth="50" strokeLinecap="round" />
                    <path d="M -50 400 C 200 370, 450 300, 650 320 S 950 250, 1250 280" fill="none" stroke="rgba(245,158,11,0.12)" strokeWidth="1.2" strokeDasharray="14 28" style={{ animation: 'hero-dash 3s linear infinite' }} />
                    <rect x="-7" y="-4" width="14" height="8" rx="3" fill="rgba(255,255,255,0.2)">
                        <animateMotion dur="12s" repeatCount="indefinite" rotate="auto" path="M -50 400 C 200 370, 450 300, 650 320 S 950 250, 1250 280" />
                    </rect>
                    <circle r="4" fill="rgba(245,158,11,0.2)">
                        <animateMotion dur="12s" repeatCount="indefinite" rotate="auto" path="M -50 400 C 200 370, 450 300, 650 320 S 950 250, 1250 280" />
                    </circle>
                    {/* Speedometer arcs behind each card */}
                    {[200, 600, 1000].map((x, i) => (
                        <g key={`arc-${i}`} opacity="0.15">
                            <path d={`M ${x - 60} 180 A 60 60 0 0 1 ${x + 60} 180`} fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
                            <line x1={x} y1={180} x2={x} y2={130} stroke="#F59E0B" strokeWidth="1" strokeLinecap="round">
                                <animateTransform attributeName="transform" type="rotate" from={`-60 ${x} 180`} to={`60 ${x} 180`} dur={`${3 + i}s`} repeatCount="indefinite" />
                            </line>
                        </g>
                    ))}
                </svg>
                <div className="max-w-5xl mx-auto relative">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                        {[
                            { number: 5, suffix: '', label: 'AI Tools', desc: 'Geocoding, semantic memory, trip recall, history retrieval, RAG' },
                            { number: 8, suffix: 's', label: 'Avg Response Time', desc: 'Average agent reasoning chain completion', prefix: '< ' },
                            { number: 2, suffix: ' min', label: 'To First Route', desc: 'From sign-up to navigating your first route' },
                        ].map((stat, i) => (
                            <RevealOnScroll key={stat.label} delay={i * 120}>
                                <div className="group relative text-center p-10 lg:p-12 rounded-2xl bg-[#1E293B]/50 border border-white/[0.06] hover:border-amber-500/25 hover:shadow-[0_0_40px_rgba(245,158,11,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-[2px] bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent" />
                                    <p className="text-[clamp(42px,5vw,64px)] font-extrabold bg-gradient-to-b from-[#FBBF24] via-[#F59E0B] to-amber-600/60 bg-clip-text text-transparent leading-none mb-3">
                                        {stat.prefix || ''}<CountUpNumber target={stat.number} suffix={stat.suffix} />
                                    </p>
                                    <p className="text-white text-[16px] font-bold mb-2">{stat.label}</p>
                                    <p className="text-[#94A3B8] text-[14px] leading-relaxed max-w-[250px] mx-auto">{stat.desc}</p>
                                </div>
                            </RevealOnScroll>
                        ))}
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════
                SECTION 5: HOW IT WORKS
               ═══════════════════════════════════════ */}
            <section id="how-it-works" className="py-20 lg:py-28 px-5 sm:px-8 relative z-[1] bg-[#0F172A]/50 overflow-hidden">
                {/* Winding road with 3 stop pins */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 500" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.25 }}>
                    <path d="M -30 450 C 150 350, 300 200, 500 250 S 700 400, 900 300 S 1100 150, 1250 200" fill="none" stroke="rgba(245,158,11,0.05)" strokeWidth="44" strokeLinecap="round" />
                    <path d="M -30 450 C 150 350, 300 200, 500 250 S 700 400, 900 300 S 1100 150, 1250 200" fill="none" stroke="rgba(245,158,11,0.12)" strokeWidth="1.2" strokeDasharray="16 30" style={{ animation: 'hero-dash 3s linear infinite' }} />
                    {/* 3 map pins along the road */}
                    {[{ x: 250, y: 240 }, { x: 600, y: 340 }, { x: 950, y: 220 }].map((p, i) => (
                        <g key={`hiw-pin-${i}`}>
                            <circle cx={p.x} cy={p.y} r="8" fill="rgba(245,158,11,0.15)" stroke="rgba(245,158,11,0.3)" strokeWidth="1" />
                            <text x={p.x} y={p.y + 4} textAnchor="middle" fill="rgba(245,158,11,0.5)" fontSize="10" fontWeight="bold">{i + 1}</text>
                            <circle cx={p.x} cy={p.y} fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="0.8">
                                <animate attributeName="r" values="8;20" dur="3s" begin={`${i * 1}s`} repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.4;0" dur="3s" begin={`${i * 1}s`} repeatCount="indefinite" />
                            </circle>
                        </g>
                    ))}
                    <rect x="-6" y="-3" width="12" height="6" rx="2" fill="rgba(245,158,11,0.3)">
                        <animateMotion dur="14s" repeatCount="indefinite" rotate="auto" path="M -30 450 C 150 350, 300 200, 500 250 S 700 400, 900 300 S 1100 150, 1250 200" />
                    </rect>
                </svg>
                <div className="max-w-5xl mx-auto relative">
                    <RevealOnScroll className="text-center mb-16 lg:mb-20">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">How it works</h2>
                        <p className="text-base sm:text-lg" style={{ color: '#94A3B8' }}>Three steps to your next route.</p>
                    </RevealOnScroll>

                    {/* Desktop: Horizontal timeline */}
                    <div className="hidden md:grid grid-cols-3 gap-8 relative">
                        {/* Connecting line */}
                        <div className="absolute top-[60px] left-[16%] right-[16%] h-[2px] -z-0">
                            <div className="w-full h-full border-t-2 border-dashed border-amber-500/20" />
                        </div>

                        {[
                            { step: '01', icon: <MessageSquare className="w-6 h-6" />, title: 'Describe your route', anim: <StepOneAnimation /> },
                            { step: '02', icon: <Brain className="w-6 h-6" />, title: 'Agent resolves stops', anim: <StepTwoAnimation /> },
                            { step: '03', icon: <Navigation className="w-6 h-6" />, title: 'Launch navigation', anim: <StepThreeAnimation /> },
                        ].map((item, i) => (
                            <RevealOnScroll key={item.step} delay={i * 180}>
                                <div className="relative text-center">
                                    <div className="w-[120px] h-[120px] rounded-2xl bg-[#1E293B] border border-white/[0.08] flex flex-col items-center justify-center mx-auto mb-6 relative z-10 group hover:border-amber-500/30 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all duration-300">
                                        <span className="text-[#F59E0B] text-2xl font-extrabold mb-1">{item.step}</span>
                                        <div className="text-amber-400">{item.icon}</div>
                                    </div>
                                    <h3 className="text-white font-bold text-[18px] mb-3">{item.title}</h3>
                                    {item.anim}
                                </div>
                            </RevealOnScroll>
                        ))}
                    </div>

                    {/* Mobile: Vertical timeline */}
                    <div className="md:hidden space-y-8 relative">
                        <div className="absolute top-0 bottom-0 left-[39px] w-[2px] border-l-2 border-dashed border-amber-500/20" />
                        {[
                            { step: '01', icon: <MessageSquare className="w-5 h-5" />, title: 'Describe your route', anim: <StepOneAnimation /> },
                            { step: '02', icon: <Brain className="w-5 h-5" />, title: 'Agent resolves stops', anim: <StepTwoAnimation /> },
                            { step: '03', icon: <Navigation className="w-5 h-5" />, title: 'Launch navigation', anim: <StepThreeAnimation /> },
                        ].map((item, i) => (
                            <RevealOnScroll key={item.step} delay={i * 120}>
                                <div className="flex gap-5 items-start">
                                    <div className="w-[80px] h-[80px] rounded-xl bg-[#1E293B] border border-white/[0.08] flex flex-col items-center justify-center shrink-0 relative z-10">
                                        <span className="text-[#F59E0B] text-lg font-extrabold">{item.step}</span>
                                        <div className="text-amber-400">{item.icon}</div>
                                    </div>
                                    <div className="pt-2 flex-1">
                                        <h3 className="text-white font-bold text-[16px] mb-2">{item.title}</h3>
                                        {item.anim}
                                    </div>
                                </div>
                            </RevealOnScroll>
                        ))}
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════
                SECTION 6: FEATURES (Bento Grid)
               ═══════════════════════════════════════ */}
            <section id="features" className="py-20 lg:py-28 px-5 sm:px-8 relative z-[1] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A]/50 to-transparent pointer-events-none" />
                {/* GPS signal ripples + compass */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.2 }}>
                    {/* GPS ripples from two points */}
                    {[{ x: 150, y: 120 }, { x: 1050, y: 480 }].map((p, i) => (
                        <g key={`gps-${i}`}>
                            {[0, 1, 2].map(r => (
                                <circle key={r} cx={p.x} cy={p.y} fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="0.8">
                                    <animate attributeName="r" values="10;80" dur="4s" begin={`${r * 1.3 + i * 2}s`} repeatCount="indefinite" />
                                    <animate attributeName="opacity" values="0.4;0" dur="4s" begin={`${r * 1.3 + i * 2}s`} repeatCount="indefinite" />
                                </circle>
                            ))}
                            <circle cx={p.x} cy={p.y} r="3" fill="rgba(245,158,11,0.4)" />
                        </g>
                    ))}
                    {/* Compass rose */}
                    <g opacity="0.12" transform="translate(600,300)">
                        <circle r="45" fill="none" stroke="#F59E0B" strokeWidth="1" />
                        <circle r="35" fill="none" stroke="#F59E0B" strokeWidth="0.5" strokeDasharray="4 8" />
                        <line x1="0" y1="-50" x2="0" y2="50" stroke="#F59E0B" strokeWidth="0.8" />
                        <line x1="-50" y1="0" x2="50" y2="0" stroke="#F59E0B" strokeWidth="0.8" />
                        <polygon points="0,-48 -4,-38 4,-38" fill="#F59E0B" />
                        <text x="0" y="-54" textAnchor="middle" fill="#F59E0B" fontSize="8" fontWeight="bold">N</text>
                        <animateTransform attributeName="transform" type="rotate" from="0 600 300" to="360 600 300" dur="60s" repeatCount="indefinite" />
                    </g>
                    {/* Connecting road from How It Works */}
                    <path d="M -30 80 C 200 120, 400 50, 600 100 S 900 160, 1250 80" fill="none" stroke="rgba(245,158,11,0.05)" strokeWidth="30" strokeLinecap="round" />
                    <path d="M -30 80 C 200 120, 400 50, 600 100 S 900 160, 1250 80" fill="none" stroke="rgba(245,158,11,0.1)" strokeWidth="1" strokeDasharray="12 24" style={{ animation: 'hero-dash 3.5s linear infinite' }} />
                </svg>
                <div className="max-w-6xl mx-auto relative">
                    <RevealOnScroll className="text-center mb-16 lg:mb-20">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">Built for real-world drivers</h2>
                        <p className="text-base sm:text-lg" style={{ color: '#94A3B8' }}>Enterprise-grade AI. Dead-simple interface.</p>
                    </RevealOnScroll>

                    {/* Bento grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
                        {/* Large card (2/3 width) — LangChain AI Agent */}
                        <RevealOnScroll className="lg:col-span-2">
                            <div className="group h-full p-7 lg:p-9 rounded-2xl bg-[#1E293B]/50 border border-white/[0.06] hover:border-amber-500/25 transition-all duration-300">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                        <Brain className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <h3 className="text-white font-bold text-[18px]">LangChain AI Agent</h3>
                                </div>
                                <p className="text-[#94A3B8] text-[14px] leading-relaxed mb-5">Reasons through your request step by step using the ReAct architecture with 5 specialised tools.</p>
                                {/* Code snippet */}
                                <div className="rounded-xl bg-[#0D1117] border border-white/[0.06] p-4 font-mono text-[12px] leading-[1.8] overflow-x-auto">
                                    <p><span className="text-amber-400">THOUGHT:</span> <span className="text-white/60">Sounds like a saved trip recall</span></p>
                                    <p><span className="text-emerald-400">ACTION:</span> <span className="text-white/60">search_saved_trips(</span><span className="text-amber-300">"morning school run"</span><span className="text-white/60">)</span></p>
                                    <p><span className="text-blue-400">OBSERVATION:</span> <span className="text-white/60">Found "Morning School Run", similarity</span> <span className="text-amber-300">0.91</span></p>
                                    <p><span className="text-emerald-400">ACTION:</span> <span className="text-white/60">get_trip_by_id(3) → 4 stops returned</span></p>
                                </div>
                            </div>
                        </RevealOnScroll>

                        {/* Tall card (1/3 width) — Semantic Memory */}
                        <RevealOnScroll delay={120}>
                            <div className="group h-full p-7 lg:p-9 rounded-2xl bg-[#1E293B]/50 border border-white/[0.06] hover:border-amber-500/25 transition-all duration-300 flex flex-col">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                        <Search className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <h3 className="text-white font-bold text-[18px]">Semantic Memory</h3>
                                </div>
                                <p className="text-[#94A3B8] text-[14px] leading-relaxed mb-5">Remembers your stops. Say "the co-op" and it knows exactly where you mean.</p>
                                {/* Mini search demo */}
                                <div className="mt-auto space-y-3">
                                    <div className="rounded-lg bg-[#0D1117] border border-white/[0.06] px-3.5 py-2.5 flex items-center gap-2">
                                        <Search className="w-3.5 h-3.5 text-white/30" />
                                        <span className="text-amber-400 text-[13px] font-mono">the co-op</span>
                                        <span className="ml-auto w-1 h-4 bg-amber-400 animate-pulse rounded-sm" />
                                    </div>
                                    <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 px-3.5 py-2.5">
                                        <p className="text-white/80 text-[12px] font-medium">Co-operative Food, 14 Elm Rd</p>
                                        <p className="text-emerald-400 text-[11px] mt-1">0.94 match ✓</p>
                                    </div>
                                </div>
                            </div>
                        </RevealOnScroll>

                        {/* Bottom three equal cards */}
                        {[
                            { icon: <Clock className="w-5 h-5 text-amber-400" />, title: 'RAG Trip History', desc: 'Ask "have I been to Oak Ave before?" Get a real answer from your history.' },
                            { icon: <Navigation className="w-5 h-5 text-amber-400" />, title: 'One-Tap Navigation', desc: 'Google Maps and Apple Maps deep-link with all stops pre-loaded.' },
                            { icon: <BarChart3 className="w-5 h-5 text-amber-400" />, title: 'Stats Dashboard', desc: 'Track your daily and weekly trips, stops visited, and total miles driven.' },
                        ].map((f, i) => (
                            <RevealOnScroll key={f.title} delay={180 + i * 100}>
                                <div className="group h-full p-7 rounded-2xl bg-[#1E293B]/50 border border-white/[0.06] hover:border-amber-500/25 hover:-translate-y-1 transition-all duration-300">
                                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center mb-5">
                                        {f.icon}
                                    </div>
                                    <h3 className="text-white font-bold text-[17px] mb-2">{f.title}</h3>
                                    <p className="text-[#94A3B8] text-[14px] leading-relaxed">{f.desc}</p>
                                </div>
                            </RevealOnScroll>
                        ))}
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════
                SECTION 7: WHY WE BUILT ROUTAURA
               ═══════════════════════════════════════ */}
            <section className="py-20 lg:py-28 px-5 sm:px-8 relative z-[1] bg-[#0F172A]/30 border-y border-white/[0.04] overflow-hidden">
                {/* Fork-in-the-road — old way vs new way */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 500" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.2 }}>
                    {/* Main road leading to fork */}
                    <path d="M -30 350 C 150 340, 300 320, 450 300" fill="none" stroke="rgba(245,158,11,0.06)" strokeWidth="40" strokeLinecap="round" />
                    <path d="M -30 350 C 150 340, 300 320, 450 300" fill="none" stroke="rgba(245,158,11,0.12)" strokeWidth="1" strokeDasharray="14 26" style={{ animation: 'hero-dash 2.5s linear infinite' }} />
                    {/* Old way (fades out — red tint) */}
                    <path d="M 450 300 C 600 250, 750 200, 900 220 S 1100 280, 1250 250" fill="none" stroke="rgba(239,68,68,0.06)" strokeWidth="30" strokeLinecap="round" />
                    <path d="M 450 300 C 600 250, 750 200, 900 220 S 1100 280, 1250 250" fill="none" stroke="rgba(239,68,68,0.1)" strokeWidth="0.8" strokeDasharray="10 20" />
                    {/* New way (glowing amber) */}
                    <path d="M 450 300 C 600 350, 750 420, 900 380 S 1100 320, 1250 340" fill="none" stroke="rgba(245,158,11,0.06)" strokeWidth="35" strokeLinecap="round" />
                    <path d="M 450 300 C 600 350, 750 420, 900 380 S 1100 320, 1250 340" fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="1.2" strokeDasharray="14 26" style={{ animation: 'hero-dash 2.5s linear infinite' }} />
                    {/* Vehicle on new way */}
                    <rect x="-7" y="-3" width="14" height="6" rx="2" fill="rgba(245,158,11,0.35)">
                        <animateMotion dur="10s" repeatCount="indefinite" rotate="auto" path="M -30 350 C 150 340, 300 320, 450 300 C 600 350, 750 420, 900 380 S 1100 320, 1250 340" />
                    </rect>
                    <circle r="4" fill="rgba(245,158,11,0.2)">
                        <animateMotion dur="10s" repeatCount="indefinite" rotate="auto" path="M -30 350 C 150 340, 300 320, 450 300 C 600 350, 750 420, 900 380 S 1100 320, 1250 340" />
                    </circle>
                    {/* Fork label dots */}
                    <circle cx="450" cy="300" r="5" fill="rgba(245,158,11,0.3)" />
                </svg>
                <div className="max-w-5xl mx-auto relative">
                    <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
                        {/* Left — Story text */}
                        <RevealOnScroll className="flex-1">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[12px] font-medium mb-6">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                Our Story
                            </div>
                            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold mb-6 tracking-tight leading-tight">Why we built RoutAura.</h2>
                            <p className="text-white text-base lg:text-lg leading-relaxed mb-5">
                                Bus drivers and professional drivers spend minutes every morning doing the same thing — opening Google Maps, searching each stop one by one, and rebuilding the same route they drove yesterday. For a school bus driver with 10 stops, that's wasted time every single day.
                            </p>
                            <p className="text-white text-base lg:text-lg leading-relaxed">
                                RoutAura fixes that. Describe your route <strong className="text-[#F59E0B] font-bold">once in plain English</strong> — or just say 'my usual morning run' — and the AI handles the rest. It remembers your stops, recalls your saved routes, and launches Google Maps with everything pre-loaded. One conversation. Zero rebuilding.
                            </p>
                        </RevealOnScroll>

                        {/* Right — Before vs After */}
                        <RevealOnScroll delay={200} className="flex-1 w-full">
                            <div className="space-y-5">
                                {/* BEFORE card */}
                                <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="px-2.5 py-1 rounded-md bg-red-500/15 text-red-400 text-[11px] font-bold tracking-wider uppercase">Before</span>
                                    </div>
                                    <div className="space-y-2.5 text-[13px] text-white/50 font-mono">
                                        <p>Opening Google Maps...</p>
                                        <p>Typing stop 1 of 8...</p>
                                        <p>Typing stop 2 of 8...</p>
                                        <p className="text-white/30">...</p>
                                        <p className="text-red-400 font-sans font-semibold mt-3">⏱ 4 minutes wasted</p>
                                    </div>
                                </div>

                                {/* AFTER card */}
                                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-400 text-[11px] font-bold tracking-wider uppercase">After</span>
                                    </div>
                                    <div className="space-y-2.5 text-[13px]">
                                        <p className="text-amber-400 font-mono">"do my usual run"</p>
                                        <p className="text-emerald-400">✓ 8 stops geocoded</p>
                                        <p className="text-emerald-400">✓ Maps launched</p>
                                        <p className="text-amber-400 font-semibold mt-3">⏱ 11 seconds</p>
                                    </div>
                                </div>
                            </div>
                        </RevealOnScroll>
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════
                SECTION 8: FAQ
               ═══════════════════════════════════════ */}
            <section id="faq" className="py-20 lg:py-28 px-5 sm:px-8 relative z-[1] overflow-hidden">
                {/* Road sign posts */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.12 }}>
                    {/* Vertical road behind FAQ cards */}
                    <path d="M 600 -20 C 580 150, 620 300, 600 450 S 580 550, 600 650" fill="none" stroke="rgba(245,158,11,0.06)" strokeWidth="40" />
                    <path d="M 600 -20 C 580 150, 620 300, 600 450 S 580 550, 600 650" fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="1" strokeDasharray="14 28" style={{ animation: 'hero-dash 3s linear infinite' }} />
                    {/* Road sign posts on the sides */}
                    {[{ x: 100, y: 120, label: '?' }, { x: 1100, y: 280, label: '?' }, { x: 120, y: 440, label: '!' }].map((s, i) => (
                        <g key={`sign-${i}`}>
                            <line x1={s.x} y1={s.y} x2={s.x} y2={s.y + 40} stroke="rgba(245,158,11,0.3)" strokeWidth="2" />
                            <rect x={s.x - 15} y={s.y - 15} width="30" height="25" rx="4" fill="rgba(245,158,11,0.08)" stroke="rgba(245,158,11,0.2)" strokeWidth="1" />
                            <text x={s.x} y={s.y + 4} textAnchor="middle" fill="rgba(245,158,11,0.5)" fontSize="14" fontWeight="bold">{s.label}</text>
                        </g>
                    ))}
                </svg>
                <div className="max-w-3xl mx-auto relative">
                    <RevealOnScroll className="text-center mb-14">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">Questions?</h2>
                        <p className="text-base sm:text-lg" style={{ color: '#94A3B8' }}>Everything you need to know.</p>
                    </RevealOnScroll>

                    <div className="space-y-3">
                        {FAQ_DATA.map((item, i) => (
                            <RevealOnScroll key={item.q} delay={i * 60}>
                                <FAQItem
                                    q={item.q}
                                    a={item.a}
                                    isOpen={openFaq === i}
                                    onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                                />
                            </RevealOnScroll>
                        ))}
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════
                SECTION 9: ROADMAP
               ═══════════════════════════════════════ */}
            <section className="py-20 lg:py-28 px-5 sm:px-8 relative z-[1] bg-[#0F172A]/30 overflow-hidden">
                {/* Road with milestone markers */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 500" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.2 }}>
                    <path d="M -30 400 C 200 380, 400 350, 600 360 S 900 330, 1250 350" fill="none" stroke="rgba(245,158,11,0.05)" strokeWidth="44" strokeLinecap="round" />
                    <path d="M -30 400 C 200 380, 400 350, 600 360 S 900 330, 1250 350" fill="none" stroke="rgba(245,158,11,0.12)" strokeWidth="1.2" strokeDasharray="16 30" style={{ animation: 'hero-dash 3s linear infinite' }} />
                    {/* Milestone flags */}
                    {[{ x: 200, y: 385 }, { x: 600, y: 358 }, { x: 1000, y: 342 }].map((m, i) => (
                        <g key={`ms-${i}`}>
                            <line x1={m.x} y1={m.y} x2={m.x} y2={m.y - 35} stroke="rgba(245,158,11,0.4)" strokeWidth="1.5" />
                            <rect x={m.x} y={m.y - 35} width="18" height="12" rx="2" fill={i === 0 ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.1)'} stroke="rgba(245,158,11,0.25)" strokeWidth="0.8" />
                            <circle cx={m.x} cy={m.y} r="4" fill="rgba(245,158,11,0.2)" stroke="rgba(245,158,11,0.3)" strokeWidth="1" />
                        </g>
                    ))}
                    <rect x="-6" y="-3" width="12" height="6" rx="2" fill="rgba(245,158,11,0.3)">
                        <animateMotion dur="16s" repeatCount="indefinite" rotate="auto" path="M -30 400 C 200 380, 400 350, 600 360 S 900 330, 1250 350" />
                    </rect>
                </svg>
                <div className="max-w-5xl mx-auto relative">
                    <RevealOnScroll className="text-center mb-14 lg:mb-20">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[12px] font-medium mb-6">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Roadmap
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">What&apos;s coming next</h2>
                        <p className="text-base sm:text-lg" style={{ color: '#94A3B8' }}>RoutAura is just getting started.</p>
                    </RevealOnScroll>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                        {[
                            {
                                icon: <MapPin className="w-6 h-6" />,
                                badge: 'In Development',
                                badgeActive: true,
                                title: 'Right-Side Stop Optimisation',
                                desc: 'For school bus drivers — the AI will automatically detect if a stop is on the left side of the road and suggest an alternative approach so children never have to cross.'
                            },
                            {
                                icon: <Globe className="w-6 h-6" />,
                                badge: 'Coming Soon',
                                badgeActive: false,
                                title: 'Global Expansion',
                                desc: 'Currently optimised for the USA. Coming soon to Pakistan, UAE, Canada, Australia, and the UK — with local geocoding and region-aware routing.'
                            },
                            {
                                icon: <Truck className="w-6 h-6" />,
                                badge: 'Coming Soon',
                                badgeActive: false,
                                title: 'Fleet Management',
                                desc: 'Manage multiple drivers and routes from a single dashboard. Assign routes, track launches, and monitor your fleet in real time.'
                            },
                        ].map((item, i) => (
                            <RevealOnScroll key={item.title} delay={i * 150}>
                                <div className="group relative p-8 lg:p-10 rounded-2xl bg-white/[0.01] border-2 border-dashed border-amber-500/20 hover:border-amber-500/40 hover:bg-white/[0.02] transition-all duration-300 flex flex-col h-full">
                                    <div className="w-14 h-14 rounded-xl bg-amber-500/[0.07] border border-dashed border-amber-500/20 flex items-center justify-center text-amber-400/70 mb-6 group-hover:scale-110 group-hover:text-amber-400 transition-all duration-300">
                                        {item.icon}
                                    </div>
                                    <span className={`inline-block w-fit px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase mb-4 border ${item.badgeActive
                                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                                        : 'bg-white/[0.04] text-white/40 border-white/[0.08]'
                                        }`}>{item.badge}</span>
                                    <h3 className="text-white/90 font-bold text-[18px] mb-3">{item.title}</h3>
                                    <p className="text-white/35 text-[14px] leading-relaxed flex-grow">{item.desc}</p>
                                </div>
                            </RevealOnScroll>
                        ))}
                    </div>
                </div>
            </section>


            {/* ═══════════════════════════════════════
                SECTION 10: FINAL CTA
               ═══════════════════════════════════════ */}
            <section className="py-24 lg:py-32 px-5 sm:px-8 relative z-[1] overflow-hidden">
                {/* Amber radial glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-amber-500/[0.08] rounded-full blur-[120px]" />
                </div>
                {/* Converging roads to destination */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 400" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.2 }}>
                    {/* Road from left */}
                    <path d="M -30 300 C 150 280, 350 220, 600 200" fill="none" stroke="rgba(245,158,11,0.05)" strokeWidth="36" strokeLinecap="round" />
                    <path d="M -30 300 C 150 280, 350 220, 600 200" fill="none" stroke="rgba(245,158,11,0.12)" strokeWidth="1" strokeDasharray="14 26" style={{ animation: 'hero-dash 2.5s linear infinite' }} />
                    {/* Road from right */}
                    <path d="M 1230 300 C 1050 280, 850 220, 600 200" fill="none" stroke="rgba(245,158,11,0.05)" strokeWidth="36" strokeLinecap="round" />
                    <path d="M 1230 300 C 1050 280, 850 220, 600 200" fill="none" stroke="rgba(245,158,11,0.12)" strokeWidth="1" strokeDasharray="14 26" style={{ animation: 'hero-dash 2.5s linear infinite' }} />
                    {/* Destination pin at convergence */}
                    <circle cx="600" cy="200" r="10" fill="rgba(245,158,11,0.15)" stroke="rgba(245,158,11,0.4)" strokeWidth="1.5" />
                    <circle cx="600" cy="200" r="4" fill="rgba(245,158,11,0.5)" />
                    <circle cx="600" cy="200" fill="none" stroke="rgba(245,158,11,0.25)" strokeWidth="1">
                        <animate attributeName="r" values="10;30" dur="3s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.5;0" dur="3s" repeatCount="indefinite" />
                    </circle>
                    {/* Vehicles approaching from both sides */}
                    <rect x="-6" y="-3" width="12" height="6" rx="2" fill="rgba(245,158,11,0.3)">
                        <animateMotion dur="8s" repeatCount="indefinite" rotate="auto" path="M -30 300 C 150 280, 350 220, 600 200" />
                    </rect>
                    <rect x="-6" y="-3" width="12" height="6" rx="2" fill="rgba(255,255,255,0.2)">
                        <animateMotion dur="9s" repeatCount="indefinite" begin="2s" rotate="auto" path="M 1230 300 C 1050 280, 850 220, 600 200" />
                    </rect>
                </svg>

                <div className="max-w-2xl mx-auto text-center relative z-10">
                    <RevealOnScroll>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-5 tracking-tight leading-tight">
                            Ready to stop re-entering the same route every day?
                        </h2>
                        <p className="text-[15px] sm:text-base mb-8" style={{ color: '#94A3B8' }}>Free forever. No credit card. Set up in 30 seconds.</p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
                            <a href="/signup" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#F59E0B] text-[#0D1117] text-[16px] font-bold hover:brightness-110 transition-all active:scale-95 shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                                Get Started Free <ArrowRight className="w-4 h-4" />
                            </a>
                            <a href="/login" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-xl border border-white/[0.1] text-white/70 text-[16px] font-medium hover:bg-white/[0.05] hover:text-white transition-all">
                                Sign In
                            </a>
                        </div>

                        <div className="flex items-center justify-center gap-3">
                            {/* Avatar placeholders */}
                            <div className="flex -space-x-2">
                                {['bg-amber-500', 'bg-emerald-500', 'bg-blue-500'].map((bg, i) => (
                                    <div key={i} className={`w-8 h-8 rounded-full ${bg} border-2 border-[#0D1117] flex items-center justify-center text-white text-[10px] font-bold`}>
                                        {['D', 'M', 'K'][i]}
                                    </div>
                                ))}
                            </div>
                            <p className="text-white/40 text-[13px]">Join drivers already saving time every morning</p>
                        </div>
                    </RevealOnScroll>
                </div>
            </section>


            {/* ═══════════════════════════════════════
                SECTION 11: FOOTER
               ═══════════════════════════════════════ */}
            <footer className="relative z-[1] py-12 px-5 sm:px-8 bg-[#0D1117]" style={{ borderTop: '1px solid rgba(245,158,11,0.15)' }}>
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-10">
                        {/* Brand */}
                        <div className="col-span-2 sm:col-span-1">
                            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-2.5 mb-4 group">
                                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center border border-white/[0.1] shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-white/[0.03] group-hover:scale-105 transition-transform duration-300">
                                    <img src="/logo3_nobg.png" alt="RoutAura" className="w-[140%] h-[140%] max-w-none object-cover rounded-full" />
                                </div>
                                <span className="text-[#F59E0B] font-bold text-xl">RoutAura</span>
                            </a>
                            <p className="text-white/30 text-[13px] leading-relaxed">AI-powered routing for drivers.<br />Describe your route. Drive in seconds.</p>
                        </div>

                        {/* Product */}
                        <div>
                            <h4 className="text-white/60 text-[11px] font-bold tracking-widest uppercase mb-4">Product</h4>
                            <ul className="space-y-2.5">
                                <li><a href="/login" className="text-white/40 text-[13px] hover:text-white transition-colors">Sign In</a></li>
                                <li><a href="/signup" className="text-white/40 text-[13px] hover:text-white transition-colors">Sign Up</a></li>
                                <li><a href="#how-it-works" className="text-white/40 text-[13px] hover:text-white transition-colors">How it Works</a></li>
                            </ul>
                        </div>

                        {/* Built With */}
                        <div>
                            <h4 className="text-white/60 text-[11px] font-bold tracking-widest uppercase mb-4">Built With</h4>
                            <ul className="space-y-2.5">
                                <li><span className="text-white/40 text-[13px]">LangChain</span></li>
                                <li><span className="text-white/40 text-[13px]">ChromaDB</span></li>
                                <li><span className="text-white/40 text-[13px]">Groq AI</span></li>
                            </ul>
                        </div>

                        {/* Developer */}
                        <div>
                            <h4 className="text-white/60 text-[11px] font-bold tracking-widest uppercase mb-4">Developer</h4>
                            <ul className="space-y-2.5">
                                <li><a href="#" className="text-white/40 text-[13px] hover:text-white transition-colors">GitHub</a></li>
                                <li><a href="#" className="text-white/40 text-[13px] hover:text-white transition-colors">Technical Docs</a></li>
                                <li><a href="#" className="text-white/40 text-[13px] hover:text-white transition-colors">PRD</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-white/[0.06] pt-6 text-center">
                        <p className="text-white/20 text-[12px]">© 2026 RoutAura. Built for drivers, powered by AI.</p>
                    </div>
                </div>
            </footer>

        </div>
    );
}
