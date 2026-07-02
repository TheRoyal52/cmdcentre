import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

type Mode = 'work' | 'break';

const MODES: Record<Mode, { label: string; seconds: number; color: string; icon: React.ReactNode }> = {
  work:  { label: 'Focus',      seconds: 25 * 60, color: 'text-emerald-400', icon: <Brain className="w-3.5 h-3.5" /> },
  break: { label: 'Break',      seconds: 5 * 60,  color: 'text-cyan-400',    icon: <Coffee className="w-3.5 h-3.5" /> },
};

export const PomodoroTimer: React.FC = () => {
  const [mode, setMode] = useState<Mode>('work');
  const [secondsLeft, setSecondsLeft] = useState(MODES.work.seconds);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = MODES[mode].seconds;
  const percent = (secondsLeft / total) * 100;
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  // SVG ring
  const size = 100;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const switchMode = useCallback((m: Mode) => {
    setMode(m);
    setSecondsLeft(MODES[m].seconds);
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            if (mode === 'work') setSessions((n) => n + 1);
            // Auto-switch
            const next: Mode = mode === 'work' ? 'break' : 'work';
            setMode(next);
            setSecondsLeft(MODES[next].seconds);
            return MODES[next].seconds;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode]);

  const reset = () => {
    setRunning(false);
    setSecondsLeft(MODES[mode].seconds);
  };

  const modeInfo = MODES[mode];

  return (
    <div className="p-4 border-t border-slate-800">
      {/* Mode toggle */}
      <div className="flex gap-1 mb-4 bg-slate-900 p-1 rounded-lg">
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={twMerge(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all',
              mode === m
                ? 'bg-slate-700 text-slate-100 shadow'
                : 'text-slate-500 hover:text-slate-300',
            )}
          >
            {MODES[m].icon} {MODES[m].label}
          </button>
        ))}
      </div>

      {/* Ring + time */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#1e293b" strokeWidth={stroke} />
            <circle
              cx={size/2} cy={size/2} r={radius}
              fill="none"
              stroke={mode === 'work' ? '#10b981' : '#22d3ee'}
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={twMerge('text-xl font-bold font-mono', modeInfo.color)}>
              {minutes}:{seconds}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setRunning((r) => !r)}
            className={twMerge(
              'px-5 py-1.5 rounded-lg font-bold text-sm text-slate-900 transition-all active:scale-95',
              mode === 'work' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-cyan-500 hover:bg-cyan-400',
            )}
          >
            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          🍅 <span className="text-emerald-400 font-bold">{sessions}</span> sessions today
        </p>
      </div>
    </div>
  );
};
