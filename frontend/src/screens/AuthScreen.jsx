import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, signup } from '../api/client';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';

const Icons = {
    Mail: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
    Lock: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    MapPin: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
    Building: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></svg>,
    Hash: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>,
    Loader2: ({ className }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`animate-spin ${className}`}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
};

export default function AuthScreen() {
    const navigate = useNavigate();
    const setUser = useAuthStore(state => state.setUser);
    const showToast = useToastStore(state => state.showToast);

    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [signupStep, setSignupStep] = useState(1); // 1: Creds, 2: Location

    // Forms
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [city, setCity] = useState('');
    const [stateInput, setStateInput] = useState('');
    const [zipCode, setZipCode] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email || !password) return setError('Email and password required.');

        setLoading(true);
        try {
            const data = await login(email, password);
            setUser(data.user);
            navigate('/', { replace: true });
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || 'Incorrect email or password. Please try again.';
            setError(typeof msg === 'string' ? msg : 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignupStep1 = (e) => {
        e.preventDefault();
        setError('');
        if (!email || !password || !confirmPassword) return setError('All fields required.');
        if (password !== confirmPassword) return setError('Passwords do not match.');
        if (password.length < 8) return setError('Password must be at least 8 characters.');
        setSignupStep(2);
    };

    const handleSignupStep2 = async (e) => {
        e.preventDefault();
        setError('');
        if (!city || !stateInput || !zipCode) return setError('All location fields required.');

        setLoading(true);
        try {
            const data = await signup(email, password, city, stateInput, String(zipCode));
            setUser(data.user);
            showToast('Account created successfully!', 'success');
            navigate('/', { replace: true });
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
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div className="flex flex-col min-h-screen bg-bg-app safe-area-top relative">
            <div className="absolute top-0 left-0 right-0 h-64 bg-accent/5 rounded-b-[40px] border-b border-border/50 pointer-events-none" />

            <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 w-full max-w-sm mx-auto">
                <div className="mb-10 flex flex-col items-center">
                    <img
                        src="/logo2_nobg.png"
                        alt="Routigo Logo"
                        className="w-[380px] h-auto object-contain drop-shadow-[0_10px_30px_rgba(37,99,235,0.2)] -mt-10 -mb-2 pointer-events-none animate-in fade-in zoom-in duration-500"
                    />
                    <h1 className="text-3xl font-bold tracking-tight text-text-primary">Routigo</h1>
                    <p className="text-text-muted mt-2 text-center text-sm">
                        {mode === 'login' ? 'Welcome back. Let\'s get routing.' : 'Create an account to hit the road.'}
                    </p>
                </div>

                <div className="w-full bg-surface border border-border rounded-3xl p-6 shadow-sm">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-500 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="mt-0.5">{error}</span>
                        </div>
                    )}

                    {mode === 'login' && (
                        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-text-muted ml-1 uppercase tracking-wider">Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                                        <Icons.Mail />
                                    </div>
                                    <input
                                        type="email" required
                                        className="w-full pl-10 pr-4 py-3 bg-bg-app border border-border rounded-xl text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-base"
                                        placeholder="driver@example.com"
                                        value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-text-muted ml-1 uppercase tracking-wider">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                                        <Icons.Lock />
                                    </div>
                                    <input
                                        type="password" required
                                        className="w-full pl-10 pr-4 py-3 bg-bg-app border border-border rounded-xl text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-base"
                                        placeholder="••••••••"
                                        value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                                    />
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className="mt-2 w-full flex items-center justify-center gap-2 bg-accent text-white py-3 px-4 rounded-xl font-semibold shadow-sm hover:bg-accent-hover transition-colors active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 min-h-touch text-base">
                                {loading && <Icons.Loader2 className="w-5 h-5 text-white" />}
                                {loading ? 'Signing In...' : 'Sign In'}
                            </button>
                        </form>
                    )}

                    {mode === 'signup' && (
                        <>
                            <div className="flex gap-2 mb-6 justify-center">
                                <div className={`h-1.5 w-12 rounded-full transition-colors ${signupStep >= 1 ? 'bg-accent' : 'bg-border'}`} />
                                <div className={`h-1.5 w-12 rounded-full transition-colors ${signupStep >= 2 ? 'bg-accent' : 'bg-border'}`} />
                            </div>

                            {signupStep === 1 && (
                                <form onSubmit={handleSignupStep1} className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-text-muted ml-1 uppercase tracking-wider">Email</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted"><Icons.Mail /></div>
                                            <input type="email" required className="w-full pl-10 pr-4 py-3 bg-bg-app border border-border rounded-xl text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-base" placeholder="driver@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-text-muted ml-1 uppercase tracking-wider">Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted"><Icons.Lock /></div>
                                            <input type="password" required className="w-full pl-10 pr-4 py-3 bg-bg-app border border-border rounded-xl text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-base" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-text-muted ml-1 uppercase tracking-wider">Confirm Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted"><Icons.Lock /></div>
                                            <input type="password" required className="w-full pl-10 pr-4 py-3 bg-bg-app border border-border rounded-xl text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-base" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                        </div>
                                    </div>
                                    <button type="submit" className="mt-2 w-full flex items-center justify-center gap-2 bg-accent text-white py-3 px-4 rounded-xl font-semibold shadow-sm hover:bg-accent-hover transition-colors active:scale-[0.98] min-h-touch text-base">
                                        Next Base
                                    </button>
                                </form>
                            )}

                            {signupStep === 2 && (
                                <form onSubmit={handleSignupStep2} className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <p className="text-sm text-text-muted text-center mb-1">Set your default routing start location.</p>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-text-muted ml-1 uppercase tracking-wider">City</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted"><Icons.Building /></div>
                                            <input type="text" required className="w-full pl-10 pr-4 py-3 bg-bg-app border border-border rounded-xl text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-base" placeholder="e.g. Hicksville" value={city} onChange={(e) => setCity(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="space-y-1 flex-1">
                                            <label className="text-xs font-semibold text-text-muted ml-1 uppercase tracking-wider">State</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted"><Icons.MapPin /></div>
                                                <input type="text" required className="w-full pl-10 pr-4 py-3 bg-bg-app border border-border rounded-xl text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-base uppercase" placeholder="NY" maxLength={2} value={stateInput} onChange={(e) => setStateInput(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="space-y-1 flex-1">
                                            <label className="text-xs font-semibold text-text-muted ml-1 uppercase tracking-wider">Zip</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted"><Icons.Hash /></div>
                                                <input type="text" inputMode="numeric" required className="w-full pl-10 pr-4 py-3 bg-bg-app border border-border rounded-xl text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent min-h-touch text-base" placeholder="11801" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-2">
                                        <button type="button" onClick={() => setSignupStep(1)} disabled={loading} className="w-1/3 flex items-center justify-center gap-2 bg-bg-app border border-border text-text-primary py-3 px-4 rounded-xl font-semibold hover:bg-surface-hover transition-colors active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 min-h-touch text-base">
                                            Back
                                        </button>
                                        <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-accent text-white py-3 px-4 rounded-xl font-semibold shadow-sm hover:bg-accent-hover transition-colors active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 min-h-touch text-base">
                                            {loading && <Icons.Loader2 className="w-5 h-5 text-white" />}
                                            {loading ? 'Creating...' : 'Create'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </>
                    )}
                </div>

                <div className="mt-8 text-center text-sm font-medium">
                    {mode === 'login' ? (
                        <p className="text-text-muted">
                            Don't have an account? <button onClick={toggleMode} className="text-accent hover:underline active:text-accent-hover tracking-wide px-2 py-1 min-h-touch">Sign up</button>
                        </p>
                    ) : (
                        <p className="text-text-muted">
                            Already have an account? <button onClick={toggleMode} className="text-accent hover:underline active:text-accent-hover tracking-wide px-2 py-1 min-h-touch">Log in</button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
