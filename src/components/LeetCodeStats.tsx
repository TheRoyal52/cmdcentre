import React, { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { LeetCodeProfile } from '../types';
import {
  RefreshCw, Trophy, Flame, Target, ExternalLink,
  AlertCircle, User, TrendingUp, Clock, Zap,
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const API = 'https://alfa-leetcode-api.onrender.com';
const FETCH_TIMEOUT_MS = 12000; // 12s — free tier cold starts

/* ─── Heatmap helpers ────────────────────────────────────────────────────────── */
const WEEKS = 26;
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const getHeatmapGrid = (calendar: Record<string, number>) => {
  const today = new Date();
  const grid: { date: string; count: number; monthStart?: string }[][] = [];
  let cursor = new Date(today);
  cursor.setDate(cursor.getDate() - cursor.getDay());
  cursor.setDate(cursor.getDate() - (WEEKS - 1) * 7);

  for (let w = 0; w < WEEKS; w++) {
    const week: { date: string; count: number; monthStart?: string }[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().split('T')[0];
      const ts = String(Math.floor(cursor.getTime() / 1000));
      const isFirst = cursor.getDate() === 1;
      week.push({
        date: dateStr,
        count: calendar[ts] ?? 0,
        monthStart: d === 0 && isFirst ? MONTH_ABBR[cursor.getMonth()] : undefined,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    grid.push(week);
  }
  return grid;
};

/* 5-level heatmap: indigo-themed (one brand color) */
const heatColor = (count: number) => {
  if (count === 0) return 'bg-[#1E1E2E] border-[#252535]';
  if (count <= 1)  return 'bg-[#6366F1]/20 border-[#6366F1]/30';
  if (count <= 3)  return 'bg-[#6366F1]/45 border-[#6366F1]/50';
  if (count <= 6)  return 'bg-[#6366F1]/70 border-[#6366F1]/75';
  return                  'bg-[#6366F1] border-[#818CF8]';
};

/* ─── Progress ring for E/M/H ────────────────────────────────────────────────── */
const SolvedRing: React.FC<{
  solved: number; total: number; color: string; label: string; bgDark: string;
}> = ({ solved, total, color, label, bgDark }) => {
  const pct    = total > 0 ? (solved / total) * 100 : 0;
  const r      = 30;
  const stroke = 5;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={72} height={72} className="-rotate-90">
          <circle cx={36} cy={36} r={r} fill="none" stroke={bgDark} strokeWidth={stroke} />
          <circle
            cx={36} cy={36} r={r}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-[15px] font-bold font-mono leading-none" style={{ color }}>{solved}</span>
          <span className="text-[9px] font-mono" style={{ color: bgDark }}>/{total}</span>
        </div>
      </div>
      <span className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide">{label}</span>
    </div>
  );
};

/* ─── Acceptance rate segmented gauge ──────────────────────────────────────── */
const AcceptanceGauge: React.FC<{ rate: number }> = ({ rate }) => {
  const segs = 20;
  const filled = Math.round((rate / 100) * segs);
  const color = rate >= 70 ? '#10B981' : rate >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: segs }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 flex-1 rounded-full transition-all"
          style={{ background: i < filled ? color : '#1E1E2E' }}
        />
      ))}
    </div>
  );
};

