import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { WorkoutLog, WorkoutType } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Dumbbell, Plus, Trash2, Flame, Timer, Zap, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

const WORKOUT_TYPES: WorkoutType[] = ['Cardio', 'Strength', 'Yoga', 'HIIT', 'Other'];

const TYPE_STYLES: Record<WorkoutType, { badge: string; color: string; dot: string }> = {
  Cardio:   { badge: 'bg-[#F9731615] text-[#FB923C] border-[#F9731625]', color: '#F97316', dot: '#FB923C' },
  Strength: { badge: 'bg-[#6366F115] text-[#818CF8] border-[#6366F125]', color: '#6366F1', dot: '#818CF8' },
  Yoga:     { badge: 'bg-[#A78BFA15] text-[#A78BFA] border-[#A78BFA25]', color: '#A78BFA', dot: '#A78BFA' },
  HIIT:     { badge: 'bg-[#EF444415] text-[#F87171] border-[#EF444425]', color: '#EF4444', dot: '#F87171' },
  Other:    { badge: 'bg-[#47556915] text-[#94A3B8] border-[#47556925]', color: '#94A3B8', dot: '#94A3B8' },
};

const TYPE_LABELS: Record<WorkoutType, string> = {
  Cardio: 'Cardio', Strength: 'Strength', Yoga: 'Yoga', HIIT: 'HIIT', Other: 'Other',
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
    <div className="bg-[#18181F] border border-[#2D2D42] rounded-lg p-3 shadow-overlay text-xs">
      <p className="font-semibold text-[#F1F5F9] mb-1">{label}</p>
      <p className="text-[#F97316] font-mono">{payload[0]?.value} min</p>
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
    toast.success('Workout logged.');
  };

  const deleteLog = async (id: string) => { await deleteDoc(doc(db, 'workouts', id)); toast.success('Entry deleted.'); };

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
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Flame className={twMerge('w-5 h-5', streak > 0 ? 'text-[#F97316] flame-flicker' : 'text-[#334155]')} />
            <span className="text-2xl font-bold font-mono" style={{ color: streak > 0 ? '#F97316' : '#334155' }}>{streak}</span>
          </div>
          <p className="section-label">Day Streak</p>
        </div>
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Timer className="w-5 h-5 text-[#6366F1]" />
            <span className="text-2xl font-bold text-[#818CF8] font-mono">{todayMins}</span>
          </div>
          <p className="section-label">Mins Today</p>
        </div>
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-[#10B981]" />
            <span className="text-2xl font-bold text-[#10B981] font-mono">{weekMins}</span>
          </div>
          <p className="section-label">Mins This Week</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Log form */}
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-[#F97316]" strokeWidth={1.75} />
            <h2 className="text-[14px] font-semibold text-[#F1F5F9]">Log Workout</h2>
          </div>
          <form onSubmit={addLog} className="space-y-3">
            <input type="text" value={exercise} onChange={e => setExercise(e.target.value)}
              placeholder="Exercise (e.g. Running, Bench Press, Yoga)"
              className="input-base"
              aria-label="Exercise name" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="section-label block mb-1.5" htmlFor="fit-duration">Duration (min)</label>
                <input id="fit-duration" type="number" min={1} max={300} value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="input-base" />
              </div>
              <div>
                <label className="section-label block mb-1.5" htmlFor="fit-calories">Calories burned (opt)</label>
                <input id="fit-calories" type="number" min={0} value={calories}
                  onChange={e => setCalories(e.target.value)}
                  placeholder="e.g. 300"
                  className="input-base" />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {WORKOUT_TYPES.map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={twMerge(
                    'px-3 py-1.5 rounded-md text-[12px] font-semibold border transition-all',
                    type === t ? TYPE_STYLES[t].badge : 'bg-[#0D0D12] border-[#1E1E2E] text-[#475569] hover:border-[#2D2D42] hover:text-[#94A3B8]',
                  )}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            <button type="submit"
              className="w-full flex items-center justify-center gap-2 bg-[#F97316] hover:bg-[#FB923C] active:scale-95 text-[#09090B] font-bold py-2.5 rounded-md text-sm transition-all">
              <Plus className="w-4 h-4" /> Log Workout
            </button>
          </form>
        </div>

        {/* Weekly chart */}
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-lg p-5">
          <p className="text-[12px] font-semibold text-[#94A3B8] mb-4">Weekly Activity (minutes)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={26}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" vertical={false} />
              <XAxis dataKey="label" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Bar dataKey="mins" fill="#F97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto">
            <p className="section-label">Today</p>
            {todayLogs.length === 0
              ? <p className="text-[#334155] text-sm py-3 text-center font-mono">No workouts logged today</p>
              : todayLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between bg-[#0D0D12] border border-[#1E1E2E] px-3 py-2.5 rounded-md group hover:border-[#2D2D42] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-[#F1F5F9]">{log.exercise}</p>
                    <p className="text-[11px] text-[#475569] font-mono">{log.duration} min{log.calories ? ` · ${log.calories} kcal` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={twMerge('text-[10px] px-1.5 py-0.5 rounded-sm border font-semibold', TYPE_STYLES[log.type].badge)}>{log.type}</span>
                    <button onClick={() => deleteLog(log.id)} className="opacity-0 group-hover:opacity-100 text-[#334155] hover:text-red-400 transition-all" aria-label="Delete log">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-[#111118] border border-[#1E1E2E] rounded-lg p-5">
        <p className="section-label mb-4">Recent History</p>
        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {logs.length === 0
            ? <p className="text-[#334155] text-center py-8 text-sm font-mono">No workouts logged yet. Let's get moving!</p>
            : logs.map(log => (
              <div key={log.id} className="flex items-center justify-between bg-[#0D0D12] border border-[#1E1E2E] px-3 py-3 rounded-md group hover:border-[#2D2D42] transition-colors">
                <div>
                  <p className="text-[13px] font-medium text-[#F1F5F9]">{log.exercise}</p>
                  <p className="text-[11px] text-[#475569] font-mono">
                    {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' · '}{log.duration} min{log.calories ? ` · ${log.calories} kcal burned` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={twMerge('text-[10px] px-1.5 py-0.5 rounded-sm border font-semibold', TYPE_STYLES[log.type].badge)}>{log.type}</span>
                  <button onClick={() => deleteLog(log.id)} className="opacity-0 group-hover:opacity-100 text-[#334155] hover:text-red-400 transition-all" aria-label="Delete">
                    <Trash2 className="w-3 h-3" />
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
