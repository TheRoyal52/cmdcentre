import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { LeetCodeLog, Difficulty } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Code2, ExternalLink, Trash2, Flame, Trophy } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const DIFFICULTY_STYLES: Record<Difficulty, { badge: string; bar: string }> = {
  EASY:   { badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', bar: '#10b981' },
  MEDIUM: { badge: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',   bar: '#f59e0b' },
  HARD:   { badge: 'text-red-400 bg-red-500/10 border-red-500/30',            bar: '#ef4444' },
};

// Get last N days date strings
const getLastNDays = (n: number): string[] => {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });
};

export const LeetCodeLogger: React.FC = () => {
  const [logs, setLogs] = useState<LeetCodeLog[]>([]);
  const [problemName, setProblemName] = useState('');
  const [link, setLink] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');

  useEffect(() => {
    const q = query(collection(db, 'leetcodeLogs'), orderBy('dateSolved', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as LeetCodeLog)));
    });
    return () => unsubscribe();
  }, []);

  const addLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemName.trim()) return;
    await addDoc(collection(db, 'leetcodeLogs'), {
      problemName: problemName.trim(),
      link: link.trim(),
      difficulty,
      dateSolved: new Date().toISOString(),
    });
    setProblemName('');
    setLink('');
  };

  const deleteLog = async (id: string) => {
    await deleteDoc(doc(db, 'leetcodeLogs', id));
  };

  // Build last 7-day chart data
  const chartData = useMemo(() => {
    const days = getLastNDays(7);
    const countsByDay: Record<string, { EASY: number; MEDIUM: number; HARD: number }> = {};
    days.forEach((d) => { countsByDay[d] = { EASY: 0, MEDIUM: 0, HARD: 0 }; });

    logs.forEach((log) => {
      const dateStr = new Date(log.dateSolved).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric',
      });
      if (countsByDay[dateStr]) {
        countsByDay[dateStr][log.difficulty]++;
      }
    });

    return days.map((date) => ({ date, ...countsByDay[date] }));
  }, [logs]);

  const totalToday = useMemo(() => {
    const todayStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return logs.filter((l) => {
      return new Date(l.dateSolved).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) === todayStr;
    }).length;
  }, [logs]);

  const streak = useMemo(() => {
    if (logs.length === 0) return 0;
    const daySet = new Set(
      logs.map((l) => new Date(l.dateSolved).toDateString())
    );
    let count = 0;
    const d = new Date();
    while (daySet.has(d.toDateString())) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [logs]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
        <p className="font-bold text-slate-200 mb-2">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.fill }} className="font-medium">
            {p.dataKey}: {p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm h-full flex flex-col gap-4">
      {/* Header stats */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
          <Code2 className="w-6 h-6" /> LeetCode Logger
        </h2>
        <div className="flex gap-3">
          <div className="text-center px-4 py-2 bg-slate-900 rounded-xl border border-slate-700">
            <div className="flex items-center gap-1.5 justify-center">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-lg font-bold text-orange-400 font-mono">{streak}</span>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Day Streak</p>
          </div>
          <div className="text-center px-4 py-2 bg-slate-900 rounded-xl border border-slate-700">
            <div className="flex items-center gap-1.5 justify-center">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-lg font-bold text-yellow-400 font-mono">{logs.length}</span>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">Total Solved</p>
          </div>
        </div>
      </div>

      {/* Log form */}
      <form onSubmit={addLog} className="flex flex-col gap-2 shrink-0">
        <input
          type="text"
          value={problemName}
          onChange={(e) => setProblemName(e.target.value)}
          placeholder="Problem name (e.g. Two Sum)..."
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500 transition-colors"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="LeetCode URL (optional)"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-yellow-500 transition-colors"
          />
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 transition-colors cursor-pointer"
          >
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
          <button
            type="submit"
            className="bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-slate-900 font-bold px-4 py-2 rounded-lg transition-all text-sm"
          >
            Log ✓
          </button>
        </div>
      </form>

      {/* 7-day bar chart */}
      <div className="flex-1 min-h-0">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">
          Last 7 Days  •  Today: <span className="text-yellow-400">{totalToday}</span> solved
        </p>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={chartData} barSize={10} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="EASY"   fill="#10b981" radius={[4,4,0,0]} stackId="a" />
            <Bar dataKey="MEDIUM" fill="#f59e0b" radius={[4,4,0,0]} stackId="a" />
            <Bar dataKey="HARD"   fill="#ef4444" radius={[4,4,0,0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Log list */}
      <div className="overflow-y-auto max-h-[200px] space-y-2 pr-0.5">
        {logs.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-6">No problems logged yet. Start grinding! 💪</p>
        )}
        {logs.map((log) => (
          <div
            key={log.id}
            className="bg-slate-900 px-4 py-2.5 rounded-lg border border-slate-700/80 flex items-center justify-between group hover:border-slate-600 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm text-slate-200 font-medium truncate">{log.problemName}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {new Date(log.dateSolved).toLocaleDateString(undefined, {
                  weekday: 'short', month: 'short', day: 'numeric',
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span
                className={twMerge(
                  'text-[11px] px-2 py-0.5 rounded border font-bold',
                  DIFFICULTY_STYLES[log.difficulty].badge,
                )}
              >
                {log.difficulty}
              </span>
              {log.link && (
                <a
                  href={log.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={() => deleteLog(log.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
