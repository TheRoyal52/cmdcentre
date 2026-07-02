import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { auth, googleProvider } from './lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './lib/firebase';
import type { User } from 'firebase/auth';
import type { PlacementTask, AttendanceRecord, LeetCodeLog, WorkoutLog, MealLog } from './types';
import {
  LogOut, LayoutDashboard, CalendarCheck, Kanban, Code2, Bot,
  GraduationCap, StickyNote, CalendarDays, Sparkles, Dumbbell,
  Utensils, Settings, Flame, CheckCircle2, Shield, Menu, X,
  Terminal, ChevronRight, TrendingUp, Zap,
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { Toaster, toast } from 'sonner';
import { CommandPalette } from './components/CommandPalette';
import type { Tab } from './components/CommandPalette';
import { DashboardSkeleton, CardSkeleton, LeetCodeSkeleton } from './components/Skeleton';

// Lazy-loaded heavy views
const BunkManager        = lazy(() => import('./components/BunkManager').then(m => ({ default: m.BunkManager })));
const KanbanBoard        = lazy(() => import('./components/KanbanBoard').then(m => ({ default: m.KanbanBoard })));
const LeetCodeLogger     = lazy(() => import('./components/LeetCodeLogger').then(m => ({ default: m.LeetCodeLogger })));
const LeetCodeStats      = lazy(() => import('./components/LeetCodeStats').then(m => ({ default: m.LeetCodeStats })));
const GeminiChatbot      = lazy(() => import('./components/GeminiChatbot').then(m => ({ default: m.GeminiChatbot })));
const StudyNotes         = lazy(() => import('./components/StudyNotes').then(m => ({ default: m.StudyNotes })));
const PomodoroTimer      = lazy(() => import('./components/PomodoroTimer').then(m => ({ default: m.PomodoroTimer })));
const AttendanceCalendar = lazy(() => import('./components/AttendanceCalendar').then(m => ({ default: m.AttendanceCalendar })));
const AIStudyPlan        = lazy(() => import('./components/AIStudyPlan').then(m => ({ default: m.AIStudyPlan })));
const FitnessTracker     = lazy(() => import('./components/FitnessTracker').then(m => ({ default: m.FitnessTracker })));
const DietTracker        = lazy(() => import('./components/DietTracker').then(m => ({ default: m.DietTracker })));
const SettingsModal      = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const LandingPage        = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));

/* ─── Nav Config ─────────────────────────────────────────────────────────── */
interface NavItem { id: Tab; icon: React.ElementType; label: string; shortcut: string; }

