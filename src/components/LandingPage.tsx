import React, { useState } from 'react';
import {
  Shield, CalendarDays, Code2, Kanban, Sparkles, Bot,
  Dumbbell, Utensils, StickyNote, Terminal, ChevronRight,
  ArrowRight, Zap, Lock, RefreshCw,
} from 'lucide-react';

interface Props {
  onLogin: () => Promise<void>;
  loginError: string | null;
}

const FEATURES = [
  { icon: Shield,     label: 'Bunk Manager',    desc: 'Per-subject attendance with safe-to-bunk calculator and 3-tier threshold rings', color: '#10B981' },
  { icon: CalendarDays, label: 'Att. Calendar', desc: 'GitHub-style heatmap — click any past date to log or backfill sessions',           color: '#38BDF8' },
  { icon: Code2,      label: 'LeetCode Live',   desc: 'Connect your username for real-time stats, 26-week activity heatmap and streak',   color: '#FCD34D' },
  { icon: Kanban,     label: 'Task Board',      desc: 'Drag-and-drop Kanban for placement prep and EE assignments with categories',       color: '#6366F1' },
  { icon: Sparkles,   label: 'AI Study Plan',   desc: 'Gemini reads your data and builds a personalised 7-day study roadmap',             color: '#A78BFA' },
  { icon: Bot,        label: 'AI Mentor',       desc: 'Ask DSA questions, EE viva doubts — powered by Gemini 1.5 Flash',                color: '#818CF8' },
  { icon: Dumbbell,   label: 'Fitness Tracker', desc: 'Log workouts, track streak and view weekly activity breakdown chart',              color: '#F97316' },
  { icon: Utensils,   label: 'Diet Tracker',    desc: 'Daily calorie goal with animated progress bar and meal-type breakdown',            color: '#34D399' },
  { icon: StickyNote, label: 'Study Notes',     desc: 'Colour-coded sticky notes synced to Firestore in real time',                      color: '#F472B6' },
];

const PILLARS = [
  { icon: Zap,       label: 'Zero config',    desc: 'Firebase handles auth and data. No backend to deploy or maintain.' },
  { icon: Lock,      label: 'Private by default', desc: 'Your data is tied to your Google account — no one else can see it.' },
  { icon: RefreshCw, label: 'Real-time sync', desc: 'Firestore keeps every tab in sync across all your devices instantly.' },
];

export const LandingPage: React.FC<Props> = ({ onLogin, loginError }) => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    await onLogin();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#F1F5F9]">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 md:px-12 py-4 border-b border-[#1E1E2E] bg-[#09090B]/90 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#6366F1]/15 border border-[#6366F1]/30 rounded-md flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5 text-[#818CF8]" />
          </div>
          <div>
            <span className="font-bold text-[14px] text-[#F1F5F9] tracking-tight font-mono">CmdCenter</span>
            <span className="ml-2 text-[9px] text-[#6366F1] font-bold uppercase tracking-[0.15em]">PEC Edition</span>
          </div>
        </div>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#818CF8] active:scale-95 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-md text-sm transition-all"
          aria-label="Sign in with Google"
        >
          {loading
            ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <span>Open App</span>
          }
          {!loading && <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 pt-20 pb-16 max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[#6366F1]/10 border border-[#6366F1]/25 rounded-md px-3 py-1.5 text-[11px] font-mono font-semibold text-[#818CF8] mb-8">
          <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full live-dot" />
          Firebase · Gemini AI · React · Vite · PWA
        </div>

        <h1 className="text-4xl md:text-[58px] font-extrabold tracking-tight leading-[1.1] mb-6">
          Your{' '}
          <span className="text-[#818CF8]">engineering</span>
          <br />command center
        </h1>

        <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-10 leading-relaxed">
          The all-in-one dashboard for PEC students managing{' '}
          <span className="text-[#F1F5F9] font-medium">EE coursework</span>,{' '}
          <span className="text-[#F1F5F9] font-medium">placement prep</span>, and{' '}
          <span className="text-[#F1F5F9] font-medium">personal wellness</span> — powered by AI, synced in real time.
        </p>

        {/* Single CTA */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="inline-flex items-center justify-center gap-3 bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-60 text-[#09090B] font-bold py-3.5 px-8 rounded-lg text-base transition-all shadow-overlay"
          aria-label="Sign in with Google"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-[#09090B]/30 border-t-[#09090B] rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? 'Opening Google Sign-In…' : 'Sign in with Google — It\'s Free'}
        </button>

        {/* Error */}
        {loginError && (
          <div className="mt-4 inline-flex items-center gap-2 bg-red-500/8 border border-red-500/20 rounded-md px-4 py-2.5 text-sm text-red-400 max-w-sm">
            ⚠ {loginError}
          </div>
        )}

        <p className="text-[11px] text-[#334155] font-mono mt-4">
          No password · No setup · Your data stays private
        </p>
      </section>

      {/* ── Pillars ──────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 pb-16 max-w-3xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PILLARS.map(p => (
            <div key={p.label} className="bg-[#111118] border border-[#1E1E2E] rounded-lg p-4">
              <div className="w-8 h-8 bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-md flex items-center justify-center mb-3">
                <p.icon className="w-4 h-4 text-[#818CF8]" strokeWidth={1.75} />
              </div>
              <p className="text-[13px] font-semibold text-[#F1F5F9] mb-1">{p.label}</p>
              <p className="text-[12px] text-[#475569] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature grid ─────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 pb-20 max-w-6xl mx-auto">
        <div className="mb-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#F1F5F9] mb-2">
            10 modules. One dashboard.
          </h2>
          <p className="text-[#475569] text-sm">All talking to each other. No context switching.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map(f => (
            <div
              key={f.label}
              className="group bg-[#111118] border border-[#1E1E2E] hover:border-[#2D2D42] rounded-lg p-4 flex gap-3.5 items-start transition-all duration-150 hover:shadow-raised hover:-translate-y-px"
            >
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 border"
                style={{ background: `${f.color}12`, borderColor: `${f.color}25` }}
              >
                <f.icon className="w-4 h-4" style={{ color: f.color }} strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#F1F5F9] mb-1">{f.label}</p>
                <p className="text-[11px] text-[#475569] leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer CTA ───────────────────────────────────────────────────── */}
      <section className="border-t border-[#1E1E2E] px-6 py-12 text-center">
        <p className="text-[#94A3B8] text-sm mb-5">No account, no payment, no setup. Sign in and your dashboard is ready.</p>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-[#6366F1] hover:bg-[#818CF8] active:scale-95 text-white font-semibold px-6 py-2.5 rounded-md text-sm transition-all"
          aria-label="Get started with Google Sign-In"
        >
          Get started
          <ChevronRight className="w-4 h-4" />
        </button>
        <p className="text-[10px] text-[#334155] font-mono mt-5">© {new Date().getFullYear()} CmdCenter · Built for PEC Engineers</p>
      </section>
    </div>
  );
};
