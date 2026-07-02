import React, { useState } from 'react';
import {
  GraduationCap, Code2, CalendarCheck, Bot, Dumbbell, Utensils,
  Kanban, StickyNote, Sparkles, Shield, ChevronRight, Zap,
  BarChart2, Brain,
} from 'lucide-react';

interface Props {
  onLogin: () => Promise<void>;
  loginError: string | null;
}

const FEATURES = [
  { icon: Shield,      label: 'Bunk Manager',   desc: 'Track attendance per subject with safe-to-bunk calculator', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { icon: CalendarCheck, label: 'Att. Calendar', desc: 'GitHub-style heatmap — click any past date to log sessions',  color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20'    },
  { icon: Code2,       label: 'LeetCode Live',  desc: 'Connect your account for real-time stats, streak & heatmap',  color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/20'},
  { icon: Kanban,      label: 'Task Board',     desc: 'Drag-and-drop Kanban for placement prep & EE assignments',    color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20'    },
  { icon: Sparkles,    label: 'AI Study Plan',  desc: 'Gemini reads your data & builds a personalized 7-day plan',   color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20'},
  { icon: Bot,         label: 'AI Mentor',      desc: 'Ask DSA questions, EE doubts — powered by Gemini 1.5',        color: 'text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo-500/20'},
  { icon: Dumbbell,    label: 'Fitness Tracker',desc: 'Log workouts, track streak & weekly activity chart',           color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20'},
  { icon: Utensils,    label: 'Diet Tracker',   desc: 'Daily calorie goal with animated progress bar & meal types',   color: 'text-green-400',   bg: 'bg-green-500/10 border-green-500/20'  },
  { icon: StickyNote,  label: 'Study Notes',    desc: 'Color-coded sticky notes synced to Firestore in real time',    color: 'text-pink-400',    bg: 'bg-pink-500/10 border-pink-500/20'   },
];

const STATS = [
  { value: '10+', label: 'Powerful Modules' },
  { value: 'AI',  label: 'Gemini Powered'  },
  { value: '∞',   label: 'Real-time Sync'  },
  { value: '0',   label: 'Config Needed'   },
];

export const LandingPage: React.FC<Props> = ({ onLogin, loginError }) => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    await onLogin();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* ─── Background glows ─────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[20%] w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-indigo-500/6 rounded-full blur-[150px]" />
        <div className="absolute top-[40%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/4 rounded-full blur-[150px]" />
      </div>

      {/* ─── Header nav ───────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 border-b border-slate-800/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <GraduationCap className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-slate-100 tracking-tight">CmdCenter</span>
            <span className="ml-2 text-[10px] text-emerald-500 font-bold uppercase tracking-widest">PEC Edition</span>
          </div>
        </div>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-60 text-slate-900 font-bold px-4 py-2 rounded-xl text-sm transition-all"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          Get Started
        </button>
      </header>

      {/* ─── Hero section ─────────────────────────────────────────────────── */}
      <section className="relative z-10 text-center px-6 md:px-12 pt-20 pb-16 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 text-xs font-semibold text-emerald-400 mb-8">
          <Zap className="w-3.5 h-3.5" />
          Zero config · Firebase · Gemini AI · React
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          Your{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400">
            Engineering
          </span>
          <br />Command Center
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          The all-in-one dashboard for PEC students juggling <strong className="text-slate-200">EE coursework</strong>,{' '}
          <strong className="text-slate-200">placement prep</strong>, and{' '}
          <strong className="text-slate-200">personal wellness</strong> — powered by AI, synced in real-time.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full sm:w-auto bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-60 text-slate-900 font-bold py-4 px-8 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl text-base"
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )
            }
            {loading ? 'Opening Google Sign-In…' : 'Sign in with Google — It\'s Free'}
          </button>
        </div>

        {/* Error banner */}
        {loginError && (
          <div className="mt-4 inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 max-w-sm">
            ⚠️ {loginError}
          </div>
        )}

        <p className="text-xs text-slate-600 mt-4">
          No password required · Your data syncs privately to your Google account
        </p>
      </section>

      {/* ─── Stats row ────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 md:px-12 pb-16">
        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(s => (
            <div key={s.label} className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 text-center">
              <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-cyan-400 font-mono">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features grid ────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 md:px-12 pb-20 max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
          Everything in{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">one place</span>
        </h2>
        <p className="text-slate-400 text-center text-sm mb-10">10 modules, all talking to each other. No context switching.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div
              key={f.label}
              className="group bg-slate-800/40 border border-slate-700/60 hover:border-slate-600 rounded-2xl p-5 flex gap-4 items-start transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20"
            >
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${f.bg}`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <div>
                <p className="font-bold text-slate-200 text-sm mb-1">{f.label}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 py-16 border-t border-slate-800/60 text-center">
        <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center">
          <Brain className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Ready to level up?</h2>
        <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">Sign in and your Command Center is ready instantly. No setup. No payment. Just focus.</p>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-900 font-bold px-8 py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
        >
          {loading ? 'Opening…' : <>Start your dashboard <ChevronRight className="w-4 h-4" /></>}
        </button>
        <p className="text-xs text-slate-700 mt-4">© {new Date().getFullYear()} CmdCenter · Built for PEC Engineers</p>
      </section>
    </div>
  );
};