const NAV: NavItem[] = [
  { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Overview',        shortcut: 'G D' },
  { id: 'BUNK',      icon: Shield,          label: 'Attendance',      shortcut: 'G B' },
  { id: 'CALENDAR',  icon: CalendarDays,    label: 'Att. Calendar',   shortcut: 'G C' },
  { id: 'KANBAN',    icon: Kanban,          label: 'Task Board',      shortcut: 'G K' },
  { id: 'LEETCODE',  icon: Code2,           label: 'LeetCode',        shortcut: 'G L' },
  { id: 'CHAT',      icon: Bot,             label: 'AI Mentor',       shortcut: 'G A' },
  { id: 'AI_PLAN',   icon: Sparkles,        label: 'Study Plan',      shortcut: 'G P' },
  { id: 'FITNESS',   icon: Dumbbell,        label: 'Fitness',         shortcut: 'G F' },
  { id: 'DIET',      icon: Utensils,        label: 'Diet',            shortcut: 'G T' },
  { id: 'NOTES',     icon: StickyNote,      label: 'Study Notes',     shortcut: 'G N' },
];

const NAV_GROUPS = [
  { label: 'Academics', ids: ['DASHBOARD','BUNK','CALENDAR','KANBAN'] as Tab[] },
  { label: 'Placement',  ids: ['LEETCODE'] as Tab[] },
  { label: 'AI',         ids: ['CHAT','AI_PLAN'] as Tab[] },
  { label: 'Wellness',   ids: ['FITNESS','DIET'] as Tab[] },
  { label: 'Utilities',  ids: ['NOTES'] as Tab[] },
];

const AI_TABS: Tab[] = ['CHAT', 'AI_PLAN'];

/* ─── Stat Card ──────────────────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  delta?: string;
  deltaPositive?: boolean;
  icon: React.ElementType;
  accentColor: string;  // CSS hex
  accentAlpha: string;  // CSS rgba string for bg/border
  sparkline?: number[];
}

const StatCard: React.FC<StatCardProps> = ({
  label, value, sub, delta, deltaPositive, icon: Icon, accentColor, accentAlpha, sparkline,
}) => (
  <div className="relative bg-[#111118] border border-[#1E1E2E] rounded-lg p-4 hover:border-[#2D2D42] hover:shadow-raised transition-all duration-150 overflow-hidden group animate-count-up">
    {/* Corner glow */}
    <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.06] -translate-y-10 translate-x-10 pointer-events-none" style={{ background: accentColor }} />

    <div className="flex items-start justify-between mb-3">
      <div className="p-1.5 rounded-md" style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}28` }}>
        <Icon className="w-4 h-4" style={{ color: accentColor }} />
      </div>
      {delta !== undefined && (
        <span className={twMerge(
          'text-[11px] font-semibold px-1.5 py-0.5 rounded border font-mono',
          deltaPositive
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            : 'text-red-400 bg-red-500/10 border-red-500/20',
        )}>
          {deltaPositive ? '↑' : '↓'} {delta}
        </span>
      )}
    </div>

    <p className="text-2xl font-bold font-mono tabular-nums" style={{ color: accentColor }}>
      {value}
    </p>
    <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider mt-0.5">{label}</p>
    {sub && <p className="text-[10px] text-[#334155] mt-0.5 truncate">{sub}</p>}

    {/* Sparkline */}
    {sparkline && sparkline.length > 0 && (
      <div className="flex items-end gap-[2px] mt-3 h-7">
        {sparkline.map((v, i) => {
          const max = Math.max(...sparkline, 1);
          const h = Math.round((v / max) * 100);
          return (
            <div key={i} className="flex-1 rounded-[2px] transition-all duration-500" style={{
              height: `${Math.max(h, 8)}%`,
              background: i === sparkline.length - 1 ? accentColor : `${accentColor}50`,
            }} />
          );
        })}
      </div>
    )}
  </div>
);

/* ─── Sidebar ─────────────────────────────────────────────────────────────── */
const SidebarContent: React.FC<{
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  onSettings: () => void;
  onCmdPalette: () => void;
  onClose?: () => void;
  user: User;
  onLogout: () => void;
}> = ({ activeTab, onTabChange, onSettings, onCmdPalette, onClose, user, onLogout }) => {
  const firstName = user.displayName?.split(' ')[0] ?? 'Engineer';

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#1E1E2E] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#6366F1]/15 border border-[#6366F1]/30 rounded-md flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5 text-[#818CF8]" />
            </div>
            <div>
              <span className="font-bold text-[14px] tracking-tight text-[#F1F5F9] font-mono">CmdCenter</span>
              <p className="text-[9px] text-[#6366F1] font-bold uppercase tracking-[0.15em] leading-none mt-0.5">PEC Edition</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={onSettings} className="p-1.5 rounded-md hover:bg-[#1F1F2A] text-[#475569] hover:text-[#94A3B8] transition-colors" aria-label="Settings">
              <Settings className="w-3.5 h-3.5" />
            </button>
            {onClose && (
              <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[#1F1F2A] text-[#475569] hover:text-[#94A3B8] transition-colors md:hidden" aria-label="Close menu">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Command palette trigger */}
        <button
          onClick={onCmdPalette}
          className="mt-3 w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#1F1F2A] border border-[#1E1E2E] text-[#475569] hover:text-[#94A3B8] hover:border-[#2D2D42] transition-all group"
          aria-label="Open command palette"
        >
          <Terminal className="w-3 h-3" />
          <span className="text-[12px] flex-1 text-left">Search commands…</span>
          <kbd className="text-[9px] font-mono bg-[#0D0D12] border border-[#1E1E2E] px-1 py-0.5 rounded hidden sm:block">⌘K</kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map(group => {
          const items = NAV.filter(n => group.ids.includes(n.id));
          return (
            <div key={group.label}>
              <p className="section-label px-2 mb-1.5">{group.label}</p>
              <div className="space-y-0.5">
                {items.map(tab => {
                  const isActive = activeTab === tab.id;
                  const isAI = AI_TABS.includes(tab.id);
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { onTabChange(tab.id); onClose?.(); }}
                      className={twMerge(
                        'group relative w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150',
                        isActive
                          ? 'bg-[#6366F1]/10 text-[#F1F5F9]'
                          : 'text-[#475569] hover:text-[#94A3B8] hover:bg-[#1F1F2A]',
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {/* Active accent bar */}
                      {isActive && (
                        <span className="absolute left-0 inset-y-1.5 w-[3px] bg-[#6366F1] rounded-full" />
                      )}
                      <tab.icon
                        className={twMerge('w-[15px] h-[15px] shrink-0', isActive ? 'text-[#818CF8]' : '')}
                        strokeWidth={1.75}
                      />
                      <span className="truncate flex-1">{tab.label}</span>
                      {isAI && (
                        <span className={twMerge('text-[9px] font-bold px-1.5 py-0.5 rounded-sm border font-mono',
                          isActive ? 'badge-ai' : 'text-[#334155] border-[#1E1E2E] bg-transparent')}>
                          AI
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Pomodoro */}
      <div className="hidden lg:block shrink-0">
        <Suspense fallback={null}>
          <PomodoroTimer />
        </Suspense>
      </div>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-[#1E1E2E] shrink-0">
        <div className="flex items-center gap-2.5 mb-2.5">
          {user.photoURL
            ? <img src={user.photoURL} alt="" className="w-7 h-7 rounded-md border border-[#2D2D42]" />
            : <div className="w-7 h-7 rounded-md bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center text-[#818CF8] font-bold text-xs">{firstName[0]}</div>
          }
          <div className="overflow-hidden">
            <p className="text-xs font-semibold truncate text-[#F1F5F9]">{firstName}</p>
            <p className="text-[10px] text-[#475569] truncate">{user.email}</p>
          </div>
          {/* Firebase connected indicator */}
          <div className="ml-auto flex items-center gap-1" title="Firestore connected">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] live-dot" />
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-[#475569] hover:text-red-400 hover:bg-red-500/8 rounded-md border border-transparent hover:border-red-500/15 transition-all"
          aria-label="Sign out"
        >
          <LogOut className="w-3 h-3" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

/* ─── Full-screen loader ─────────────────────────────────────────────────── */
const FullScreenLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090B] gap-4">
    <div className="w-10 h-10 bg-[#6366F1]/15 border border-[#6366F1]/30 rounded-lg flex items-center justify-center">
      <Terminal className="w-5 h-5 text-[#818CF8]" />
    </div>
    <div className="w-5 h-5 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
    <p className="text-[#475569] text-sm font-mono">Initializing…</p>
  </div>
);

/* ─── Page header (reusable) ─────────────────────────────────────────────── */
const PageHeader: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => (
  <header className="mb-6 pb-4 border-b border-[#1E1E2E]">
    <h1 className="text-xl font-bold text-[#F1F5F9] tracking-tight">{title}</h1>
    {sub && <p className="text-sm text-[#475569] mt-1">{sub}</p>}
  </header>
);

/* ─── Main App ────────────────────────────────────────────────────────────── */
export default function App() {
  const [user,          setUser]          = useState<User | null>(null);
  const [authLoading,   setAuthLoading]   = useState(true);
  const [activeTab,     setActiveTab]     = useState<Tab>('DASHBOARD');
  const [prevTab,       setPrevTab]       = useState<Tab>('DASHBOARD');
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [paletteOpen,   setPaletteOpen]   = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [lcTab,         setLcTab]         = useState<'stats' | 'log'>('stats');
  const [loginError,    setLoginError]    = useState<string | null>(null);
  const [dataReady,     setDataReady]     = useState(false);

  const [tasks,      setTasks]      = useState<PlacementTask[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leetLogs,   setLeetLogs]   = useState<LeetCodeLog[]>([]);
  const [workouts,   setWorkouts]   = useState<WorkoutLog[]>([]);
  const [meals,      setMeals]      = useState<MealLog[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    let resolved = false;
    const markReady = () => { if (!resolved) { resolved = true; setDataReady(true); } };
    const subs = [
      onSnapshot(collection(db, 'tasks'), s => { setTasks(s.docs.map(d => ({ id: d.id, ...d.data() } as PlacementTask))); markReady(); }),
      onSnapshot(collection(db, 'attendance'), s => { setAttendance(s.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord))); markReady(); }),
      onSnapshot(query(collection(db, 'leetcodeLogs'), orderBy('dateSolved', 'desc')), s => { setLeetLogs(s.docs.map(d => ({ id: d.id, ...d.data() } as LeetCodeLog))); markReady(); }),
      onSnapshot(collection(db, 'workouts'), s => setWorkouts(s.docs.map(d => ({ id: d.id, ...d.data() } as WorkoutLog)))),
      onSnapshot(collection(db, 'meals'), s => setMeals(s.docs.map(d => ({ id: d.id, ...d.data() } as MealLog)))),
    ];
    const timeout = setTimeout(markReady, 2000);
    return () => { subs.forEach(u => u()); clearTimeout(timeout); };
  }, [user]);

  // Dashboard derived stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const doneTasks   = tasks.filter(t => t.status === 'DONE').length;
    const avgAtt      = attendance.length === 0 ? 0 :
      attendance.reduce((s, a) => s + (a.totalClasses === 0 ? 0 : (a.attendedClasses / a.totalClasses) * 100), 0) / attendance.length;
    const leet7days   = leetLogs.filter(l => { const d = new Date(l.dateSolved); const c = new Date(); c.setDate(c.getDate() - 7); return d >= c; }).length;
    const todayMins   = workouts.filter(w => w.date.startsWith(today)).reduce((s, w) => s + w.duration, 0);
    const todayCals   = meals.filter(m => m.date.startsWith(today)).reduce((s, m) => s + m.calories, 0);
    const daySet      = new Set(leetLogs.map(l => new Date(l.dateSolved).toDateString()));
    let lcStreak = 0; const d = new Date();
    while (daySet.has(d.toDateString())) { lcStreak++; d.setDate(d.getDate() - 1); }

    // 7-day sparklines
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(); dd.setDate(dd.getDate() - (6 - i));
      return dd.toISOString().split('T')[0];
    });
    const lcSparkline = last7.map(d => leetLogs.filter(l => l.dateSolved.startsWith(d)).length);
    const workoutSparkline = last7.map(d => workouts.filter(w => w.date.startsWith(d)).reduce((s, w) => s + w.duration, 0));

    return { doneTasks, avgAtt, leet7days, lcStreak, todayMins, todayCals, lcSparkline, workoutSparkline };
  }, [tasks, attendance, leetLogs, workouts, meals]);

  const navigateTo = useCallback((tab: Tab) => {
    setPrevTab(activeTab);
    setActiveTab(tab);
    setSidebarOpen(false);
  }, [activeTab]);

  // Keyboard shortcuts
  useEffect(() => {
    let gPressed = false;
    let gTimer: ReturnType<typeof setTimeout>;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

      // ⌘K / Ctrl+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(v => !v);
        return;
      }

      if (isInput) return;

      // G then X navigation shortcuts
      if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey) {
        gPressed = true;
        clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 1500);
        return;
      }
      if (gPressed) {
        const map: Record<string, Tab> = {
          d: 'DASHBOARD', b: 'BUNK', c: 'CALENDAR', k: 'KANBAN',
          l: 'LEETCODE', a: 'CHAT', p: 'AI_PLAN', f: 'FITNESS', t: 'DIET', n: 'NOTES',
        };
        const target = map[e.key.toLowerCase()];
        if (target) { navigateTo(target); gPressed = false; }
      }

      // ? → show command palette
      if (e.key === '?') { setPaletteOpen(true); }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigateTo]);

  const login = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Welcome back!');
    } catch (e: any) {
      const code: string = e?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      if (code === 'auth/popup-blocked')
        setLoginError('Pop-up blocked. Please allow pop-ups for this site and try again.');
      else if (code === 'auth/network-request-failed')
        setLoginError('Network error. Check your connection and try again.');
      else
        setLoginError('Sign-in failed. Please try again.');
      console.error('[Auth error]', e);
    }
  };

  const logout = async () => { await signOut(auth); setDataReady(false); toast.info('Signed out.'); };

  if (authLoading) return <FullScreenLoader />;

  if (!user) {
    return (
      <>
        <Toaster position="bottom-right" theme="dark" richColors />
        <Suspense fallback={<FullScreenLoader />}>
          <LandingPage onLogin={login} loginError={loginError} />
        </Suspense>
      </>
    );
  }

  const firstName = user.displayName?.split(' ')[0] ?? 'Engineer';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const activeNav = NAV.find(n => n.id === activeTab);

  return (
    <div className="h-screen flex bg-[#09090B] text-[#F1F5F9] overflow-hidden">
      {/* Toast provider */}
      <Toaster position="bottom-right" theme="dark" richColors />

      {/* Settings modal */}
      <Suspense fallback={null}>
        <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </Suspense>

      {/* Command Palette */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={navigateTo}
        onSettings={() => { setSettingsOpen(true); setPaletteOpen(false); }}
        onLogout={logout}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={twMerge(
        'fixed md:relative inset-y-0 left-0 z-40 w-[220px] shrink-0 flex flex-col',
        'bg-[#0D0D12] border-r border-[#1E1E2E]',
        'transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}>
        <SidebarContent
          activeTab={activeTab}
          onTabChange={navigateTo}
          onSettings={() => { setSettingsOpen(true); setSidebarOpen(false); }}
          onCmdPalette={() => { setPaletteOpen(true); setSidebarOpen(false); }}
          onClose={() => setSidebarOpen(false)}
          user={user}
          onLogout={logout}
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

        {/* Desktop top bar */}
        <header className="hidden md:flex items-center gap-4 px-6 py-3 border-b border-[#1E1E2E] bg-[#09090B] shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-[#334155] font-mono">~</span>
            <ChevronRight className="w-3 h-3 text-[#334155]" />
            <span className="text-[#475569] font-medium">
              {activeNav?.label ?? 'Overview'}
            </span>
          </div>

          <div className="flex-1" />

          {/* ⌘K trigger */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#111118] border border-[#1E1E2E] rounded-md text-[#475569] hover:text-[#94A3B8] hover:border-[#2D2D42] transition-all text-sm"
            aria-label="Open command palette"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="text-[12px]">Search…</span>
            <kbd className="text-[10px] font-mono bg-[#0D0D12] border border-[#1E1E2E] px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>

          {/* Settings + Avatar */}
          <button onClick={() => setSettingsOpen(true)} className="p-1.5 rounded-md hover:bg-[#1F1F2A] text-[#475569] hover:text-[#94A3B8] transition-colors" aria-label="Settings">
            <Settings className="w-4 h-4" />
          </button>
          {user.photoURL
            ? <img src={user.photoURL} alt="" className="w-7 h-7 rounded-md border border-[#2D2D42]" />
            : <div className="w-7 h-7 rounded-md bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center text-[#818CF8] font-bold text-xs">{firstName[0]}</div>
          }
        </header>

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[#1E1E2E] bg-[#0D0D12] shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-[#1F1F2A] text-[#475569] hover:text-[#94A3B8] transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-[#6366F1]" />
            <span className="font-semibold text-sm text-[#F1F5F9] font-mono">
              {activeNav?.label ?? 'CmdCenter'}
            </span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => setPaletteOpen(true)} className="p-1.5 rounded-md hover:bg-[#1F1F2A] text-[#475569]" aria-label="Search commands">
              <Terminal className="w-4 h-4" />
            </button>
            <button onClick={() => setSettingsOpen(true)} className="p-1.5 rounded-md hover:bg-[#1F1F2A] text-[#475569]" aria-label="Settings">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#09090B]">
          <div className="max-w-[1600px] mx-auto">

            {/* ── DASHBOARD ──────────────────────────────────────────── */}
            {activeTab === 'DASHBOARD' && (
              !dataReady ? <DashboardSkeleton /> : (
                <div className="space-y-6 pb-10 panel-enter">
                  {/* Greeting */}
                  <header>
                    <h1 className="text-2xl font-bold tracking-tight text-[#F1F5F9]">
                      {greeting},{' '}
                      <span className="text-[#818CF8]">{firstName}</span>
                      <span className="text-[#334155] ml-2 text-lg font-mono">
                        {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </h1>
                    <p className="text-[#475569] text-sm mt-0.5 font-mono">
                      {new Date().toLocaleDateString(undefined, { weekday: 'long' })} · {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </header>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    <StatCard label="Tasks Done"     value={stats.doneTasks}
                      sub={`${tasks.filter(t => t.status === 'TODO').length} remaining`}
                      icon={CheckCircle2} accentColor="#10B981" accentAlpha="rgba(16,185,129,0.1)"
                      delta={stats.doneTasks > 0 ? `${stats.doneTasks}` : undefined} deltaPositive />
                    <StatCard label="Avg Attendance" value={`${stats.avgAtt.toFixed(1)}%`}
                      sub={`${attendance.length} subjects`}
                      icon={Shield} accentColor="#38BDF8" accentAlpha="rgba(56,189,248,0.1)"
                      delta={stats.avgAtt >= 75 ? 'Safe' : 'Low'} deltaPositive={stats.avgAtt >= 75} />
                    <StatCard label="LeetCode 7d"    value={stats.leet7days}
                      sub={`${leetLogs.length} total`}
                      icon={Code2} accentColor="#FCD34D" accentAlpha="rgba(252,211,77,0.1)"
                      sparkline={stats.lcSparkline} />
                    <StatCard label="LC Streak"      value={`${stats.lcStreak}d`}
                      sub="consecutive days"
                      icon={Flame} accentColor="#F97316" accentAlpha="rgba(249,115,22,0.1)"
                      delta={stats.lcStreak > 0 ? `${stats.lcStreak}` : undefined} deltaPositive />
                    <StatCard label="Workout Today"  value={`${stats.todayMins}m`}
                      sub="minutes active"
                      icon={Dumbbell} accentColor="#6366F1" accentAlpha="rgba(99,102,241,0.1)"
                      sparkline={stats.workoutSparkline} />
                    <StatCard label="Calories Today" value={stats.todayCals}
                      sub="kcal logged"
                      icon={Utensils} accentColor="#A78BFA" accentAlpha="rgba(167,139,250,0.1)" />
                  </div>

                  {/* Main 2-col */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    <div className="h-[520px]">
                      <Suspense fallback={<CardSkeleton rows={6} className="h-full" />}>
                        <KanbanBoard />
                      </Suspense>
                    </div>
                    <div className="h-[520px] flex flex-col gap-3">
                      <div className="flex gap-2 shrink-0">
                        {(['stats', 'log'] as const).map(t => (
                          <button key={t} onClick={() => setLcTab(t)}
                            className={twMerge('flex-1 py-2 rounded-md text-xs font-bold border transition-all',
                              lcTab === t
                                ? 'bg-[#FCD34D]/12 border-[#FCD34D]/25 text-[#FCD34D]'
                                : 'bg-[#111118] border-[#1E1E2E] text-[#475569] hover:text-[#94A3B8] hover:border-[#2D2D42]')}>
                            {t === 'stats' ? 'Live Stats' : 'Manual Log'}
                          </button>
                        ))}
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        <Suspense fallback={<LeetCodeSkeleton />}>
                          {lcTab === 'stats' ? <LeetCodeStats /> : <LeetCodeLogger />}
                        </Suspense>
                      </div>
                    </div>
                  </div>

                  <Suspense fallback={<CardSkeleton rows={4} />}>
                    <BunkManager />
                  </Suspense>
                </div>
              )
            )}

            {/* ── BUNK ──────────────────────────────────────────────── */}
            {activeTab === 'BUNK' && (
              <div className="pb-10 panel-enter">
                <PageHeader title="Attendance Manager" sub="Track classes per subject with safe-to-bunk calculator." />
                <Suspense fallback={<CardSkeleton rows={6} />}><BunkManager /></Suspense>
              </div>
            )}

            {/* ── CALENDAR ──────────────────────────────────────────── */}
            {activeTab === 'CALENDAR' && (
              <div className="pb-10 panel-enter">
                <PageHeader title="Attendance Calendar" sub="Click any date to log or edit attendance for that day." />
                <Suspense fallback={<CardSkeleton rows={7} />}><AttendanceCalendar /></Suspense>
              </div>
            )}

            {/* ── KANBAN ────────────────────────────────────────────── */}
            {activeTab === 'KANBAN' && (
              <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] panel-enter">
                <Suspense fallback={<CardSkeleton rows={8} className="h-full" />}><KanbanBoard /></Suspense>
              </div>
            )}

            {/* ── LEETCODE ──────────────────────────────────────────── */}
            {activeTab === 'LEETCODE' && (
              <div className="pb-10 space-y-4 panel-enter">
                <div className="flex gap-2 flex-wrap">
                  {(['stats', 'log'] as const).map(t => (
                    <button key={t} onClick={() => setLcTab(t)}
                      className={twMerge('px-4 py-2 rounded-md text-sm font-semibold border transition-all',
                        lcTab === t
                          ? 'bg-[#FCD34D]/12 border-[#FCD34D]/25 text-[#FCD34D]'
                          : 'bg-[#111118] border-[#1E1E2E] text-[#475569] hover:text-[#94A3B8]')}>
                      {t === 'stats' ? 'Live LeetCode Stats' : 'Manual Logger'}
                    </button>
                  ))}
                </div>
                <Suspense fallback={<LeetCodeSkeleton />}>
                  {lcTab === 'stats' ? <LeetCodeStats /> : <LeetCodeLogger />}
                </Suspense>
              </div>
            )}

            {/* ── CHAT ──────────────────────────────────────────────── */}
            {activeTab === 'CHAT' && (
              <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] max-w-4xl mx-auto panel-enter">
                <Suspense fallback={<CardSkeleton rows={5} className="h-full" />}><GeminiChatbot /></Suspense>
              </div>
            )}

            {/* ── AI PLAN ───────────────────────────────────────────── */}
            {activeTab === 'AI_PLAN' && (
              <div className="pb-10 panel-enter">
                <Suspense fallback={<CardSkeleton rows={8} />}><AIStudyPlan /></Suspense>
              </div>
            )}

            {/* ── FITNESS ───────────────────────────────────────────── */}
            {activeTab === 'FITNESS' && (
              <div className="pb-10 panel-enter">
                <PageHeader title="Fitness Tracker" sub="Log workouts, track your streak, stay consistent." />
                <Suspense fallback={<CardSkeleton rows={6} />}><FitnessTracker /></Suspense>
              </div>
            )}

            {/* ── DIET ──────────────────────────────────────────────── */}
            {activeTab === 'DIET' && (
              <div className="pb-10 panel-enter">
                <PageHeader title="Diet Tracker" sub="Track daily intake. Change calorie target in Settings." />
                <Suspense fallback={<CardSkeleton rows={6} />}><DietTracker /></Suspense>
              </div>
            )}

            {/* ── NOTES ─────────────────────────────────────────────── */}
            {activeTab === 'NOTES' && (
              <div className="pb-10 panel-enter">
                <Suspense fallback={<CardSkeleton rows={4} />}><StudyNotes /></Suspense>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
