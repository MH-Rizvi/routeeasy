import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, signup, loginWithGoogle, checkEmail } from '../api/client';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import US_STATES from '../utils/usStates';
import CityAutocomplete from '../components/CityAutocomplete';

const Icons = {
    Mail: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
    Lock: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    MapPin: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
    Building: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></svg>,
    Hash: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>,
    Loader2: ({ className }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`animate-spin ${className}`}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>,
    ArrowLeft: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
};

export default function AuthScreen() {
    const navigate = useNavigate();
    const setUser = useAuthStore(state => state.setUser);
    const showToast = useToastStore(state => state.showToast);

    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [signupStep, setSignupStep] = useState(1); // 1: Creds, 2: Location, 3: Personal
    const [showVerification, setShowVerification] = useState(false); // email verification screen

    // Forms
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [city, setCity] = useState('');
    const [stateInput, setStateInput] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [birthday, setBirthday] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [emailExists, setEmailExists] = useState(false);

    const handleEmailBlur = async () => {
        if (!email || mode !== 'signup') return;
        setCheckingEmail(true);
        setError('');
        try {
            const exists = await checkEmail(email);
            setEmailExists(exists);
        } catch (err) {
            console.error('Error checking email:', err);
        } finally {
            setCheckingEmail(false);
        }
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email || !password) return setError('Email and password required.');

        setLoading(true);
        try {
            const data = await login(email, password);
            setUser(data.user, data.access_token);
            navigate('/home', { replace: true });
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || 'Incorrect email or password. Please try again.';
            setError(typeof msg === 'string' ? msg : 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            // Clear any stale session to prevent PKCE code verifier mismatches
            // on subsequent login attempts if the first one was abandoned.
            await supabase.auth.signOut();

            // Initiate OAuth directly from the frontend so the JS SDK 
            // can handle the PKCE code verifier automatically.
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`
                }
            });
            if (error) throw error;
        } catch (err) {
            console.error(err);
            setError('Failed to initialize Google login.');
            setLoading(false);
        }
    };

    const handleSignupStep1 = (e) => {
        e.preventDefault();
        setError('');
        if (!firstName || !lastName || !email || !password || !confirmPassword) return setError('All fields required.');
        if (emailExists) return setError('Email already exists. Please sign in instead.');
        if (password !== confirmPassword) return setError('Passwords do not match.');
        if (password.length < 8) return setError('Password must be at least 8 characters.');
        setSignupStep(2);
    };

    const handleSignupStep2 = (e) => {
        e.preventDefault();
        setError('');
        if (!city || !stateInput) return setError('City and state are required.');
        if (!city) return setError('Please select a city from the suggestions.');
        if (zipCode && !/^\d{5}$/.test(zipCode)) return setError('Zip code must be exactly 5 digits.');
        setSignupStep(3);
    };

    const handleSignupStep3 = async (e, skip = false) => {
        if (e && e.preventDefault) e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const finalBirthday = skip ? null : (birthday || null);
            const data = await signup(firstName, lastName, finalBirthday, email, password, city, stateInput, String(zipCode));

            // If email verification is required, show confirmation screen
            if (data.requires_verification) {
                setShowVerification(true);
                setLoading(false);
                return;
            }

            setUser(data.user, data.access_token);
            showToast('Account created successfully!', 'success');
            navigate('/home', { replace: true });
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || 'Something went wrong. Please try again.';
            setError(typeof msg === 'string' ? msg : 'Signup failed. Please check inputs.');
            setSignupStep(1);
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setMode(mode === 'login' ? 'signup' : 'login');
        setSignupStep(1);
        setError('');
        setFirstName('');
        setLastName('');
        setPassword('');
        setConfirmPassword('');
        setBirthday('');
    };

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-base text-white animate-page-enter">

            {/* Back Navigation */}
            <button
                onClick={() => navigate('/')}
                className="absolute top-6 left-6 z-50 flex items-center gap-2 text-white/50 hover:text-white transition-colors duration-200 text-[14px] font-medium"
            >
                <Icons.ArrowLeft /> Back to home
            </button>

            {/* ═══ LEFT SIDE (Branding) ═══ */}
            <div className="hidden md:flex flex-1 relative bg-surface border-r border-white/[0.06] overflow-hidden items-center justify-center p-12">
                {/* Background effects */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-amber-500/[0.05] rounded-full blur-[100px]" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-amber-600/[0.03] rounded-full blur-[80px]" />
                </div>

                <div className="relative z-10 max-w-md">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border border-white/[0.1] shadow-lg shadow-amber-500/20 bg-white/[0.03]">
                            <img src="/logo3_nobg.png" alt="Routigo" className="w-[140%] h-[140%] max-w-none object-cover rounded-full" />
                        </div>
                        <span className="text-accent font-extrabold text-[40px] tracking-tight">Routigo</span>
                    </div>
                    <h2 className="text-[clamp(32px,4vw,48px)] font-bold leading-tight mb-6">
                        <span className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">Routing,</span><br />
                        <span className="text-accent">reimagined.</span>
                    </h2>
                    <p className="text-white/50 text-[16px] leading-relaxed mb-10 border-l-2 border-amber-500/30 pl-4">
                        "Since switching to Routigo, I've saved hours every week planning my drop-offs. The AI just knows where I need to go."
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-[18px]">
                            🏎️
                        </div>
                        <div>
                            <p className="text-white text-[14px] font-semibold">Alex D.</p>
                            <p className="text-white/40 text-[12px]">Delivery Driver</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ RIGHT SIDE (Form) ═══ */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative min-h-screen md:min-h-0 bg-base">
                {/* Mobile branding */}
                <div className="md:hidden flex flex-col items-center mb-10 mt-14 relative z-10 pb-4">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center border border-white/[0.08] shadow-[0_0_20px_rgba(245,158,11,0.2)] bg-white/[0.03] mb-4">
                        <img src="/logo3_nobg.png" alt="Routigo Logo" className="w-[150%] h-[150%] max-w-none object-cover rounded-full" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Routigo</h1>
                </div>

                <div className="w-full max-w-[420px] relative z-10 pb-8">
                    {/* Desktop Heading */}
                    <div className="mb-8 hidden md:block">
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {mode === 'login' ? 'Welcome back' : 'Create your account'}
                        </h2>
                        <p className="text-white/50 text-[15px]">
                            {mode === 'login' ? 'Enter your details to sign in.' : 'Join Routigo and start saving time.'}
                        </p>
                    </div>

                    {/* Premium Form Card */}
                    <div className="w-full bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
                        {error && (
                            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-[13px] font-medium">
                                <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span className="mt-0.5 leading-relaxed">{error}</span>
                            </div>
                        )}

                        {mode === 'login' && (
                            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-semibold text-white/60 uppercase tracking-widest pl-1">Email</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40"><Icons.Mail /></div>
                                        <input
                                            type="email" required
                                            className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-[16px] transition-colors"
                                            placeholder="driver@example.com"
                                            value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-semibold text-white/60 uppercase tracking-widest pl-1">Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40"><Icons.Lock /></div>
                                        <input
                                            type="password" required
                                            className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-[16px] transition-colors"
                                            placeholder="••••••••"
                                            value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                                        />
                                    </div>
                                </div>
                                <button type="submit" disabled={loading} className="mt-4 w-full flex items-center justify-center gap-2 bg-accent text-white py-3.5 px-4 rounded-xl font-bold shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:bg-amber-500 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 min-h-touch text-[16px]">
                                    {loading && <Icons.Loader2 className="w-5 h-5" />}
                                    {loading ? 'Signing In...' : 'Sign In'}
                                </button>

                                <div className="flex items-center gap-4 py-2">
                                    <div className="h-[1px] flex-1 bg-white/[0.06]"></div>
                                    <span className="text-[12px] font-medium text-white/40 uppercase tracking-widest">or</span>
                                    <div className="h-[1px] flex-1 bg-white/[0.06]"></div>
                                </div>

                                <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full flex items-center justify-center gap-3 bg-white text-black py-3.5 px-4 rounded-xl font-bold hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 min-h-touch text-[16px]">
                                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" /><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" /><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" /><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" /></g></svg>
                                    Continue with Google
                                </button>
                            </form>
                        )}
                        {mode === 'signup' && (
                            <>
                                {showVerification ? (
                                    <div className="flex flex-col items-center text-center py-8">
                                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 mb-6">
                                            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-3">Account created!</h3>
                                        <p className="text-white/60 mb-8 leading-relaxed">
                                            Please check your email and click the verification link to continue.
                                        </p>
                                        <button
                                            onClick={() => {
                                                setShowVerification(false);
                                                setMode('login');
                                            }}
                                            className="w-full bg-white/[0.05] border border-white/[0.1] text-white py-3.5 px-4 rounded-xl font-bold hover:bg-white/[0.1] transition-all active:scale-[0.98] min-h-touch text-[16px]"
                                        >
                                            Return to login
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Polished Step Indicators */}
                                        <div className="flex items-center justify-center gap-3 mb-8">
                                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-[13px] font-bold border-2 transition-all duration-300 ${signupStep >= 1 ? 'bg-accent border-accent text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-transparent border-white/[0.1] text-white/30'}`}>
                                                1
                                            </div>
                                            <div className={`w-8 sm:w-12 h-[2px] rounded-full transition-all duration-300 ${signupStep >= 2 ? 'bg-accent/50' : 'bg-white/[0.06]'}`} />
                                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-[13px] font-bold border-2 transition-all duration-300 ${signupStep >= 2 ? 'bg-accent border-accent text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-transparent border-white/[0.1] text-white/30'}`}>
                                                2
                                            </div>
                                            <div className={`w-8 sm:w-12 h-[2px] rounded-full transition-all duration-300 ${signupStep === 3 ? 'bg-accent/50' : 'bg-white/[0.06]'}`} />
                                            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-[13px] font-bold border-2 transition-all duration-300 ${signupStep === 3 ? 'bg-accent border-accent text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-transparent border-white/[0.1] text-white/30'}`}>
                                                3
                                            </div>
                                        </div>

                                        {signupStep === 1 && (
                                            <form onSubmit={handleSignupStep1} className="flex flex-col gap-4">
                                                <div className="flex flex-col sm:flex-row gap-4">
                                                    <div className="space-y-1.5 flex-1">
                                                        <label className="text-[12px] font-semibold text-white/60 uppercase tracking-widest pl-1">First Name</label>
                                                        <input type="text" required className="w-full px-4 py-3.5 bg-black/20 border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-[16px] transition-colors" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                                    </div>
                                                    <div className="space-y-1.5 flex-1">
                                                        <label className="text-[12px] font-semibold text-white/60 uppercase tracking-widest pl-1">Last Name</label>
                                                        <input type="text" required className="w-full px-4 py-3.5 bg-black/20 border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-[16px] transition-colors" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[12px] font-semibold text-white/60 uppercase tracking-widest pl-1">Email</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40"><Icons.Mail /></div>
                                                        <input
                                                            type="email" required
                                                            className={`w-full pl-12 pr-12 py-3.5 bg-black/20 border rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 min-h-touch text-[16px] transition-colors ${emailExists ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500' : 'border-white/[0.08] focus:ring-accent/50 focus:border-accent'}`}
                                                            placeholder="driver@example.com"
                                                            value={email}
                                                            onChange={(e) => { setEmail(e.target.value); setEmailExists(false); }}
                                                            onBlur={handleEmailBlur}
                                                        />
                                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                                            {checkingEmail ? (
                                                                <Icons.Loader2 className="w-5 h-5 text-white/50" />
                                                            ) : emailExists ? (
                                                                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                            ) : email && !emailExists ? (
                                                                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    {emailExists && (
                                                        <p className="text-red-400 text-[12px] pl-1 mt-1">
                                                            Email already exists. <button type="button" onClick={() => { setMode('login'); setEmailExists(false); }} className="underline font-bold hover:text-red-300">Sign in instead</button>
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[12px] font-semibold text-white/60 uppercase tracking-widest pl-1">Password</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40"><Icons.Lock /></div>
                                                        <input type="password" required className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-[16px] transition-colors" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[12px] font-semibold text-white/60 uppercase tracking-widest pl-1">Confirm Password</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40"><Icons.Lock /></div>
                                                        <input type="password" required className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-[16px] transition-colors" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                                    </div>
                                                </div>
                                                <button type="submit" className="mt-4 w-full flex items-center justify-center gap-2 bg-accent text-white py-3.5 px-4 rounded-xl font-bold shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:bg-amber-500 transition-all active:scale-[0.98] min-h-touch text-[16px]">
                                                    Next Step →
                                                </button>
                                            </form>
                                        )}

                                        {signupStep === 2 && (
                                            <form onSubmit={handleSignupStep2} className="flex flex-col gap-5">
                                                <p className="text-[14px] text-white/50 text-center mb-2">Set your default routing start location.</p>
                                                <div className="space-y-1.5">
                                                    <label className="text-[12px] font-semibold text-white/60 uppercase tracking-widest pl-1">State</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40"><Icons.MapPin /></div>
                                                        <select
                                                            required
                                                            className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/[0.08] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-[16px] transition-colors appearance-none cursor-pointer"
                                                            value={stateInput}
                                                            onChange={(e) => { setStateInput(e.target.value); setCity(''); }}
                                                        >
                                                            <option value="" className="bg-[#111827] text-white/50">Select a state...</option>
                                                            {US_STATES.map(s => (
                                                                <option key={s.abbr} value={s.abbr} className="bg-[#111827] text-white">
                                                                    {s.name} ({s.abbr})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-white/30">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[12px] font-semibold text-white/60 uppercase tracking-widest pl-1">City</label>
                                                    <CityAutocomplete
                                                        value={city}
                                                        onChange={setCity}
                                                        stateAbbr={stateInput}
                                                        inputClassName="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-[16px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                        className="relative"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[12px] font-semibold text-white/60 uppercase tracking-widest pl-1">Zip Code <span className="text-white/30 normal-case">(optional)</span></label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40"><Icons.Hash /></div>
                                                        <input type="text" inputMode="numeric" maxLength={5} className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-[16px] transition-colors" placeholder="11801" value={zipCode} onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setZipCode(v); }} />
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 mt-4">
                                                    <button type="button" onClick={() => setSignupStep(1)} disabled={loading} className="w-1/3 flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.08] text-white hover:bg-white/[0.08] py-3.5 px-4 rounded-xl font-bold transition-all active:scale-[0.98] min-h-touch text-[16px] disabled:opacity-50">
                                                        Back
                                                    </button>
                                                    <button type="submit" disabled={loading || !city} className="flex-1 flex items-center justify-center gap-2 bg-white/[0.08] text-white py-3.5 px-4 rounded-xl font-bold hover:bg-white/[0.12] transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 min-h-touch text-[16px]">
                                                        Next Step →
                                                    </button>
                                                </div>
                                            </form>
                                        )}

                                        {signupStep === 3 && (
                                            <form onSubmit={(e) => handleSignupStep3(e, false)} className="flex flex-col gap-5">
                                                <p className="text-[14px] text-white/50 text-center mb-2">Almost there! Add a bit more detail (Optional).</p>
                                                <div className="space-y-1.5">
                                                    <label className="text-[12px] font-semibold text-white/60 uppercase tracking-widest pl-1">Birthday</label>
                                                    <input type="date" className="w-full px-4 py-3.5 bg-black/20 border border-white/[0.08] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-[16px] transition-colors" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
                                                </div>
                                                <div className="flex gap-3 mt-4">
                                                    <button type="button" onClick={(e) => handleSignupStep3(e, true)} disabled={loading} className="w-1/3 flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.08] py-3.5 px-4 rounded-xl font-bold transition-all active:scale-[0.98] min-h-touch text-[14px] disabled:opacity-50">
                                                        Skip
                                                    </button>
                                                    <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-accent text-white py-3.5 px-4 rounded-xl font-bold shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:bg-amber-500 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 min-h-touch text-[16px]">
                                                        {loading && <Icons.Loader2 className="w-5 h-5" />}
                                                        {loading ? 'Creating...' : 'Create Account'}
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    <div className="mt-8 text-center text-[14px]">
                        {mode === 'login' ? (
                            <p className="text-white/50">
                                Don't have an account? <button onClick={toggleMode} className="text-accent font-semibold hover:text-amber-400 py-1 transition-colors min-h-touch ml-1">Sign up</button>
                            </p>
                        ) : (
                            <p className="text-white/50">
                                Already have an account? <button onClick={toggleMode} className="text-accent font-semibold hover:text-amber-400 py-1 transition-colors min-h-touch ml-1">Log in</button>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}
