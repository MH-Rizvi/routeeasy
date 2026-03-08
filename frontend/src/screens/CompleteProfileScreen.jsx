import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile, getMe, logout } from '../api/client';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import US_STATES from '../utils/usStates';
import CityAutocomplete from '../components/CityAutocomplete';

const Icons = {
    User: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    MapPin: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
    Hash: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" /></svg>,
    Loader2: ({ className }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`animate-spin ${className}`}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>,
};

export default function CompleteProfileScreen() {
    const navigate = useNavigate();
    const setUser = useAuthStore(state => state.setUser);
    const user = useAuthStore(state => state.user);
    const showToast = useToastStore(state => state.showToast);

    // Form inputs
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [city, setCity] = useState('');
    const [stateInput, setStateInput] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [birthday, setBirthday] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Pre-fill names from Google metadata if available in our local user object
    useEffect(() => {
        if (user) {
            if (user.first_name) setFirstName(user.first_name);
            if (user.last_name) setLastName(user.last_name);
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!firstName || !lastName || !city || !stateInput) {
            return setError('Name, city and state are required.');
        }
        if (zipCode && !/^\d{5}$/.test(zipCode)) return setError('Zip code must be exactly 5 digits.');

        setLoading(true);
        try {
            // PATCH /api/v1/auth/me handles the profile update logic
            const updatedUser = await updateProfile({
                first_name: firstName,
                last_name: lastName,
                city,
                state: stateInput,
                zip_code: zipCode,
                birthday: birthday || null
            });

            // Re-fetch full user profile to confirm updates
            const fullUser = await getMe();
            setUser(fullUser);

            showToast('Welcome to RoutAura! Your profile is complete.', 'success');
            navigate('/home', { replace: true });
        } catch (err) {
            console.error('[CompleteProfile] Profile update failed:', err);
            setError('Failed to save profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-base flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
            <div className="w-full max-w-[520px] py-12">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border border-white/[0.08] shadow-[0_4px_20px_rgba(245,158,11,0.2)] bg-amber-500/10 mx-auto mb-6">
                        <img src="/logo3_nobg.png" alt="RoutAura Logo" className="w-[140%] h-[140%] max-w-none object-cover" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent mb-2">Almost there, Driver.</h1>
                    <p className="text-white/40 text-lg font-medium">Please finish setting up your account.</p>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.06] rounded-[2rem] p-8 shadow-2xl backdrop-blur-3xl animate-page-enter">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 text-red-400 text-[14px]">
                            <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="leading-relaxed">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        {/* Name Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-white/50 uppercase tracking-widest pl-1">First Name</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-accent transition-colors"><Icons.User /></div>
                                    <input type="text" required className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all text-lg" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-white/50 uppercase tracking-widest pl-1">Last Name</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-accent transition-colors"><Icons.User /></div>
                                    <input type="text" required className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all text-lg" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Location Inputs */}
                        <div className="space-y-2">
                            <label className="text-[12px] font-bold text-white/50 uppercase tracking-widest pl-1">State</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-accent transition-colors"><Icons.MapPin /></div>
                                <select
                                    required
                                    className="w-full pl-12 pr-10 py-4 bg-black/20 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all text-lg appearance-none cursor-pointer"
                                    value={stateInput}
                                    onChange={(e) => { setStateInput(e.target.value); setCity(''); }}
                                >
                                    <option value="" className="bg-[#0c0c0e] text-white/20">Select state...</option>
                                    {US_STATES.map(s => <option key={s.abbr} value={s.abbr} className="bg-[#0c0c0e] text-white">{s.name} ({s.abbr})</option>)}
                                </select>
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-white/20">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[12px] font-bold text-white/50 uppercase tracking-widest pl-1">City</label>
                            <CityAutocomplete
                                value={city}
                                onChange={setCity}
                                stateAbbr={stateInput}
                                inputClassName="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/5 rounded-2xl text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all text-lg disabled:opacity-30 disabled:cursor-not-allowed"
                                className="relative group"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-white/50 uppercase tracking-widest pl-1">Zip Code</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-accent transition-colors"><Icons.Hash /></div>
                                    <input type="text" maxLength={5} className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all text-lg" placeholder="11801" value={zipCode} onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ''))} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[12px] font-bold text-white/50 uppercase tracking-widest pl-1">Birthday</label>
                                <input type="date" className="w-full px-5 py-4 bg-black/20 border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all text-lg" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || !city || !firstName}
                            className="mt-6 w-full flex items-center justify-center gap-3 bg-accent text-white py-5 px-6 rounded-2xl font-bold shadow-2xl shadow-accent/20 hover:bg-amber-500 hover:scale-[1.01] transition-all active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 min-h-touch text-lg"
                        >
                            {loading && <Icons.Loader2 className="w-6 h-6 animate-spin" />}
                            {loading ? 'Creating Profile...' : 'Complete Profile'}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-white/50 text-[14px]">
                            Use a different account?
                            <button
                                onClick={logout}
                                className="text-accent font-semibold hover:text-amber-400 py-1 transition-colors min-h-touch ml-1"
                            >
                                Sign out
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
