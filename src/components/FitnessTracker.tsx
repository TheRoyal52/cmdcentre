import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { WorkoutLog, WorkoutType } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Dumbbell, Plus, Trash2, Flame, Timer, Zap } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const WORKOUT_TYPES: WorkoutType[] = ['Cardio', 'Strength', 'Yoga', 'HIIT', 'Other'];

const TYPE_STYLES: Record<WorkoutType, { badge: string; color: string }> = {
  Cardio:   { badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',  color: '#f97316' },
  Strength: { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',        color: '#3b82f6' },
  Yoga:     { badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',  color: '#a855f7' },
  HIIT:     { badge: 'bg-red-500/15 text-red-400 border-red-500/30',           color: '#ef4444' },
  Other:    { badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30',     color: '#94a3b8' },
};

const TYPE_EMOJIS: Record<WorkoutType, string> = {
  Cardio: '🏃', Strength: '💪', Yoga: '🧘', HIIT: '⚡', Other: '🏋️',
};

const getLast7Days = () => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      full: d.toISOString().split('T')[0],
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
    };
  });
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-slate-200 mb-1">{label}</p>
      <p className="text-orange-400">{payload[0]?.value} min</p>
    </div>
  );
};

export const FitnessTracker: React.FC = () => {
  const [logs,      setLogs]      = useState<WorkoutLog[]>([]);
  const [exercise,  setExercise]  = useState('');
  const [duration,  setDuration]  = useState<number>(30);
  const [type,      setType]      = useState<WorkoutType>('Cardio');
  const [calories,  setCalories]  = useState<string>('');

  useEffect(() => {
    const q = query(collection(db, 'workouts'), orderBy('date', 'desc'));
    return onSnapshot(q, snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkoutLog)));
    });
  }, []);

  const addLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exercise.trim()) return;
    await addDoc(collection(db, 'workouts'), {
      exercise: exercise.trim(),
      duration: Number(duration),
      type,
      ...(calories ? { calories: Number(calories) } : {}),
      date: new Date().toISOString(),
    });
    setExercise('');
    setDuration(30);
    setCalories('');
  };

  const deleteLog = async (id: string) => deleteDoc(doc(db, 'workouts', id));

  // Weekly chart data
  const chartData = useMemo(() => {
    const days = getLast7Days();
    return days.map(({ full, label }) => {
      const mins = logs
        .filter(l => l.date.startsWith(full))
        .reduce((s, l) => s + l.duration, 0);
      return { label, mins };
    });
  }, [logs]);

  // Streak
  const streak = useMemo(() => {
    const daySet = new Set(logs.map(l => l.date.split('T')[0]));
    let count = 0;
    const d = new Date();
    while (daySet.has(d.toISOString().split('T')[0])) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [logs]);

  const todayLogs = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return logs.filter(l => l.date.startsWith(today));
  }, [logs]);

  const todayMins = todayLogs.reduce((s, l) => s + l.duration, 0);
  const weekMins  = chartData.reduce((s, d) => s + d.mins, 0);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="text-2xl font-bold text-orange-400 font-mono">{streak}</span>
          </div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Day Streak</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Timer className="w-5 h-5 text-blue-400" />
            <span className="text-2xl font-bold text-blue-400 font-mono">{todayMins}</span>
          </div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Mins Today</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="text-2xl font-bold text-yellow-400 font-mono">{weekMins}</span>
          </div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Mins This Week</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Log form */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-orange-400" /> Log Workout
          </h2>
          <form onSubmit={addLog} className="space-y-3">
            <input type="text" value={exercise} onChange={e => setExercise(e.target.value)}
              placeholder="Exercise (e.g. Running, Bench Press, Surya Namaskar)"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block font-medium">Duration (min)</label>
                <input type="number" min={1} max={300} value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block font-medium">Calories burned (opt)</label>
                <input type="number" min={0} value={calories}
                  onChange={e => setCalories(e.target.value)}
                  placeholder="e.g. 300"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
            </div>

            {/* Type selector */}
            <div className="flex flex-wrap gap-2">
              {WORKOUT_TYPES.map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={twMerge('px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                    type === t ? TYPE_STYLES[t].badge + ' scale-105' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500')}>
                  {TYPE_EMOJIS[t]} {t}
                </button>
              ))}
            </div>

            <button type="submit"
              className="w-full bg-orange-500 hover:bg-orange-400 active:scale-95 text-slate-900 font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Log Workout
            </button>
          </form>
        </div>

        {/* Weekly chart */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Weekly Activity (minutes)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="mins" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Today's workouts */}
          <div className="mt-4 space-y-2 max-h-[160px] overflow-y-auto">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Today</p>
            {todayLogs.length === 0
              ? <p className="text-slate-600 text-sm py-3 text-center">No workouts logged today 💤</p>
              : todayLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-700/80 group">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{TYPE_EMOJIS[log.type]} {log.exercise}</p>
                    <p className="text-xs text-slate-500">{log.duration} min{log.calories ? ` · ${log.calories} kcal` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={twMerge('text-[11px] px-2 py-0.5 rounded-md border font-semibold', TYPE_STYLES[log.type].badge)}>
                      {log.type}
                    </span>
                    <button onClick={() => deleteLog(log.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* All logs */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wide">Recent History</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
          {logs.length === 0
            ? <p className="text-slate-500 text-center py-8 text-sm">No workouts logged yet. Let's get moving! 🏋️</p>
            : logs.map(log => (
              <div key={log.id} className="flex items-center justify-between bg-slate-900 px-4 py-3 rounded-xl border border-slate-700/80 group hover:border-slate-600 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-200">{TYPE_EMOJIS[log.type]} {log.exercise}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' · '}{log.duration} min{log.calories ? ` · 🔥 ${log.calories} kcal` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={twMerge('text-[11px] px-2 py-0.5 rounded-md border font-semibold', TYPE_STYLES[log.type].badge)}>
                    {log.type}
                  </span>
                  <button onClick={() => deleteLog(log.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};
