/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,jsx}',
    ],
    theme: {
        extend: {
            colors: {
                base: '#0A0F1E',
                surface: '#111827',
                elevated: '#1a2235',
                accent: '#F59E0B',
                'accent-dim': '#92400E',
                'accent-glow': 'rgba(245, 158, 11, 0.15)',
                'text-primary': '#F9FAFB',
                'text-secondary': '#9CA3AF',
                'text-muted': '#4B5563',
                success: '#10B981',
                danger: '#EF4444',
                border: '#1F2937',
                'border-hl': '#374151',
            },
            fontFamily: {
                sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['"DM Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
            },
            fontSize: {
                base: ['16px', '24px'],
                lg: ['18px', '28px'],
                xl: ['20px', '30px'],
                '2xl': ['24px', '32px'],
                '3xl': ['30px', '36px'],
            },
            minWidth: { touch: '48px' },
            minHeight: { touch: '48px' },
            boxShadow: {
                'card': '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
                'card-lg': '0 4px 20px rgba(0,0,0,0.4)',
                'glow': '0 0 20px rgba(245,158,11,0.25)',
                'glow-lg': '0 0 40px rgba(245,158,11,0.20)',
            },
            borderRadius: {
                'xl': '12px',
                '2xl': '16px',
                '3xl': '20px',
            },
            keyframes: {
                'fade-up': {
                    '0%': { opacity: '0', transform: 'translateY(12px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'slide-up': {
                    '0%': { transform: 'translateY(100%)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'pulse-amber': {
                    '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.3' },
                    '40%': { transform: 'scale(1)', opacity: '1' },
                },
                'shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                'glow-pulse': {
                    '0%, 100%': { boxShadow: '0 0 15px rgba(245,158,11,0.2)' },
                    '50%': { boxShadow: '0 0 25px rgba(245,158,11,0.4)' },
                },
            },
            animation: {
                'fade-up': 'fade-up 0.15s ease-out forwards',
                'slide-up': 'slide-up 0.25s ease-out',
                'pulse-amber': 'pulse-amber 1.4s infinite ease-in-out both',
                'shimmer': 'shimmer 1.5s infinite linear',
                'glow-pulse': 'glow-pulse 2s infinite ease-in-out',
            },
        },
    },
    plugins: [],
};
