import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
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
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

// Lazy-loaded heavy views (improves initial load time)
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

import { DashboardSkeleton, CardSkeleton, LeetCodeSkeleton } from './components/Skeleton';

type Tab = 'DASHBOARD' | 'BUNK' | 'KANBAN' | 'LEETCODE' | 'CHAT' | 'NOTES' | 'CALENDAR' | 'AI_PLAN' | 'FITNESS' | 'DIET';

interface NavItem { id: Tab; icon: React.ElementType; label: string; color: string; badge?: string; }

const NAV: NavItem[] = [
  { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Overview',      color: 'text-emerald-400' },
  { id: 'BUNK',      icon: Shield,          label: 'Attendance',    color: 'text-emerald-400' },
  { id: 'CALENDAR',  icon: CalendarDays,    label: 'Att. Calendar', color: 'text-cyan-400'    },
  { id: 'KANBAN',    icon: Kanban,          label: 'Tasks',         color: 'text-cyan-400'    },
  { id: 'LEETCODE',  icon: Code2,           label: 'LeetCode',      color: 'text-yellow-400'  },
  { id: 'CHAT',      icon: Bot,             label: 'AI Mentor',     color: 'text-indigo-400', badge: 'AI' },
  { id: 'AI_PLAN',   icon: Sparkles,        label: 'Study Plan',    color: 'text-purple-400', badge: 'AI' },
  { id: 'FITNESS',   icon: Dumbbell,        label: 'Fitness',       color: 'text-orange-400'  },
  { id: 'DIET',      icon: Utensils,        label: 'Diet',          color: 'text-green-400'   },
  { id: 'NOTES',     icon: StickyNote,      label: 'Study Notes',   color: 'text-pink-400'    },
];

const NAV_GROUPS = [
  { label: 'Academics', ids: ['DASHBOARD','BUNK','CALENDAR','KANBAN'] },
  { label: 'Placement',  ids: ['LEETCODE'] },
  { label: 'AI',         ids: ['CHAT','AI_PLAN'] },
  { label: 'Wellness',   ids: ['FITNESS','DIET'] },
  { label: 'Utilities',  ids: ['NOTES'] },
] as const;

/* ─── Mini Stat Card ──────────────────────────────────────────────────────── */
const StatCard: React.FC<{
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}> = ({ label, value, sub, icon, color }) => (
  <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 md:p-5 flex items-center gap-3 md:gap-4 hover:border-slate-600 transition-colors">
    <div className={twMerge('w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0', color)}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xl md:text-2xl font-bold font-mono text-slate-100 truncate">{value}</p>
      <p className="text-[11px] md:text-xs text-slate-400 font-medium truncate">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5 truncate hidden md:block">{sub}</p>}
    </div>
  </div>
);

/* ─── Sidebar nav content ─────────────────────────────────────────────────── */
const SidebarContent: React.FC<{
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  onSettings: () => void;
  onClose?: () => void;
  user: User;
  onLogout: () => void;
}> = ({ activeTab, onTabChange, onSettings, onClose, user, onLogout }) => {
  const firstName = user.displayName?.split(' ')[0] ?? 'Engineer';
  const handleTab = (t: Tab) => { onTabChange(t); onClose?.(); };

  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <GraduationCap style={{ width: 18, height: 18 }} className="text-emerald-400" />
            </div>
            <div>
              <span className="font-extrabold text-[15px] tracking-tight text-slate-100">CmdCenter</span>
              <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest leading-none">PEC Edition</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onSettings} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors" title="Settings">
              <Settings style={{ width: 15, height: 15 }} />
            </button>
            {onClose && (
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors md:hidden">
                <X style={{ width: 15, height: 15 }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map(group => {
          const items = NAV.filter(n => (group.ids as readonly string[]).includes(n.id));
          return (
            <div key={group.label}>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest px-2 mb-1">{group.label}</p>
              <div className="space-y-0.5">
                {items.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => handleTab(tab.id)}
                      className={twMerge(
                        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all border',
                        isActive ? 'bg-slate-800 border-slate-700 text-slate-100 shadow' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50',
                      )}>
                      <tab.icon className={twMerge('shrink-0', isActive ? tab.color : '')} style={{ width: 15, height: 15 }} />
                      <span className="truncate">{tab.label}</span>
                      {tab.badge && (
                        <span className={twMerge('ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                          isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-500')}>
                          {tab.badge}
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

      {/* Pomodoro (hidden on mobile to save space) */}
      <div className="hidden lg:block">
        <Suspense fallback={null}>
          <PomodoroTimer />
        </Suspense>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-t border-slate-800/80 bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-2.5 mb-3">
          {user.photoURL
            ? <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-slate-700" />
            : <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">{firstName[0]}</div>
          }
          <div className="overflow-hidden">
            <p className="text-xs font-semibold truncate text-slate-200">{firstName}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        <button onClick={onLogout}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-all">
          <LogOut style={{ width: 12, height: 12 }} /> Sign Out
        </button>
      </div>
    </>
  );
};

/* ─── Full loading screen ─────────────────────────────────────────────────── */
const FullScreenLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
      <GraduationCap className="w-8 h-8 text-emerald-400 animate-pulse" />
    </div>
    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    <p className="text-slate-500 text-sm">Loading Command Center…</p>
  </div>
);

/* ─── Main App ────────────────────────────────────────────────────────────── */
export default function App() {
  const [user,         setUser]         = useState<User | null>(null);
  const [authLoading,  setAuthLoading]  = useState(true);
  const [activeTab,    setActiveTab]    = useState<Tab>('DASHBOARD');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen,  setSidebarOpen]  = useState(false); // mobile drawer
  const [lcTab,        setLcTab]        = useState<'stats' | 'log'>('stats');
  const [loginError,   setLoginError]   = useState<string | null>(null);
  const [dataReady,    setDataReady]    = useState(false);

  // Live data for dashboard
  const [tasks,      setTasks]      = useState<PlacementTask[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leetLogs,   setLeetLogs]   = useState<LeetCodeLog[]>([]);
  const [workouts,   setWorkouts]   = useState<WorkoutLog[]>([]);
  const [meals,      setMeals]      = useState<MealLog[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
    return () => unsub();
  }, []);

  // Subscribe to all collections — mark dataReady once any data flows
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

    // Fallback: mark ready after 2 s even if Firestore is slow
    const timeout = setTimeout(markReady, 2000);
    return () => { subs.forEach(u => u()); clearTimeout(timeout); };
  }, [user]);

  // Dashboard derived stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const doneTasks    = tasks.filter(t => t.status === 'DONE').length;
    const avgAtt       = attendance.length === 0 ? 0 : attendance.reduce((s, a) => s + (a.totalClasses === 0 ? 0 : (a.attendedClasses / a.totalClasses) * 100), 0) / attendance.length;
    const leet7days    = leetLogs.filter(l => { const d = new Date(l.dateSolved); const c = new Date(); c.setDate(c.getDate() - 7); return d >= c; }).length;
    const todayMins    = workouts.filter(w => w.date.startsWith(today)).reduce((s, w) => s + w.duration, 0);
    const todayCals    = meals.filter(m => m.date.startsWith(today)).reduce((s, m) => s + m.calories, 0);
    const daySet       = new Set(leetLogs.map(l => new Date(l.dateSolved).toDateString()));
    let lcStreak = 0; const d = new Date();
    while (daySet.has(d.toDateString())) { lcStreak++; d.setDate(d.getDate() - 1); }
    return { doneTasks, avgAtt, leet7days, lcStreak, todayMins, todayCals };
  }, [tasks, attendance, leetLogs, workouts, meals]);

  const login = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      const code: string = e?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User dismissed — not an error
        return;
      }
      if (code === 'auth/popup-blocked') {
        setLoginError('Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.');
      } else if (code === 'auth/network-request-failed') {
        setLoginError('Network error. Please check your internet connection and try again.');
      } else {
        setLoginError('Sign-in failed. Please try again or refresh the page.');
      }
      console.error('[Auth error]', e);
    }
  };

  const logout = async () => { await signOut(auth); setDataReady(false); };

  // Close mobile sidebar on tab change via keyboard / back gesture
  useEffect(() => { setSidebarOpen(false); }, [activeTab]);

  /* ─── Initial load ────────────────────────────────────────────────────── */
  if (authLoading) return <FullScreenLoader />;

  /* ─── Not signed in → Landing page ───────────────────────────────────── */
  if (!user) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <LandingPage onLogin={login} loginError={loginError} />
      </Suspense>
    );
  }

  const firstName = user.displayName?.split(' ')[0] ?? 'Engineer';
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="h-screen flex bg-slate-950 text-slate-100 overflow-hidden">
      <Suspense fallback={null}>
        <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </Suspense>

      {/* ─── Mobile overlay ───────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar (desktop fixed, mobile drawer) ───────────────────────── */}
      <aside className={twMerge(
        'fixed md:relative inset-y-0 left-0 z-40 w-[240px] shrink-0 flex flex-col border-r border-slate-800/80 bg-slate-900/95 md:bg-slate-900/60 backdrop-blur-3xl transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}>
        <SidebarContent
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSettings={() => { setSettingsOpen(true); setSidebarOpen(false); }}
          onClose={() => setSidebarOpen(false)}
          user={user}
          onLogout={logout}
        />
      </aside>

      {/* ─── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-sm shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-sm text-slate-100">
              {NAV.find(n => n.id === activeTab)?.label ?? 'CmdCenter'}
            </span>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="ml-auto p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(16,185,129,0.06),transparent)] p-4 md:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto">

            {/* DASHBOARD */}
            {activeTab === 'DASHBOARD' && (
              !dataReady ? <DashboardSkeleton /> : (
                <div className="space-y-6 md:space-y-7 pb-10">
                  <header>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                      {greeting},{' '}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400">
                        {firstName}
                      </span>{' '}👋
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm md:text-base">
                      {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </header>

                  {/* Stats grid — 2 col on mobile, 3 on lg, 6 on xl */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    <StatCard label="Tasks Done"     value={stats.doneTasks} sub={`${tasks.filter(t => t.status === 'TODO').length} remaining`}
                      icon={<CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />} color="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" />
                    <StatCard label="Avg Attendance" value={`${stats.avgAtt.toFixed(1)}%`} sub={`${attendance.length} subjects`}
                      icon={<Shield className="w-5 h-5 md:w-6 md:h-6" />} color="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400" />
                    <StatCard label="LeetCode (7d)"  value={stats.leet7days} sub={`${leetLogs.length} total`}
                      icon={<Code2 className="w-5 h-5 md:w-6 md:h-6" />} color="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400" />
                    <StatCard label="LC Streak"      value={`${stats.lcStreak}d`} sub="consecutive days"
                      icon={<Flame className="w-5 h-5 md:w-6 md:h-6" />} color="bg-orange-500/10 border border-orange-500/20 text-orange-400" />
                    <StatCard label="Workout Today"  value={`${stats.todayMins}m`} sub="minutes active"
                      icon={<Dumbbell className="w-5 h-5 md:w-6 md:h-6" />} color="bg-blue-500/10 border border-blue-500/20 text-blue-400" />
                    <StatCard label="Calories Today" value={stats.todayCals} sub="kcal logged"
                      icon={<Utensils className="w-5 h-5 md:w-6 md:h-6" />} color="bg-green-500/10 border border-green-500/20 text-green-400" />
                  </div>

                  {/* Main two-col grid — stacks on mobile */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="h-[480px] md:h-[520px]">
                      <Suspense fallback={<CardSkeleton rows={6} className="h-full" />}>
                        <KanbanBoard />
                      </Suspense>
                    </div>
                    <div className="h-[480px] md:h-[520px] flex flex-col gap-3">
                      <div className="flex gap-2 shrink-0">
                        {(['stats', 'log'] as const).map(t => (
                          <button key={t} onClick={() => setLcTab(t)}
                            className={twMerge('flex-1 py-2 rounded-xl text-xs font-bold border transition-all',
                              lcTab === t ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200')}>
                            {t === 'stats' ? '📊 Live Stats' : '✏️ Manual Log'}
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

            {activeTab === 'BUNK' && (
              <div className="pb-10">
                <Suspense fallback={<CardSkeleton rows={6} />}><BunkManager /></Suspense>
              </div>
            )}

            {activeTab === 'CALENDAR' && (
              <div className="pb-10">
                <header className="mb-6">
                  <h1 className="text-xl md:text-2xl font-bold text-slate-100">Attendance Calendar</h1>
                  <p className="text-slate-400 text-sm mt-1">Click any past date to log or edit attendance.</p>
                </header>
                <Suspense fallback={<CardSkeleton rows={7} />}><AttendanceCalendar /></Suspense>
              </div>
            )}

            {activeTab === 'KANBAN' && (
              <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
                <Suspense fallback={<CardSkeleton rows={8} className="h-full" />}><KanbanBoard /></Suspense>
              </div>
            )}

            {activeTab === 'LEETCODE' && (
              <div className="pb-10 space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {(['stats', 'log'] as const).map(t => (
                    <button key={t} onClick={() => setLcTab(t)}
                      className={twMerge('px-4 md:px-5 py-2.5 rounded-xl text-sm font-bold border transition-all',
                        lcTab === t ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200')}>
                      {t === 'stats' ? '📊 Live LeetCode Stats' : '✏️ Manual Logger'}
                    </button>
                  ))}
                </div>
                <Suspense fallback={<LeetCodeSkeleton />}>
                  {lcTab === 'stats' ? <LeetCodeStats /> : <LeetCodeLogger />}
                </Suspense>
              </div>
            )}

            {activeTab === 'CHAT' && (
              <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] max-w-4xl mx-auto">
                <Suspense fallback={<CardSkeleton rows={5} className="h-full" />}><GeminiChatbot /></Suspense>
              </div>
            )}

            {activeTab === 'AI_PLAN' && (
              <div className="pb-10">
                <Suspense fallback={<CardSkeleton rows={8} />}><AIStudyPlan /></Suspense>
              </div>
            )}

            {activeTab === 'FITNESS' && (
              <div className="pb-10">
                <header className="mb-6">
                  <h1 className="text-xl md:text-2xl font-bold text-slate-100">🏋️ Fitness Tracker</h1>
                  <p className="text-slate-400 text-sm mt-1">Log workouts, track your streak, stay consistent.</p>
                </header>
                <Suspense fallback={<CardSkeleton rows={6} />}><FitnessTracker /></Suspense>
              </div>
            )}

            {activeTab === 'DIET' && (
              <div className="pb-10">
                <header className="mb-6">
                  <h1 className="text-xl md:text-2xl font-bold text-slate-100">🥗 Diet Tracker</h1>
                  <p className="text-slate-400 text-sm mt-1">Track daily intake. Change calorie target in Settings ⚙️</p>
                </header>
                <Suspense fallback={<CardSkeleton rows={6} />}><DietTracker /></Suspense>
              </div>
            )}

            {activeTab === 'NOTES' && (
              <div className="pb-10">
                <Suspense fallback={<CardSkeleton rows={4} />}><StudyNotes /></Suspense>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
