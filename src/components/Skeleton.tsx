import React from 'react';
import { twMerge } from 'tailwind-merge';

/* ── Generic pulse block ─────────────────────────────────────────────────── */
const Pulse: React.FC<{ className?: string }> = ({ className }) => (
  <div className={twMerge('bg-slate-800 rounded-xl animate-pulse', className)} />
);

/* ── Card skeleton (generic panel) ──────────────────────────────────────── */
export const CardSkeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 4, className,
}) => (
  <div className={twMerge('bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-3', className)}>
    <Pulse className="h-5 w-2/5" />
    {Array.from({ length: rows }).map((_, i) => (
      <Pulse key={i} className={twMerge('h-4', i % 3 === 2 ? 'w-3/5' : 'w-full')} />
    ))}
  </div>
);

/* ── Dashboard 6-stat row skeleton ───────────────────────────────────────── */
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-7">
    {/* Greeting */}
    <div className="space-y-2">
      <Pulse className="h-8 w-64" />
      <Pulse className="h-4 w-40" />
    </div>
    {/* Stats row */}
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 flex items-center gap-4 animate-pulse">
          <Pulse className="w-12 h-12 rounded-xl shrink-0 !rounded-xl" />
          <div className="space-y-2 flex-1">
            <Pulse className="h-6 w-12" />
            <Pulse className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
    {/* Main grid */}
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <CardSkeleton rows={6} className="h-[520px]" />
      <CardSkeleton rows={6} className="h-[520px]" />
    </div>
    <CardSkeleton rows={4} />
  </div>
);

/* ── LeetCode skeleton ────────────────────────────────────────────────────── */
export const LeetCodeSkeleton: React.FC = () => (
  <div className="space-y-5 animate-pulse">
    <div className="flex items-center gap-5 p-5 bg-slate-800/60 border border-slate-700 rounded-2xl">
      <Pulse className="w-16 h-16 rounded-2xl shrink-0" />
      <div className="space-y-2 flex-1">
        <Pulse className="h-6 w-36" />
        <Pulse className="h-4 w-28" />
        <div className="flex gap-4">
          <Pulse className="h-3 w-20" />
          <Pulse className="h-3 w-24" />
        </div>
      </div>
      <Pulse className="w-16 h-14 rounded-xl shrink-0" />
    </div>
    <div className="grid grid-cols-3 gap-4">
      {[0,1,2].map(i => <Pulse key={i} className="h-32 rounded-2xl" />)}
    </div>
    <Pulse className="h-44 rounded-2xl" />
  </div>
);

/* ── Table-style skeleton (for task list, history, etc.) ────────────────── */
export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 px-4 py-3 rounded-xl animate-pulse">
        <Pulse className="w-8 h-8 rounded-lg shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Pulse className={twMerge('h-4', i % 2 === 0 ? 'w-3/4' : 'w-1/2')} />
          <Pulse className="h-3 w-1/3" />
        </div>
        <Pulse className="w-16 h-6 rounded-lg shrink-0" />
      </div>
    ))}
  </div>
);
