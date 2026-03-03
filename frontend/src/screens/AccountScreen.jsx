/**
 * AccountScreen.jsx — Premium dashboard-style account management.
 * Two-column on desktop, single column on mobile.
 * Follows the dark/amber Routigo design system.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import { updateProfile, changePassword, deleteAccount, logout } from '../api/client';

/* ── Inline SVG Icons ─────────────────────────── */
const Icon = {
    Edit: (p) => <svg {...p} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
    Lock: (p) => <svg {...p} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    Trash: (p) => <svg {...p} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>,
    LogOut: (p) => <svg {...p} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    User: (p) => <svg {...p} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    MapPin: (p) => <svg {...p} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
    Mail: (p) => <svg {...p} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
    Calendar: (p) => <svg {...p} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    Shield: (p) => <svg {...p} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    Check: (p) => <svg {...p} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    AlertTriangle: (p) => <svg {...p} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    ChevronRight: (p) => <svg {...p} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>,
    X: (p) => <svg {...p} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
};

/* ── Mini Components ──────────────────────────── */

function InfoRow({ icon, label, value }) {
    return (
        <div className="flex items-start gap-3 py-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/10 flex items-center justify-center shrink-0 mt-0.5 text-amber-500">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white/35 uppercase tracking-[0.12em] mb-0.5">{label}</p>
                <p className="text-[15px] font-medium text-white/90 truncate">{value || <span className="text-white/25 italic">Not provided</span>}</p>
            </div>
        </div>
    );
}

function SectionCard({ children, className = '', danger = false }) {
    const base = danger
        ? 'bg-gradient-to-br from-red-500/[0.04] via-[#111827]/90 to-[#0A0F1E]/95 border-red-500/15'
        : 'bg-gradient-to-br from-amber-500/[0.04] via-[#111827]/90 to-[#0A0F1E]/95 border-white/[0.06]';
    return (
        <div className={`border rounded-2xl backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.25)] transition-all duration-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.35)] ${base} ${className}`}>
            {children}
        </div>
    );
}

function SectionHeader({ icon, title, action }) {
    return (
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-2.5">
                <div className="text-amber-500">{icon}</div>
                <h3 className="text-[15px] font-bold text-white/90 tracking-tight">{title}</h3>
            </div>
            {action}
        </div>
    );
}

function InputField({ label, type = 'text', required = false, maxLen, uppercase, value, onChange, placeholder }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-white/40 uppercase tracking-[0.12em] pl-1">{label}</label>
            <input
                type={type}
                required={required}
                maxLength={maxLen}
                placeholder={placeholder}
                className={`w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-[14px] text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/30 transition-all duration-200 ${uppercase ? 'uppercase' : ''}`}
                value={value}
                onChange={onChange}
            />
        </div>
    );
}

/* ── Main Component ───────────────────────────── */

