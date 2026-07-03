import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { MealLog, MealType } from '../types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Utensils, Plus, Trash2, TrendingUp, Flame, Sun, Moon, Apple, Coffee } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const MEAL_CONFIG: Record<MealType, { badge: string; color: string; icon: React.ElementType }> = {
  Breakfast: { badge: 'bg-[#F59E0B15] text-[#FBBF24] border-[#F59E0B25]', color: '#F59E0B', icon: Sun   },
  Lunch:     { badge: 'bg-[#F9731615] text-[#FB923C] border-[#F9731625]', color: '#F97316', icon: Utensils},
  Dinner:    { badge: 'bg-[#6366F115] text-[#818CF8] border-[#6366F125]', color: '#6366F1', icon: Moon  },
  Snack:     { badge: 'bg-[#10B98115] text-[#34D399] border-[#10B98125]', color: '#10B981', icon: Apple },
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
    <div className="bg-[#18181F] border border-[#2D2D42] rounded-lg p-3 shadow-overlay text-xs">
      <p className="font-semibold text-[#F1F5F9] mb-1">{label}</p>
      <p className="text-[#10B981] font-mono">{payload[0]?.value} kcal</p>
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
    toast.success('Meal logged.');
  };

  const deleteMeal = async (id: string) => { await deleteDoc(doc(db, 'meals', id)); toast.success('Entry deleted.'); };

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
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's progress */}
        <div className={twMerge(
          'lg:col-span-2 border rounded-lg p-5 transition-all duration-500',
          isOver
            ? 'bg-red-950/20 border-red-500/30'
            : 'bg-[#111118] border-[#1E1E2E]',
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-[#10B981]" strokeWidth={1.75} />
              <h2 className="text-[14px] font-semibold text-[#F1F5F9]">Today's Intake</h2>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono" style={{ color: isOver ? '#EF4444' : '#10B981' }}>{todayCalories}</p>
              <p className="text-[11px] text-[#475569] font-mono">/ {calorieGoal} kcal goal</p>
            </div>
          </div>

          <div className="mb-5">
            <div className="h-2.5 bg-[#1E1E2E] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, pct)}%`,
                  background: isOver ? 'linear-gradient(90deg, #EF4444, #F87171)'
                            : pct > 80 ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                            : 'linear-gradient(90deg, #10B981, #34D399)',
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[11px] text-[#475569] font-mono">
              <span>0</span>
              <span className={isOver ? 'text-red-400 font-semibold' : remaining < 200 ? 'text-amber-400 font-semibold' : 'text-[#10B981] font-semibold'}>
                {isOver ? `${Math.abs(remaining)} kcal over` : `${remaining} kcal remaining`}
              </span>
              <span>{calorieGoal}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {mealBreakdown.map(({ type, calories: cal, count }) => {
              const Ic = MEAL_CONFIG[type].icon;
              return (
                <div key={type} className={`p-3 rounded-md border text-center ${MEAL_CONFIG[type].badge}`}>
                  <Ic className="w-4 h-4 mx-auto mb-1" />
                  <p className="text-[11px] font-bold">{type}</p>
                  <p className="text-base font-bold font-mono mt-0.5">{cal}</p>
                  <p className="text-[10px] opacity-60">{count} item{count !== 1 ? 's' : ''}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Log form */}
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#10B981]" strokeWidth={1.75} />
            <h3 className="text-[14px] font-semibold text-[#F1F5F9]">Log Meal</h3>
          </div>
          <form onSubmit={addMeal} className="space-y-3">
            <input type="text" value={foodName} onChange={e => setFoodName(e.target.value)}
              placeholder="Food name (e.g. Dal Rice)"
              className="input-base"
              aria-label="Food name" />

            <div className="flex gap-2 items-center">
              <input type="number" min={0} max={5000} value={calories}
                onChange={e => setCalories(Number(e.target.value))}
                className="input-base flex-1"
                placeholder="Calories"
                aria-label="Calories" />
              <span className="text-[#475569] text-sm shrink-0">kcal</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {MEAL_TYPES.map(mt => (
                <button key={mt} type="button" onClick={() => setMealType(mt)}
                  className={twMerge(
                    'py-1.5 text-[12px] font-semibold rounded-md border transition-all',
                    mealType === mt ? MEAL_CONFIG[mt].badge : 'bg-[#0D0D12] border-[#1E1E2E] text-[#475569] hover:border-[#2D2D42]',
                  )}>
                  {mt}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[['Chai', 50], ['Roti', 80], ['Rice', 150], ['Egg', 70], ['Milk', 120]] .map(([n, c]) => (
                <button key={String(n)} type="button"
                  onClick={() => { setFoodName(String(n)); setCalories(Number(c)); }}
                  className="px-2 py-1 text-[11px] bg-[#0D0D12] border border-[#1E1E2E] hover:border-[#10B981]/30 text-[#475569] hover:text-[#10B981] rounded-md transition-colors font-mono">
                  {n} ({c})
                </button>
              ))}
            </div>

            <button type="submit"
              className="w-full bg-[#10B981] hover:bg-[#34D399] active:scale-95 text-[#09090B] font-bold py-2.5 rounded-md text-sm transition-all">
              Add Meal
            </button>
          </form>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="bg-[#111118] border border-[#1E1E2E] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#10B981]" strokeWidth={1.75} />
          <h3 className="text-[12px] font-semibold text-[#94A3B8]">Weekly Calorie Intake</h3>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" vertical={false} />
            <XAxis dataKey="label" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} width={40} />
            <ReferenceLine y={calorieGoal} stroke="#F59E0B" strokeDasharray="4 4" strokeOpacity={0.5} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="calories" stroke="#10B981" strokeWidth={2}
              dot={{ fill: '#10B981', r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-[#334155] font-mono mt-1.5 text-center">
          Amber dashed line = daily goal ({calorieGoal} kcal). Change in Settings.
        </p>
      </div>

      {/* Today's meal list */}
      <div className="bg-[#111118] border border-[#1E1E2E] rounded-lg p-5">
        <p className="section-label mb-4">Today's Meals</p>
        {todayLogs.length === 0
          ? <p className="text-[#334155] text-sm text-center py-6 font-mono">Nothing logged today yet.</p>
          : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {todayLogs.map(log => {
                const Ic = MEAL_CONFIG[log.mealType].icon;
                return (
                  <div key={log.id} className="flex items-center justify-between bg-[#0D0D12] border border-[#1E1E2E] px-3 py-3 rounded-md group hover:border-[#2D2D42] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Ic className="w-3.5 h-3.5 shrink-0" style={{ color: MEAL_CONFIG[log.mealType].color }} />
                      <div>
                        <p className="text-sm font-medium text-[#F1F5F9]">{log.name}</p>
                        <p className="text-[10px] text-[#475569] font-mono">{new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold font-mono" style={{ color: MEAL_CONFIG[log.mealType].color }}>{log.calories} kcal</span>
                      <span className={twMerge('text-[10px] px-1.5 py-0.5 rounded-sm border font-semibold', MEAL_CONFIG[log.mealType].badge)}>{log.mealType}</span>
                      <button onClick={() => deleteMeal(log.id)} className="opacity-0 group-hover:opacity-100 text-[#334155] hover:text-red-400 transition-all" aria-label="Delete meal">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </div>
    </div>
  );
};
