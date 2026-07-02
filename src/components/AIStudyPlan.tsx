import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getGeminiModel } from '../lib/gemini';
import type { PlacementTask, AttendanceRecord, LeetCodeLog } from '../types';
import { Sparkles, RefreshCw, BookOpen, Calendar, Code2, CheckCircle2, Loader2, Copy, Check } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

/* ─── Markdown-like renderer ─────────────────────────────────────────────── */
const renderPlan = (text: string) => {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) {
      return <h3 key={i} className="text-base font-bold text-emerald-400 mt-5 mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4" />{line.replace('## ','')}</h3>;
    }
    if (line.startsWith('### ')) {
      return <h4 key={i} className="text-sm font-bold text-cyan-400 mt-3 mb-1">{line.replace('### ','')}</h4>;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return <li key={i} className="text-sm text-slate-300 ml-4 py-0.5 list-disc leading-relaxed">{line.replace(/^[-*] /,'')}</li>;
    }
    if (line.match(/^\d+\.\s/)) {
      return <li key={i} className="text-sm text-slate-300 ml-4 py-0.5 list-decimal leading-relaxed">{line.replace(/^\d+\.\s/,'')}</li>;
    }
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} className="text-sm font-bold text-slate-200 mt-2">{line.replace(/\*\*/g,'')}</p>;
    }
    if (line.trim() === '') return <div key={i} className="h-2" />;
    return <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>;
  });
};