/* ─── Main component ─────────────────────────────────────────────────────────── */
export const LeetCodeStats: React.FC = () => {
  const [profile, setProfile]   = useState<LeetCodeProfile | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryIn,  setRetryIn]  = useState(0);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [tooltip, setTooltip]   = useState<{ date: string; count: number } | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'userProfile', uid), (snap) => {
      const u = snap.data()?.leetcodeUsername;
      setUsername(u || null);
    });
    return () => unsub();
  }, []);

  const fetchStats = useCallback(async (user: string, isRetry = false) => {
    setLoading(true);
    setError(null);
    if (isRetry) setRetrying(true);

    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const [profileRes, solvedRes] = await Promise.all([
        fetch(`${API}/userProfile/${user}`, { signal: controller.signal }),
        fetch(`${API}/${user}/solved`,       { signal: controller.signal }),
      ]);
      clearTimeout(timeoutId);

      if (!profileRes.ok) throw new Error(`User "${user}" not found on LeetCode.`);

      const profileData = await profileRes.json();
      const solvedData  = solvedRes.ok ? await solvedRes.json() : {};

      let calendar: Record<string, number> = {};
      try {
        const raw = profileData.submissionCalendar;
        calendar = typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {});
      } catch (_) {}

      // Compute streak
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const ts = String(Math.floor(d.setHours(0,0,0,0) / 1000));
        const hasSubmission = Object.entries(calendar).some(([t, c]) => {
          const dt = new Date(Number(t) * 1000);
          return dt.toDateString() === new Date(Number(ts) * 1000).toDateString() && c > 0;
        });
        if (hasSubmission) streak++;
        else break;
      }

      const acStats = profileData.submitStats?.acSubmissionNum ?? [];
      const getCount = (diff: string) => acStats.find((x: any) => x.difficulty === diff)?.count ?? 0;
      const totalSolved  = solvedData.solvedProblem  ?? getCount('All');
      const easySolved   = solvedData.easySolved     ?? getCount('Easy');
      const mediumSolved = solvedData.mediumSolved   ?? getCount('Medium');
      const hardSolved   = solvedData.hardSolved     ?? getCount('Hard');
      const totalEasy    = profileData.totalEasy   ?? 862;
      const totalMedium  = profileData.totalMedium ?? 1803;
      const totalHard    = profileData.totalHard   ?? 797;
      const totalAll     = totalEasy + totalMedium + totalHard;
      const totalAC   = acStats.find((x: any) => x.difficulty === 'All')?.count ?? totalSolved;
      const totalSubs = acStats.find((x: any) => x.difficulty === 'All')?.submissions ?? 1;
      const acceptanceRate = totalSubs > 0 ? (totalAC / totalSubs) * 100 : 0;
      const ranking = profileData.profile?.ranking ?? 0;
      // Top % approximation: LeetCode has ~5M active users
      const topPct  = ranking > 0 ? Math.min(99.9, (ranking / 5000000) * 100).toFixed(1) : null;

      setProfile({
        username: profileData.username ?? user,
        ranking,
        topPct,
        avatar:  profileData.profile?.userAvatar ?? '',
        realName: profileData.profile?.realName ?? user,
        totalSolved,
        easySolved,
        mediumSolved,
        hardSolved,
        totalEasy,
        totalMedium,
        totalHard,
        acceptanceRate,
        submissionCalendar: calendar,
        streak,
        totalAll,
      } as any);
      setLastFetched(new Date());
    } catch (e: any) {
      if (e.name === 'AbortError') {
        // Timeout — start 10s retry countdown
        setError('LeetCode service is waking up (free tier). Retrying in 10s…');
        setRetryIn(10);
        const interval = setInterval(() => {
          setRetryIn(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              setError(null);
              fetchStats(user, true);
              return 0;
            }
            setError(`LeetCode service is waking up (free tier). Retrying in ${prev - 1}s…`);
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(e.message ?? 'Failed to fetch LeetCode stats.');
      }
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    if (username) fetchStats(username);
  }, [username, fetchStats]);

  /* ─── No username ─────────────────────────────────────────────────────────── */
  if (!username) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
        <div className="w-16 h-16 bg-[#FCD34D]/10 border border-[#FCD34D]/20 rounded-lg flex items-center justify-center">
          <User className="w-8 h-8 text-[#FCD34D]" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">LeetCode Not Connected</h3>
          <p className="text-[#475569] text-sm max-w-xs">
            Open <span className="text-[#6366F1] font-semibold">Settings</span> (gear icon) and enter your LeetCode username to see live stats.
          </p>
        </div>
        {/* Demo preview skeleton */}
        <div className="w-full max-w-sm p-4 bg-[#111118] border border-[#1E1E2E] rounded-lg space-y-3 opacity-40 pointer-events-none select-none">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-[#1E1E2E]" />
            <div className="space-y-1.5">
              <div className="h-3 w-24 bg-[#1E1E2E] rounded" />
              <div className="h-2 w-16 bg-[#1E1E2E] rounded" />
            </div>
            <div className="ml-auto text-right">
              <div className="h-6 w-10 bg-[#FCD34D]/20 rounded" />
              <div className="h-2 w-8 bg-[#1E1E2E] rounded mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['#10B981','#F59E0B','#EF4444'].map(c => (
              <div key={c} className="h-16 rounded-md border border-[#1E1E2E] flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-4 border-[#1E1E2E]" style={{ borderTopColor: c }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Loading ─────────────────────────────────────────────────────────────── */
  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-2 border-[#FCD34D] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#475569] text-sm font-mono">
          Fetching stats for <span className="text-[#FCD34D]">@{username}</span>…
        </p>
        {error && (
          <div className="max-w-sm text-center p-3 bg-[#F59E0B]/8 border border-[#F59E0B]/20 rounded-md">
            <p className="text-[12px] text-[#FBBF24]">{error}</p>
          </div>
        )}
      </div>
    );
  }

  /* ─── Error ───────────────────────────────────────────────────────────────── */
  if (error && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-red-400 text-sm max-w-xs">{error}</p>
        <button
          onClick={() => fetchStats(username)}
          className="bg-[#1E1E2E] border border-[#2D2D42] hover:border-[#FCD34D]/50 text-[#FCD34D] px-4 py-2 rounded-md text-sm font-semibold transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!profile) return null;

  const heatmapGrid = getHeatmapGrid((profile as any).submissionCalendar);
  const p = profile as any;

  return (
    <div className="space-y-5 panel-enter">

      {/* ── Profile header ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 p-4 bg-[#111118] border border-[#1E1E2E] rounded-lg">
        {p.avatar ? (
          <img src={p.avatar} alt="" className="w-14 h-14 rounded-md border border-[#FCD34D]/20" />
        ) : (
          <div className="w-14 h-14 rounded-md bg-[#FCD34D]/10 border border-[#FCD34D]/20 flex items-center justify-center">
            <User className="w-7 h-7 text-[#FCD34D]" strokeWidth={1.5} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-[#F1F5F9] truncate">{p.realName || p.username}</h3>
          <a
            href={`https://leetcode.com/${p.username}`}
            target="_blank" rel="noopener noreferrer"
            className="text-[#FCD34D] text-[12px] hover:underline flex items-center gap-1 w-fit font-mono"
          >
            @{p.username} <ExternalLink className="w-3 h-3" />
          </a>
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            <span className="text-[11px] text-[#475569] flex items-center gap-1 font-mono">
              <Trophy className="w-3 h-3 text-[#FCD34D]" />
              #{p.ranking.toLocaleString()}
              {p.topPct && <span className="text-[#334155]">· Top {p.topPct}%</span>}
            </span>
            <span className="text-[11px] text-[#475569] flex items-center gap-1 font-mono">
              <Flame className={twMerge('w-3 h-3', p.streak > 0 ? 'text-[#F97316] flame-flicker' : 'text-[#334155]')} />
              <span style={{ color: p.streak > 0 ? '#F97316' : '#334155' }}>{p.streak}d streak</span>
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-right">
            <p className="text-[28px] font-extrabold font-mono text-[#FCD34D] leading-none">{p.totalSolved}</p>
            <p className="section-label mt-0.5">Solved</p>
          </div>
          <button
            onClick={() => fetchStats(username)}
            disabled={loading}
            className="flex items-center gap-1 text-[11px] text-[#334155] hover:text-[#FCD34D] transition-colors font-mono"
            aria-label="Refresh LeetCode stats"
          >
            <RefreshCw className={twMerge('w-3 h-3', loading && 'animate-spin')} />
            {lastFetched ? lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Acceptance rate ──────────────────────────────────────────────────── */}
      <div className="p-4 bg-[#111118] border border-[#1E1E2E] rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#475569]" strokeWidth={1.75} />
            <p className="section-label">Acceptance Rate</p>
          </div>
          <span
            className="text-[14px] font-bold font-mono"
            style={{ color: p.acceptanceRate >= 70 ? '#10B981' : p.acceptanceRate >= 50 ? '#F59E0B' : '#EF4444' }}
          >
            {p.acceptanceRate.toFixed(1)}%
          </span>
        </div>
        <AcceptanceGauge rate={p.acceptanceRate} />
      </div>

      {/* ── Difficulty rings ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Easy',   solved: p.easySolved,   total: p.totalEasy,   color: '#10B981', bg: '#052E16' },
          { label: 'Medium', solved: p.mediumSolved, total: p.totalMedium, color: '#F59E0B', bg: '#451A03' },
          { label: 'Hard',   solved: p.hardSolved,   total: p.totalHard,   color: '#EF4444', bg: '#450A0A' },
        ].map(r => (
          <div key={r.label} className="flex flex-col items-center gap-2 p-4 bg-[#111118] border border-[#1E1E2E] rounded-lg hover:border-[#2D2D42] transition-colors">
            <SolvedRing {...r} bgDark={r.bg} />
          </div>
        ))}
      </div>

      {/* ── Submission heatmap ───────────────────────────────────────────────── */}
      <div className="p-4 bg-[#111118] border border-[#1E1E2E] rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-[#475569]" strokeWidth={1.75} />
            <p className="section-label">Activity — Last 26 Weeks</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-[#334155]">
            <span>Less</span>
            {['bg-[#1E1E2E]','bg-[#6366F1]/20','bg-[#6366F1]/45','bg-[#6366F1]/70','bg-[#6366F1]'].map((c, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
            ))}
            <span>More</span>
          </div>
        </div>

        {/* Month labels row */}
        <div className="overflow-x-auto pb-1">
          <div className="min-w-fit">
            {/* Month labels */}
            <div className="flex gap-1 mb-1">
              {heatmapGrid.map((week, wi) => (
                <div key={wi} className="w-3 flex-shrink-0 text-[8px] font-mono text-[#334155] leading-none">
                  {week[0]?.monthStart ?? ''}
                </div>
              ))}
            </div>
            {/* Grid */}
            <div className="flex gap-1">
              {heatmapGrid.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className={twMerge('w-3 h-3 rounded-sm border cursor-pointer transition-transform hover:scale-125', heatColor(day.count))}
                      onMouseEnter={() => setTooltip(day)}
                      onMouseLeave={() => setTooltip(null)}
                      title={`${day.date}: ${day.count} submission${day.count !== 1 ? 's' : ''}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {tooltip && tooltip.count > 0 && (
          <p className="text-[11px] text-[#475569] mt-3 font-mono">
            {tooltip.date} — <span className="text-[#6366F1] font-bold">{tooltip.count}</span> submission{tooltip.count !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
};
