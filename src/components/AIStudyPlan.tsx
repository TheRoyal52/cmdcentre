import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getGeminiModel } from '../lib/gemini';
import type { PlacementTask, AttendanceRecord, LeetCodeLog } from '../types';
import {
  Sparkles, RefreshCw, BookOpen, Calendar, Code2, CheckCircle2,
  Loader2, Copy, Check, ChevronDown, ChevronUp, Download, Zap,
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

/* ─── Parse Gemini output into Day 1-7 sections ─────────────────────────────── */
interface DayPlan {
  day: number;
  title: string;
  items: string[];
  focus?: string;
}

const parseDayPlan = (text: string): DayPlan[] => {
  const days: DayPlan[] = [];
  // Match ## Day N or **Day N:** patterns
  const dayRegex = /(?:^|\n)(?:##\s*|(?:\*\*))(?:Day\s*(\d)(?:[:\s–—-]*)(.*?)(?:\*\*)?)\s*\n([\s\S]*?)(?=(?:\n(?:##|\*\*Day\s*\d)|$))/gi;
  let match: RegExpExecArray | null;

  while ((match = dayRegex.exec(text)) !== null) {
    const dayNum = parseInt(match[1]);
    const title  = match[2].trim() || `Day ${dayNum}`;
    const body   = match[3] ?? '';
    const items  = body
      .split('\n')
      .map(l => l.replace(/^[-*\d.]\s+/, '').trim())
      .filter(l => l.length > 3 && !l.startsWith('##'));
    const focusLine = items.find(l => /focus|leetcode|problem/i.test(l));
    days.push({ day: dayNum, title, items, focus: focusLine });
  }

  // Fallback: if parsing fails, return raw text wrapped in one block
  if (days.length === 0) {
    return [{ day: 0, title: 'Full Plan', items: text.split('\n').filter(l => l.trim()), focus: undefined }];
  }
  return days;
};

/* ─── Day accordion card ─────────────────────────────────────────────────────── */
const DayCard: React.FC<{
  day: DayPlan;
  isOpen: boolean;
  onToggle: () => void;
  checked: Set<string>;
  onCheck: (key: string) => void;
  isStreaming?: boolean;
}> = ({ day, isOpen, onToggle, checked, onCheck, isStreaming }) => {
  const doneCount = day.items.filter((_, i) => checked.has(`${day.day}-${i}`)).length;
  const total     = day.items.length;
  const allDone   = total > 0 && doneCount === total;

  return (
    <div className={twMerge(
      'bg-[#111118] border rounded-lg overflow-hidden transition-all',
      allDone ? 'border-[#10B981]/30' : 'border-[#1E1E2E]',
    )}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1E1E2E]/50 transition-colors"
        aria-expanded={isOpen}
      >
        <span className={twMerge(
          'w-7 h-7 rounded-md flex items-center justify-center shrink-0 font-bold font-mono text-[13px] border',
          allDone
            ? 'bg-[#10B981]/15 border-[#10B981]/30 text-[#10B981]'
            : 'bg-[#6366F1]/12 border-[#6366F1]/25 text-[#818CF8]',
        )}>
          {allDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : day.day}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#F1F5F9] truncate">
            {day.day > 0 ? `Day ${day.day}` : 'Full Plan'}{day.title && day.day > 0 ? ` — ${day.title}` : ''}
          </p>
          {total > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1 flex-1 bg-[#1E1E2E] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(doneCount / total) * 100}%`, background: allDone ? '#10B981' : '#6366F1' }}
                />
              </div>
              <span className="text-[10px] font-mono text-[#334155] shrink-0">{doneCount}/{total}</span>
            </div>
          )}
        </div>
        {isStreaming && day.day === 0 && (
          <span className="inline-block w-1 h-4 bg-[#A78BFA] rounded-full animate-pulse mr-2" />
        )}
        {isOpen
          ? <ChevronUp className="w-4 h-4 text-[#334155] shrink-0" />
          : <ChevronDown className="w-4 h-4 text-[#334155] shrink-0" />
        }
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-2">
          {day.items.map((item, i) => {
            const key = `${day.day}-${i}`;
            const done = checked.has(key);
            return (
              <label
                key={key}
                className={twMerge(
                  'flex items-start gap-3 p-2.5 rounded-md border cursor-pointer transition-all select-none',
                  done
                    ? 'bg-[#10B981]/6 border-[#10B981]/20'
                    : 'bg-[#0D0D12] border-[#1E1E2E] hover:border-[#2D2D42]',
                )}
              >
                <div className={twMerge(
                  'w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 transition-all',
                  done ? 'bg-[#10B981] border-[#10B981]' : 'bg-[#1E1E2E] border-[#2D2D42]',
                )}>
                  {done && <Check className="w-2.5 h-2.5 text-[#09090B]" strokeWidth={3} />}
                </div>
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => onCheck(key)}
                  className="sr-only"
                />
                <span className={twMerge(
                  'text-[13px] leading-relaxed flex-1',
                  done ? 'text-[#334155] line-through' : 'text-[#94A3B8]',
                )}>
                  {item}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Main component ─────────────────────────────────────────────────────────── */
export const AIStudyPlan: React.FC = () => {
  const [plan,      setPlan]      = useState<string>('');
  const [days,      setDays]      = useState<DayPlan[]>([]);
  const [genAt,     setGenAt]     = useState<string>('');
  const [loading,   setLoading]   = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [copied,    setCopied]    = useState(false);
  const [openDays,  setOpenDays]  = useState<Set<number>>(new Set([1]));
  const [checked,   setChecked]   = useState<Set<string>>(new Set());
  const [liveText,  setLiveText]  = useState<string>('');

  const [tasks,      setTasks]      = useState<PlacementTask[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leetLogs,   setLeetLogs]   = useState<LeetCodeLog[]>([]);
  const [leetUser,   setLeetUser]   = useState<string>('');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDoc(doc(db, 'studyPlans', uid)).then((snap) => {
      if (snap.exists()) {
        const text = snap.data().plan ?? '';
        setPlan(text);
        setDays(parseDayPlan(text));
        setGenAt(snap.data().generatedAt ?? '');
      }
    });
    onSnapshot(doc(db, 'userProfile', uid), (snap) => {
      setLeetUser(snap.data()?.leetcodeUsername ?? '');
    });
  }, []);

  useEffect(() => onSnapshot(collection(db, 'tasks'),        s => setTasks(s.docs.map(d => ({id:d.id,...d.data()} as PlacementTask)))), []);
  useEffect(() => onSnapshot(collection(db, 'attendance'),   s => setAttendance(s.docs.map(d => ({id:d.id,...d.data()} as AttendanceRecord)))), []);
  useEffect(() => onSnapshot(collection(db, 'leetcodeLogs'), s => setLeetLogs(s.docs.map(d => ({id:d.id,...d.data()} as LeetCodeLog)))), []);

  const toggleDay  = (n: number) => setOpenDays(prev => {
    const next = new Set(prev);
    next.has(n) ? next.delete(n) : next.add(n);
    return next;
  });
  const checkItem  = (key: string) => setChecked(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const expandAll  = () => setOpenDays(new Set(days.map(d => d.day)));
  const collapseAll = () => setOpenDays(new Set());

  const generate = async () => {
    setLoading(true);
    setStreaming(true);
    setError(null);
    setLiveText('');
    setChecked(new Set());

    const doneTasks     = tasks.filter(t => t.status === 'DONE').length;
    const inProgress    = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const todoTasks     = tasks.filter(t => t.status === 'TODO').length;
    const attendSum     = attendance.map(a => {
      const pct = a.totalClasses > 0 ? ((a.attendedClasses / a.totalClasses) * 100).toFixed(1) : 'N/A';
      return `${a.name}: ${pct}%`;
    }).join(', ');
    const easy   = leetLogs.filter(l => l.difficulty === 'EASY').length;
    const medium = leetLogs.filter(l => l.difficulty === 'MEDIUM').length;
    const hard   = leetLogs.filter(l => l.difficulty === 'HARD').length;
    const daySet = new Set(leetLogs.map(l => new Date(l.dateSolved).toDateString()));
    let streak = 0;
    const dd = new Date();
    while (daySet.has(dd.toDateString())) { streak++; dd.setDate(dd.getDate() - 1); }

    const prompt = `You are an elite SDE placement coach and EE professor at PEC Chandigarh.

**Student Data:**
- Tasks: ${doneTasks} done, ${inProgress} in progress, ${todoTasks} pending
- Attendance: ${attendSum || 'no data'}
- LeetCode: ${leetLogs.length} total (Easy: ${easy}, Medium: ${medium}, Hard: ${hard}), streak: ${streak}d
- Username: ${leetUser || 'not set'}

Generate a personalized 7-day study plan. Use exactly this format for each day:

## Day 1 — [Short theme title]
- [Concrete task 1, with time estimate]
- [Concrete task 2]
- [LeetCode Focus: specific topic/pattern]
- [EE revision task if attendance at risk]

## Day 2 — [Short theme title]
...and so on through Day 7.

Be specific. Include exact LeetCode problem types (Two Pointers, DP on strings, etc.). Interleave EE with placement prep. Keep tasks realistic for a busy college student (4-6 hours per day max).`;

    try {
      const model  = getGeminiModel();
      const stream = await model.generateContentStream(prompt);
      let fullText = '';

      for await (const chunk of stream) {
        fullText += chunk.text();
        setLiveText(fullText);
      }

      setStreaming(false);
      setLiveText('');
      const now = new Date().toISOString();
      const uid = auth.currentUser?.uid;
      if (uid) {
        await setDoc(doc(db, 'studyPlans', uid), { plan: fullText, generatedAt: now });
      }
      setPlan(fullText);
      setDays(parseDayPlan(fullText));
      setGenAt(now);
      setOpenDays(new Set([1]));
      toast.success('Study plan generated!');
    } catch (e: any) {
      setStreaming(false);
      setLiveText('');
      setError(e.message?.includes('API_KEY')
        ? 'Gemini API key missing. Add VITE_GEMINI_API_KEY to .env.local'
        : 'Failed to generate plan. Try again.');
      toast.error('Generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const exportMarkdown = () => {
    const blob = new Blob([plan], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `study-plan-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Plan exported as Markdown.');
  };

  const copyPlan = () => {
    navigator.clipboard.writeText(plan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalItems   = days.reduce((s, d) => s + d.items.length, 0);
  const doneItems    = days.reduce((s, d) => s + d.items.filter((_, i) => checked.has(`${d.day}-${i}`)).length, 0);
  const overallPct   = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-5 bg-[#111118] border border-[#1E1E2E] rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#A78BFA]" strokeWidth={1.75} />
              <h2 className="text-[15px] font-semibold text-[#F1F5F9]">AI Study Plan</h2>
            </div>
            <p className="text-[12px] text-[#475569]">
              Gemini analyzes your attendance, tasks, and LeetCode progress to generate a personalized 7-day plan — streamed live.
            </p>
            {genAt && (
              <p className="text-[11px] text-[#334155] font-mono mt-2 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                Generated {new Date(genAt).toLocaleString()} · based on {leetLogs.length} LC logs
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex gap-2 text-[11px] text-[#475569] font-mono">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" />{tasks.filter(t=>t.status==='DONE').length} done</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-[#6366F1]" />{attendance.length} subjects</span>
              <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-[#FCD34D]" />{leetLogs.length} solved</span>
            </div>
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#818CF8] active:scale-95 disabled:bg-[#1E1E2E] disabled:text-[#334155] text-white font-semibold px-4 py-2.5 rounded-md transition-all text-[13px]"
            >
              {loading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                : <><Sparkles className="w-3.5 h-3.5" /> {plan ? 'Regenerate' : 'Generate Plan'}</>
              }
            </button>
          </div>
        </div>

        {/* Overall progress bar */}
        {totalItems > 0 && !loading && (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#475569]">Week progress</span>
              <span style={{ color: overallPct === 100 ? '#10B981' : '#6366F1' }}>{overallPct}% ({doneItems}/{totalItems})</span>
            </div>
            <div className="h-1.5 bg-[#1E1E2E] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${overallPct}%`, background: overallPct === 100 ? '#10B981' : '#6366F1' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/8 border border-red-500/20 rounded-md text-[12px] text-red-400">
          {error}
        </div>
      )}

      {/* Live streaming preview */}
      {streaming && liveText && (
        <div className="bg-[#111118] border border-[#A78BFA]/20 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1E1E2E] bg-[#0D0D12]">
            <span className="w-1.5 h-1.5 bg-[#A78BFA] rounded-full animate-pulse" />
            <p className="text-[11px] font-mono text-[#A78BFA]">Generating your plan…</p>
          </div>
          <div className="px-5 py-4 max-h-48 overflow-y-auto">
            <p className="text-[12px] text-[#475569] font-mono whitespace-pre-wrap leading-relaxed">
              {liveText}
              <span className="inline-block w-0.5 h-3.5 bg-[#A78BFA] ml-0.5 animate-pulse align-middle" />
            </p>
          </div>
        </div>
      )}

      {/* Plan accordion */}
      {days.length > 0 && !loading && (
        <div className="space-y-3">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="text-[11px] font-mono text-[#475569] hover:text-[#94A3B8] px-2 py-1 rounded-md border border-[#1E1E2E] hover:border-[#2D2D42] transition-all"
              >
                Expand all
              </button>
              <button
                onClick={collapseAll}
                className="text-[11px] font-mono text-[#475569] hover:text-[#94A3B8] px-2 py-1 rounded-md border border-[#1E1E2E] hover:border-[#2D2D42] transition-all"
              >
                Collapse all
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyPlan}
                className="flex items-center gap-1.5 text-[11px] font-mono text-[#475569] hover:text-[#94A3B8] px-2 py-1 rounded-md border border-[#1E1E2E] hover:border-[#2D2D42] transition-all"
              >
                {copied ? <><Check className="w-3 h-3 text-[#10B981]" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
              </button>
              <button
                onClick={exportMarkdown}
                className="flex items-center gap-1.5 text-[11px] font-mono text-[#475569] hover:text-[#94A3B8] px-2 py-1 rounded-md border border-[#1E1E2E] hover:border-[#2D2D42] transition-all"
              >
                <Download className="w-3 h-3" /> Export .md
              </button>
            </div>
          </div>

          {/* Day cards */}
          {days.map(day => (
            <DayCard
              key={day.day}
              day={day}
              isOpen={openDays.has(day.day)}
              onToggle={() => toggleDay(day.day)}
              checked={checked}
              onCheck={checkItem}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!plan && !loading && !streaming && (
        <div className="py-16 text-center">
          <div className="w-16 h-16 bg-[#6366F1]/8 border border-[#6366F1]/20 rounded-lg flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-8 h-8 text-[#6366F1] opacity-50" />
          </div>
          <p className="text-[#475569] font-medium">No plan generated yet.</p>
          <p className="text-[#334155] text-sm mt-1">Fill in attendance data and tasks, then hit <strong className="text-[#6366F1]">Generate Plan</strong>.</p>
        </div>
      )}
    </div>
  );
};