export default function AccountScreen() {
    const navigate = useNavigate();
    const { user, setUser } = useAuthStore();
    const showToast = useToastStore(state => state.showToast);

    // Active panel for the right column
    const [activePanel, setActivePanel] = useState('overview'); // overview | edit-profile | change-password | delete-account

    // Sign out modal
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // Form states
    const [editForm, setEditForm] = useState({
        first_name: '', last_name: '', birthday: '', city: '', state: '', zip_code: ''
    });
    const [passwordForm, setPasswordForm] = useState({
        current_password: '', new_password: '', confirm_password: ''
    });
    const [deleteText, setDeleteText] = useState('');
    const [loading, setLoading] = useState(false);

    // Populate edit form when switching to edit
    useEffect(() => {
        if (activePanel === 'edit-profile' && user) {
            setEditForm({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                birthday: user.birthday || '',
                city: user.city || '',
                state: user.state || '',
                zip_code: user.zip_code || ''
            });
        }
        if (activePanel === 'change-password') {
            setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        }
        if (activePanel === 'delete-account') {
            setDeleteText('');
        }
    }, [activePanel, user]);

    if (!user) return null;

    const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U';

    // Member since
    const memberSince = user.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Recently';

    const maskEmail = (email) => {
        if (!email) return '';
        const [name, domain] = email.split('@');
        if (name.length <= 2) return `${name[0]}*@${domain}`;
        return `${name[0]}${name[1]}***@${domain}`;
    };

    /* ── Handlers ────────────────────────────── */

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updated = await updateProfile({
                first_name: editForm.first_name,
                last_name: editForm.last_name,
                birthday: editForm.birthday || null,
                city: editForm.city,
                state: editForm.state,
                zip_code: editForm.zip_code
            });
            setUser(updated);
            setActivePanel('overview');
            showToast('Profile updated successfully', 'success');
        } catch {
            showToast('Failed to update profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            return showToast('New passwords do not match', 'error');
        }
        if (passwordForm.new_password.length < 8) {
            return showToast('Password must be at least 8 characters', 'error');
        }
        setLoading(true);
        try {
            await changePassword(passwordForm.current_password, passwordForm.new_password);
            setActivePanel('overview');
            showToast('Password changed successfully', 'success');
        } catch (err) {
            showToast(err.response?.data?.detail || 'Failed to change password', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteText !== 'DELETE') return;
        setLoading(true);
        try {
            await deleteAccount();
            useAuthStore.getState().setUser(null);
            showToast('Account deleted', 'success');
            navigate('/');
        } catch {
            showToast('Failed to delete account', 'error');
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        setShowLogoutModal(false);
        await logout();
    };

    /* ── Right Panel Renderers ────────────────── */

    const renderOverviewPanel = () => (
        <div className="space-y-5 animate-fade-in">
            {/* Personal Information */}
            <SectionCard>
                <SectionHeader
                    icon={<Icon.User />}
                    title="Personal Information"
                    action={
                        <button onClick={() => setActivePanel('edit-profile')} className="flex items-center gap-1.5 text-[12px] font-bold text-amber-500 hover:text-amber-400 transition-colors group">
                            <Icon.Edit className="group-hover:rotate-12 transition-transform" /> Edit
                        </button>
                    }
                />
                <div className="px-6 pb-6 divide-y divide-white/[0.04]">
                    <InfoRow icon={<Icon.User />} label="Full Name" value={`${user.first_name || ''} ${user.last_name || ''}`.trim()} />
                    <InfoRow icon={<Icon.Calendar />} label="Birthday" value={user.birthday ? new Date(user.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : null} />
                    <InfoRow icon={<Icon.MapPin />} label="Location" value={[user.city, user.state, user.zip_code].filter(Boolean).join(', ') || null} />
                </div>
            </SectionCard>

            {/* Account & Security */}
            <SectionCard>
                <SectionHeader icon={<Icon.Shield />} title="Account & Security" />
                <div className="px-6 pb-2 divide-y divide-white/[0.04]">
                    <InfoRow icon={<Icon.Mail />} label="Email Address" value={maskEmail(user.email)} />
                    <InfoRow icon={<Icon.Lock />} label="Password" value="••••••••" />
                </div>
                <div className="px-6 pb-6">
                    <button
                        onClick={() => setActivePanel('change-password')}
                        className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-[13px] font-semibold text-white/80 hover:bg-white/[0.06] hover:border-amber-500/20 transition-all duration-200 group"
                    >
                        <span className="flex items-center gap-2"><Icon.Lock className="text-amber-500/70" /> Change Password</span>
                        <Icon.ChevronRight className="text-white/30 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                    </button>
                </div>
            </SectionCard>

            {/* Danger Zone */}
            <SectionCard danger>
                <SectionHeader icon={<Icon.AlertTriangle className="text-red-500" />} title="Danger Zone" />
                <div className="px-6 pb-6">
                    <p className="text-[13px] text-white/40 mb-4 leading-relaxed">Permanently delete your account and all associated data. This action cannot be undone.</p>
                    <button
                        onClick={() => setActivePanel('delete-account')}
                        className="w-full flex items-center justify-between px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[13px] font-semibold text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-all duration-200 group"
                    >
                        <span className="flex items-center gap-2"><Icon.Trash /> Delete Account</span>
                        <Icon.ChevronRight className="text-red-400/50 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                </div>
            </SectionCard>
        </div>
    );

    const renderEditProfilePanel = () => (
        <div className="animate-fade-in">
            <SectionCard>
                <SectionHeader
                    icon={<Icon.Edit className="text-amber-500" />}
                    title="Edit Profile"
                    action={
                        <button onClick={() => setActivePanel('overview')} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/50 hover:text-white transition-all">
                            <Icon.X />
                        </button>
                    }
                />
                <form onSubmit={handleProfileSubmit} className="px-6 pb-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="First Name" required value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} />
                        <InputField label="Last Name" required value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} />
                    </div>
                    <InputField label="Birthday" type="date" value={editForm.birthday} onChange={e => setEditForm({ ...editForm, birthday: e.target.value })} />
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-3 sm:col-span-1">
                            <InputField label="City" required value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} />
                        </div>
                        <InputField label="State" required maxLen={2} uppercase value={editForm.state} onChange={e => setEditForm({ ...editForm, state: e.target.value })} />
                        <InputField label="Zip Code" required value={editForm.zip_code} onChange={e => setEditForm({ ...editForm, zip_code: e.target.value })} />
                    </div>
                    <div className="flex gap-3 pt-3">
                        <button type="button" onClick={() => setActivePanel('overview')} className="flex-1 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl font-bold text-white/80 text-[14px] hover:bg-white/[0.08] transition-all">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-bold text-white text-[14px] hover:shadow-[0_4px_20px_rgba(245,158,11,0.35)] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2">
                            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Icon.Check /> Save Changes</>}
                        </button>
                    </div>
                </form>
            </SectionCard>
        </div>
    );

    const renderChangePasswordPanel = () => (
        <div className="animate-fade-in">
            <SectionCard>
                <SectionHeader
                    icon={<Icon.Lock className="text-amber-500" />}
                    title="Change Password"
                    action={
                        <button onClick={() => setActivePanel('overview')} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/50 hover:text-white transition-all">
                            <Icon.X />
                        </button>
                    }
                />
                <form onSubmit={handlePasswordSubmit} className="px-6 pb-6 space-y-4">
                    <InputField label="Current Password" type="password" required value={passwordForm.current_password} onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })} placeholder="Enter current password" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="New Password" type="password" required value={passwordForm.new_password} onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })} placeholder="Min 8 characters" />
                        <InputField label="Confirm Password" type="password" required value={passwordForm.confirm_password} onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} placeholder="Repeat new password" />
                    </div>
                    <div className="flex gap-3 pt-3">
                        <button type="button" onClick={() => setActivePanel('overview')} className="flex-1 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl font-bold text-white/80 text-[14px] hover:bg-white/[0.08] transition-all">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-bold text-white text-[14px] hover:shadow-[0_4px_20px_rgba(245,158,11,0.35)] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2">
                            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Icon.Check /> Update Password</>}
                        </button>
                    </div>
                </form>
            </SectionCard>
        </div>
    );

    const renderDeleteAccountPanel = () => (
        <div className="animate-fade-in">
            <SectionCard danger>
                <SectionHeader
                    icon={<Icon.AlertTriangle className="text-red-500" />}
                    title="Delete Account"
                    action={
                        <button onClick={() => setActivePanel('overview')} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/50 hover:text-white transition-all">
                            <Icon.X />
                        </button>
                    }
                />
                <div className="px-6 pb-6 space-y-5">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                        <div className="flex gap-3">
                            <Icon.AlertTriangle className="text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[14px] font-bold text-red-400 mb-1">This is permanent</p>
                                <p className="text-[13px] text-white/50 leading-relaxed">All your saved routes, trip history, stops, and personal data will be permanently erased. You won't be able to recover anything.</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-red-400/80 uppercase tracking-[0.12em] pl-1">Type DELETE to confirm</label>
                        <input
                            type="text"
                            className="w-full px-4 py-3.5 bg-black/30 border border-red-500/30 rounded-xl text-white text-center font-bold tracking-[0.3em] uppercase text-[16px] focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/40 transition-all placeholder-white/15"
                            value={deleteText}
                            onChange={e => setDeleteText(e.target.value)}
                            placeholder="DELETE"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setActivePanel('overview')} className="flex-1 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl font-bold text-white/80 text-[14px] hover:bg-white/[0.08] transition-all">Cancel</button>
                        <button type="button" onClick={handleDeleteAccount} disabled={deleteText !== 'DELETE' || loading} className="flex-1 py-3 bg-red-500 rounded-xl font-bold text-white text-[14px] hover:bg-red-600 shadow-[0_4px_15px_rgba(239,68,68,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98] flex items-center justify-center gap-2">
                            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Icon.Trash /> Delete Forever</>}
                        </button>
                    </div>
                </div>
            </SectionCard>
        </div>
    );

    const rightPanel = {
        'overview': renderOverviewPanel,
        'edit-profile': renderEditProfilePanel,
        'change-password': renderChangePasswordPanel,
        'delete-account': renderDeleteAccountPanel,
    }[activePanel]?.();

    /* ── Render ───────────────────────────────── */

    return (
        <div className="flex flex-col h-full animate-page-enter bg-base">
            <Header />

            <div className="flex-1 overflow-y-auto hide-scrollbar pb-24">
                <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

                    {/* Two-column grid on desktop */}
                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

                        {/* ── Left Column: Profile Card ─────────── */}
                        <div className="w-full lg:w-[340px] lg:shrink-0 lg:sticky lg:top-[96px]">
                            <SectionCard className="overflow-hidden">
                                {/* Amber gradient banner */}
                                <div className="h-24 bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-transparent relative">
                                    <div className="absolute inset-0 bg-[url('/logo3_nobg.png')] bg-center bg-no-repeat bg-contain opacity-[0.06]" />
                                    {/* Decorative grid dots */}
                                    <div className="absolute inset-0" style={{
                                        backgroundImage: 'radial-gradient(circle, rgba(245,158,11,0.15) 1px, transparent 1px)',
                                        backgroundSize: '16px 16px'
                                    }} />
                                </div>

                                {/* Avatar */}
                                <div className="flex justify-center -mt-12 relative z-10">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#0d0d1a] border-[3px] border-[#111827] flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative z-10">
                                            <span className="text-amber-500 text-[28px] font-extrabold tracking-wider leading-none">{initials}</span>
                                        </div>
                                        {/* Animated ring */}
                                        <div className="absolute -inset-1 rounded-2xl border border-amber-500/30 animate-pulse pointer-events-none z-0" />
                                        <div className="absolute -inset-2 rounded-2xl border border-amber-500/10 pointer-events-none z-0" />
                                    </div>
                                </div>

                                {/* User info */}
                                <div className="text-center px-6 pt-5 pb-6">
                                    <h2 className="text-[22px] font-extrabold text-white tracking-tight mb-0.5">
                                        {user.first_name} {user.last_name}
                                    </h2>
                                    <p className="text-white/40 text-[13px] mb-4">{user.email}</p>

                                    {/* Quick info chips */}
                                    <div className="flex flex-wrap justify-center gap-2 mb-5">
                                        {user.city && user.state && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-white/60 font-medium">
                                                <Icon.MapPin className="w-3 h-3 text-amber-500/70" /> {user.city}, {user.state}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12px] text-white/60 font-medium">
                                            <Icon.Calendar className="w-3 h-3 text-amber-500/70" /> Joined {memberSince}
                                        </span>
                                    </div>

                                    {/* Divider */}
                                    <div className="w-12 h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent mx-auto mb-5" />

                                    {/* Sign Out */}
                                    <button
                                        onClick={() => setShowLogoutModal(true)}
                                        className="w-full flex items-center justify-center gap-2 py-3 text-[13px] font-bold text-red-400/80 bg-red-500/[0.05] border border-red-500/15 rounded-xl hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all duration-200 active:scale-[0.98]"
                                    >
                                        <Icon.LogOut className="w-4 h-4" /> Sign Out
                                    </button>
                                </div>
                            </SectionCard>
                        </div>

                        {/* ── Right Column: Content ─────────────── */}
                        <div className="w-full lg:flex-1 min-w-0">
                            {rightPanel}
                        </div>

                    </div>
                </div>
            </div>

            {/* ── Logout Modal ────────────────────────── */}
            {showLogoutModal && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setShowLogoutModal(false)}
                >
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

                    {/* Modal */}
                    <div
                        className="relative w-full max-w-[400px] bg-gradient-to-br from-[#141824] via-[#111827] to-[#0d1117] border border-white/[0.08] rounded-3xl p-8 shadow-[0_25px_60px_rgba(0,0,0,0.6)] text-center"
                        onClick={e => e.stopPropagation()}
                        style={{ animation: 'modalPop 0.3s cubic-bezier(0.16,1,0.3,1) forwards' }}
                    >
                        {/* Subtle amber glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 rounded-b-full bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

                        <img src="/logo3_nobg.png" alt="Routigo" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-5 border border-white/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]" />
                        <h3 className="text-xl font-extrabold text-white mb-2 tracking-tight">Sign Out</h3>
                        <p className="text-[14px] text-white/50 mb-8 leading-relaxed">Are you sure you want to sign out of Routigo?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-3.5 bg-white/[0.04] border border-white/[0.1] rounded-xl font-bold text-white/80 text-[14px] hover:bg-white/[0.08] transition-all">Cancel</button>
                            <button onClick={handleLogout} className="flex-1 py-3.5 bg-red-500 rounded-xl font-bold text-white text-[14px] hover:bg-red-600 shadow-[0_4px_15px_rgba(239,68,68,0.3)] transition-all active:scale-[0.98]">Yes, Sign Out</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal animation keyframe (injected once) */}
            <style>{`
                @keyframes modalPop {
                    from { opacity: 0; transform: scale(0.92) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.25s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
