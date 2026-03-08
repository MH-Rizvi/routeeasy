import { useNavigate } from 'react-router-dom';

export default function Header({ rightElement }) {
    const navigate = useNavigate();

    return (
        <div style={{ paddingTop: 'env(safe-area-inset-top)' }} className="shrink-0 bg-[#0A0F1E]/60 backdrop-blur-2xl sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.1)] border-b border-white/5 flex flex-col w-full lg:hidden border-b-[1px] border-[rgba(245,158,11,0.15)]">
            {/* Amber bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#F59E0B]/20 to-transparent" />
            <div className="min-h-[76px] sm:min-h-[96px] flex items-center justify-between px-4 sm:px-5 w-full">
                <div
                    className="flex items-center gap-0 cursor-pointer group sm:-ml-2"
                    onClick={() => navigate('/home')}
                >
                    <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-accent/30 blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-500 mix-blend-screen" />
                        <div className="w-[44px] h-[44px] sm:w-[54px] sm:h-[54px] rounded-full overflow-hidden flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(245,158,11,0.3)] bg-white/[0.03] relative z-10 transition-transform duration-500 group-hover:scale-105 group-hover:rotate-6 mx-2 sm:mx-3">
                            <img
                                src="/logo3_nobg.png"
                                alt="RoutAura Icon"
                                className="w-[140%] h-[140%] max-w-none object-cover rounded-full"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col justify-center translate-y-[1px]">
                        <div style={{ fontFamily: "'DM Sans', sans-serif" }} className="text-[26px] sm:text-[32px] leading-none flex items-baseline tracking-tight">
                            <span className="text-white font-extrabold group-hover:text-gray-100 transition-colors">Rout</span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 font-extrabold ml-[1px] group-hover:from-orange-400 group-hover:to-red-500 transition-all duration-500">igo</span>
                        </div>
                    </div>
                </div>
                {rightElement && (
                    <div className="flex flex-col items-end justify-center">
                        {rightElement}
                    </div>
                )}
            </div>
        </div>
    );
}
