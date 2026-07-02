/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    // Status colours used dynamically
    'text-emerald-400','text-amber-400','text-red-400','text-sky-400',
    'text-violet-400','text-indigo-400','bg-indigo-500/10','border-indigo-500/20',
    'text-yellow-400',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Design token palette — single source of truth
        canvas:   '#09090B',
        surface:  { DEFAULT: '#111118', 2: '#18181F', 3: '#1F1F2A' },
        sidebar:  '#0D0D12',
        border:   { DEFAULT: '#1E1E2E', subtle: '#252535', strong: '#2D2D42' },
        accent:   { DEFAULT: '#6366F1', hover: '#818CF8', muted: '#6366F115' },
        // Status
        success:  '#10B981',
        warning:  '#F59E0B',
        danger:   '#EF4444',
        info:     '#38BDF8',
        ai:       '#A78BFA',
        lc:       '#FCD34D',
        // Slate override
        slate: { 950: '#020617' },
      },
      borderRadius: {
        // Override sm/md/lg to our system
        sm:  '4px',
        md:  '6px',
        lg:  '8px',
        xl:  '12px',
        '2xl': '16px',
      },
      animation: {
        'panel-in':  'panelIn 200ms cubic-bezier(0.4,0,0.2,1)',
        'msg-in':    'msgIn 150ms ease-out',
        'flicker':   'flicker 2s ease-in-out infinite alternate',
        'fade-in':   'fadeIn 300ms ease-out',
        'count-up':  'countUp 600ms cubic-bezier(0.22,1,0.36,1)',
      },
      keyframes: {
        panelIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        msgIn: {
          '0%':   { opacity: '0', transform: 'scale(0.97) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        flicker: {
          '0%,100%': { filter: 'brightness(1) drop-shadow(0 0 4px #f97316)' },
          '50%':     { filter: 'brightness(1.3) drop-shadow(0 0 8px #f97316)' },
        },
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        countUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'surface': '0 1px 3px rgba(0,0,0,0.4)',
        'raised':  '0 4px 24px rgba(0,0,0,0.6)',
        'overlay': '0 8px 40px rgba(0,0,0,0.8)',
        'glow-accent': '0 0 20px -5px rgba(99,102,241,0.4)',
        'glow-success': '0 0 20px -5px rgba(16,185,129,0.35)',
      },
    },
  },
  plugins: [],
};