export const AIStudyPlan: React.FC = () => {
  const [plan,      setPlan]      = useState<string>('');
  const [genAt,     setGenAt]     = useState<string>('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [copied,    setCopied]    = useState(false);

  // Context data
  const [tasks,      setTasks]      = useState<PlacementTask[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leetLogs,   setLeetLogs]   = useState<LeetCodeLog[]>([]);
  const [leetUser,   setLeetUser]   = useState<string>('');

  // Load existing plan from Firestore
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDoc(doc(db, 'studyPlans', uid)).then((snap) => {
      if (snap.exists()) {
        setPlan(snap.data().plan ?? '');
        setGenAt(snap.data().generatedAt ?? '');
      }
    });
    // LeetCode username
    onSnapshot(doc(db, 'userProfile', uid), (snap) => {
      setLeetUser(snap.data()?.leetcodeUsername ?? '');
    });
  }, []);

  useEffect(() => onSnapshot(collection(db, 'tasks'),         s => setTasks(s.docs.map(d => ({id:d.id,...d.data()} as PlacementTask)))), []);
  useEffect(() => onSnapshot(collection(db, 'attendance'),    s => setAttendance(s.docs.map(d => ({id:d.id,...d.data()} as AttendanceRecord)))), []);
  useEffect(() => onSnapshot(collection(db, 'leetcodeLogs'),  s => setLeetLogs(s.docs.map(d => ({id:d.id,...d.data()} as LeetCodeLog)))), []);

  const generate = async () => {
    setLoading(true);
    setError(null);

    // Build context summary
    const doneTasks = tasks.filter(t => t.status === 'DONE').length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const todoTasks = tasks.filter(t => t.status === 'TODO').length;

    const attendanceSummary = attendance.map(a => {
      const pct = a.totalClasses > 0 ? ((a.attendedClasses / a.totalClasses) * 100).toFixed(1) : 'N/A';
      return `${a.name}: ${pct}% (${a.attendedClasses}/${a.totalClasses})`;
    }).join(', ');

    const leetSummary = (() => {
      const easy   = leetLogs.filter(l => l.difficulty === 'EASY').length;
      const medium = leetLogs.filter(l => l.difficulty === 'MEDIUM').length;
      const hard   = leetLogs.filter(l => l.difficulty === 'HARD').length;
      const total  = leetLogs.length;
      // Streak
      const daySet = new Set(leetLogs.map(l => new Date(l.dateSolved).toDateString()));
      let streak = 0;
      const d = new Date();
      while (daySet.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
      return `Total: ${total} (Easy: ${easy}, Medium: ${medium}, Hard: ${hard}), Current streak: ${streak} days`;
    })();

    const inProgressTitles = tasks.filter(t => t.status === 'IN_PROGRESS').map(t => `${t.title} [${t.category}]`).join(', ');
    const todoTitles = tasks.filter(t => t.status === 'TODO').slice(0, 5).map(t => `${t.title} [${t.category}]`).join(', ');

    const prompt = `You are an elite SDE placement coach and EE professor at PEC Chandigarh. Based on this student's current data, generate a highly personalized, actionable 7-day study plan for the upcoming week.

**Student Context:**
- Placement Tasks: ${doneTasks} done, ${inProgress} in progress, ${todoTasks} pending
- In Progress: ${inProgressTitles || 'none'}
- Next ToDo tasks: ${todoTitles || 'none'}
- Attendance: ${attendanceSummary || 'no data yet'}
- LeetCode progress: ${leetSummary}
- LeetCode username: ${leetUser || 'not set'}

**Instructions:**
1. Identify the biggest risk areas (attendance danger? falling behind on DSA? no recent coding?)
2. Generate a day-by-day plan (Day 1 through Day 7)
3. Each day: 2-4 concrete, specific tasks with estimated time
4. Interleave EE studies with placement prep realistically (student is in college)
5. Include a "Focus Problem" type (LeetCode topic) for each day
6. Add specific EE revision topics based on their attendance data
7. Keep it motivating and realistic for a busy engineering student
8. Format using ## for day headers, bullet points for tasks

Generate the 7-day plan now:`;

    try {
      const model  = getGeminiModel();
      const result = await model.generateContent(prompt);
      const text   = result.response.text();
      const now     = new Date().toISOString();

      const uid = auth.currentUser?.uid;
      if (uid) {
        await setDoc(doc(db, 'studyPlans', uid), { plan: text, generatedAt: now });
      }
      setPlan(text);
      setGenAt(now);
    } catch (e: any) {
      setError(e.message?.includes('API_KEY')
        ? 'Gemini API key missing. Add VITE_GEMINI_API_KEY to .env.local'
        : 'Failed to generate plan. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(plan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            AI Study Plan
          </h2>
          <p className="text-slate-400 mt-1 text-sm max-w-lg">
            Gemini analyzes your attendance, tasks, and LeetCode progress to generate a personalized 7-day plan — just for you.
          </p>
          {genAt && (
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Last generated: {new Date(genAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {/* Context stats */}
          <div className="flex gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {tasks.filter(t=>t.status==='DONE').length} done</span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-cyan-400" /> {attendance.length} subjects</span>
            <span className="flex items-center gap-1"><Code2 className="w-3.5 h-3.5 text-yellow-400" /> {leetLogs.length} solved</span>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 active:scale-95 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold px-5 py-3 rounded-xl transition-all text-sm"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              : <><Sparkles className="w-4 h-4" /> {plan ? 'Regenerate Plan' : 'Generate My Plan'}</>
            }
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* Plan display */}
      {plan ? (
        <div className="relative bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/80">
            <h3 className="font-bold text-slate-200 text-sm">Your Personalized 7-Day Plan</h3>
            <button onClick={copyToClipboard} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/10">
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </button>
          </div>
          <div className="px-6 py-5 overflow-y-auto max-h-[60vh] custom-scrollbar">
            <div className="space-y-0.5">{renderPlan(plan)}</div>
          </div>
        </div>
      ) : !loading && (
        <div className="py-16 text-center">
          <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-10 h-10 text-indigo-400 opacity-60" />
          </div>
          <p className="text-slate-400 font-medium">No plan generated yet.</p>
          <p className="text-slate-600 text-sm mt-1">Fill in some attendance data and tasks, then hit <strong className="text-indigo-400">Generate My Plan</strong>.</p>
        </div>
      )}
    </div>
  );
};
