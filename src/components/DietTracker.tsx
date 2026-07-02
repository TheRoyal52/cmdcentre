import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { MealLog, MealType } from '../types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Utensils, Plus, Trash2, Target, TrendingUp, Apple } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const MEAL_STYLES: Record<MealType, { badge: string; emoji: string }> = {
  Breakfast: { badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',  emoji: '🌅' },
  Lunch:     { badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',  emoji: '☀️' },
  Dinner:    { badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',  emoji: '🌙' },
  Snack:     { badge: 'bg-green-500/15 text-green-400 border-green-500/30',     emoji: '🍎' },
};

const getLast7Days = () => Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return {
    full:  d.toISOString().split('T')[0],
    label: d.toLocaleDateString(undefined, { weekday: 'short' }),
  };
});

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-slate-200 mb-1">{label}</p>
      <p className="text-orange-400">{payload[0]?.value} kcal</p>
    </div>
  );
};

export const DietTracker: React.FC = () => {
  const [logs,         setLogs]         = useState<MealLog[]>([]);
  const [foodName,     setFoodName]     = useState('');
  const [calories,     setCalories]     = useState<number>(300);
  const [mealType,     setMealType]     = useState<MealType>('Breakfast');
  const [calorieGoal,  setCalorieGoal]  = useState(2000);

  // Load logs
  useEffect(() => {
    const q = query(collection(db, 'meals'), orderBy('date', 'desc'));
    return onSnapshot(q, snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as MealLog)));
    });
  }, []);

  // Load calorie goal from userProfile
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'userProfile', uid), snap => {
      setCalorieGoal(snap.data()?.calorieTarget ?? 2000);
    });
    return () => unsub();
  }, []);

  const addMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim() || !calories) return;
    await addDoc(collection(db, 'meals'), {
      name:     foodName.trim(),
      calories: Number(calories),
      mealType,
      date:     new Date().toISOString(),
    });
    setFoodName('');
    setCalories(300);
  };

  const deleteMeal = async (id: string) => deleteDoc(doc(db, 'meals', id));

  const today = new Date().toISOString().split('T')[0];

  const todayLogs = useMemo(() => logs.filter(l => l.date.startsWith(today)), [logs, today]);

  const todayCalories = todayLogs.reduce((s, l) => s + l.calories, 0);
  const pct = Math.min(100, (todayCalories / calorieGoal) * 100);
  const remaining = calorieGoal - todayCalories;
  const isOver = todayCalories > calorieGoal;

  // Macro breakdown by meal type today
  const mealBreakdown = MEAL_TYPES.map(mt => ({
    type: mt,
    calories: todayLogs.filter(l => l.mealType === mt).reduce((s, l) => s + l.calories, 0),
    count:    todayLogs.filter(l => l.mealType === mt).length,
  }));

  // Weekly chart
  const chartData = useMemo(() => {
    const days = getLast7Days();
    return days.map(({ full, label }) => ({
      label,
      calories: logs.filter(l => l.date.startsWith(full)).reduce((s, l) => s + l.calories, 0),
    }));
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Calorie ring + progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's progress */}
        <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-green-400" /> Today's Intake
            </h2>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono text-green-400">{todayCalories}</p>
              <p className="text-xs text-slate-500">/ {calorieGoal} kcal</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="h-4 bg-slate-900 rounded-full overflow-hidden">
              <div
                className={twMerge(
                  'h-full rounded-full transition-all duration-700',
                  isOver ? 'bg-gradient-to-r from-red-500 to-red-400'
                         : pct > 80 ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                         : 'bg-gradient-to-r from-green-500 to-emerald-400',
                )}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-slate-500">
              <span>0</span>
              <span className={twMerge('font-semibold', isOver ? 'text-red-400' : remaining < 200 ? 'text-yellow-400' : 'text-emerald-400')}>
                {isOver ? `⚠️ ${Math.abs(remaining)} kcal over!` : `${remaining} kcal remaining`}
              </span>
              <span>{calorieGoal}</span>
            </div>
          </div>

          {/* Meal breakdown chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {mealBreakdown.map(({ type, calories: cal, count }) => (
              <div key={type} className={twMerge('p-3 rounded-xl border text-center', MEAL_STYLES[type].badge)}>
                <p className="text-lg">{MEAL_STYLES[type].emoji}</p>
                <p className="text-xs font-bold mt-1">{type}</p>
                <p className="text-base font-bold font-mono mt-0.5">{cal}</p>
                <p className="text-[10px] opacity-60">{count} item{count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Log form */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <Plus className="w-4 h-4 text-green-400" /> Log Meal
          </h3>
          <form onSubmit={addMeal} className="space-y-3">
            <input type="text" value={foodName} onChange={e => setFoodName(e.target.value)}
              placeholder="Food name (e.g. Dal Rice)"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors" />

            <div className="flex gap-2">
              <input type="number" min={0} max={5000} value={calories}
                onChange={e => setCalories(Number(e.target.value))}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                placeholder="Calories" />
              <span className="text-slate-400 text-sm self-center shrink-0">kcal</span>
            </div>

            {/* Meal type pills */}
            <div className="grid grid-cols-2 gap-1.5">
              {MEAL_TYPES.map(mt => (
                <button key={mt} type="button" onClick={() => setMealType(mt)}
                  className={twMerge('py-1.5 text-xs font-semibold rounded-xl border transition-all',
                    mealType === mt ? MEAL_STYLES[mt].badge : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600')}>
                  {MEAL_STYLES[mt].emoji} {mt}
                </button>
              ))}
            </div>

            {/* Quick-add presets */}
            <div className="flex flex-wrap gap-1.5">
              {[['Chai ☕', 50], ['Roti 🫓', 80], ['Rice 🍚', 150], ['Egg 🥚', 70]].map(([n, c]) => (
                <button key={String(n)} type="button"
                  onClick={() => { setFoodName(String(n).replace(/ .*/,'')); setCalories(Number(c)); }}
                  className="px-2.5 py-1 text-[11px] bg-slate-900 border border-slate-700 hover:border-green-500/50 text-slate-400 hover:text-green-400 rounded-lg transition-colors">
                  {n} ({c})
                </button>
              ))}
            </div>

            <button type="submit"
              className="w-full bg-green-500 hover:bg-green-400 active:scale-95 text-slate-900 font-bold py-2.5 rounded-xl text-sm transition-all">
              Add Meal
            </button>
          </form>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" /> Weekly Calorie Intake
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="label" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} width={35} />
            <ReferenceLine y={calorieGoal} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.6} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="calories" stroke="#22c55e" strokeWidth={3}
              dot={{ fill: '#22c55e', r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-500 mt-1 text-center">
          Dashed line = daily goal ({calorieGoal} kcal). Change in <span className="text-emerald-400">Settings</span>.
        </p>
      </div>

      {/* Today's meal list */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wide">Today's Meals</h3>
        {todayLogs.length === 0
          ? <p className="text-slate-500 text-sm text-center py-6">Nothing logged today yet. Track what you eat! 🥗</p>
          : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
              {todayLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between bg-slate-900 px-4 py-3 rounded-xl border border-slate-700/80 group hover:border-slate-600 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {MEAL_STYLES[log.mealType].emoji} {log.name}
                    </p>
                    <p className="text-xs text-slate-500">{new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-green-400 font-mono">{log.calories} kcal</span>
                    <span className={twMerge('text-[11px] px-2 py-0.5 rounded-md border font-semibold', MEAL_STYLES[log.mealType].badge)}>
                      {log.mealType}
                    </span>
                    <button onClick={() => deleteMeal(log.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
};
