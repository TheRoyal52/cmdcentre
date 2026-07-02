import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { LeetCodeProfile } from '../types';
import {
  RefreshCw, Trophy, Zap, Target, ExternalLink,
  AlertCircle, User, TrendingUp,
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

/* ─── LeetCode public proxy (no key required) ─────────────────────────────── */
const API = 'https://alfa-leetcode-api.onrender.com';

/* ─── Heatmap helpers ────────────────────────────────────────────────────────── */
const WEEKS = 26;
const getHeatmapGrid = (calendar: Record<string, number>) => {
  const today = new Date();
  const grid: { date: string; count: number }[][] = [];

  let cursor = new Date(today);
  cursor.setDate(cursor.getDate() - cursor.getDay()); // start of current week (Sunday)
  cursor.setDate(cursor.getDate() - (WEEKS - 1) * 7);

  for (let w = 0; w < WEEKS; w++) {
    const week: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().split('T')[0];
      const ts = String(Math.floor(cursor.getTime() / 1000));
      week.push({ date: dateStr, count: calendar[ts] ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    grid.push(week);
  }
  return grid;
};

const heatColor = (count: number) => {
  if (count === 0) return 'bg-slate-800 border-slate-700';
  if (count <= 1)  return 'bg-emerald-900 border-emerald-800';
  if (count <= 3)  return 'bg-emerald-700 border-emerald-600';
  if (count <= 6)  return 'bg-emerald-500 border-emerald-400';
  return 'bg-emerald-400 border-emerald-300';
};

/* ─── Progress ring for E/M/H ────────────────────────────────────────────────── */
const SolvedRing: React.FC<{ solved: number; total: number; color: string; label: string }> = ({
  solved, total, color, label,
}) => {
  const pct    = total > 0 ? (solved / total) * 100 : 0;
  const r      = 28;
  const stroke = 5;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width={70} height={70} className="-rotate-90">
          <circle cx={35} cy={35} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
          <circle
            cx={35} cy={35} r={r}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-base font-bold font-mono" style={{ color }}>{solved}</span>
        </div>
      </div>
      <span className="text-[11px] text-slate-400 font-semibold">{label}</span>
      <span className="text-[10px] text-slate-600">/ {total}</span>
    </div>
  );
};

/* ─── Main component ─────────────────────────────────────────────────────────── */
export const LeetCodeStats: React.FC = () => {
  const [profile, setProfile]   = useState<LeetCodeProfile | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [tooltip, setTooltip]   = useState<{ date: string; count: number } | null>(null);

  /* Load saved username from Firestore userProfile */
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'userProfile', uid), (snap) => {
      const u = snap.data()?.leetcodeUsername;
      setUsername(u || null);
    });
    return () => unsub();
  }, []);

  const fetchStats = useCallback(async (user: string) => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, solvedRes] = await Promise.all([
        fetch(`${API}/userProfile/${user}`),
        fetch(`${API}/${user}/solved`),
      ]);

      if (!profileRes.ok) throw new Error(`User "${user}" not found on LeetCode.`);

      const profileData = await profileRes.json();
      const solvedData  = solvedRes.ok ? await solvedRes.json() : {};

      // Parse submission calendar (JSON string or object)
      let calendar: Record<string, number> = {};
      try {
        const raw = profileData.submissionCalendar;
        calendar = typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {});
      } catch (_) {}

      // Compute streak from calendar
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const ts = String(Math.floor(d.setHours(0,0,0,0) / 1000));
        // Check any timestamp in that day's window
        const hasSubmission = Object.entries(calendar).some(([t, c]) => {
          const dt = new Date(Number(t) * 1000);
          return dt.toDateString() === new Date(Number(ts) * 1000).toDateString() && c > 0;
        });
        if (hasSubmission) streak++;
        else break;
      }

      const acStats = profileData.submitStats?.acSubmissionNum ?? [];
      const getCount = (diff: string) => acStats.find((x: any) => x.difficulty === diff)?.count ?? 0;

      const totalQuestions = profileData.totalQuestions ?? 0;
      const totalEasy   = profileData.totalEasy   ?? 862;
      const totalMedium = profileData.totalMedium ?? 1803;
      const totalHard   = profileData.totalHard   ?? 797;

      const totalSolved  = solvedData.solvedProblem  ?? getCount('All');
      const easySolved   = solvedData.easySolved     ?? getCount('Easy');
      const mediumSolved = solvedData.mediumSolved   ?? getCount('Medium');
      const hardSolved   = solvedData.hardSolved     ?? getCount('Hard');

      const totalAC   = acStats.find((x: any) => x.difficulty === 'All')?.count ?? totalSolved;
      const totalSubs = acStats.find((x: any) => x.difficulty === 'All')?.submissions ?? 1;
      const acceptanceRate = totalSubs > 0 ? (totalAC / totalSubs) * 100 : 0;

      setProfile({
        username: profileData.username ?? user,
        ranking: profileData.profile?.ranking ?? 0,
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
      });
      setLastFetched(new Date());
    } catch (e: any) {
      setError(e.message ?? 'Failed to fetch LeetCode stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (username) fetchStats(username);
  }, [username, fetchStats]);

  /* ─── No username configured ─────────────────────────────────────────────── */
  if (!username) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-yellow-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-200 mb-2">LeetCode Not Connected</h3>
        <p className="text-slate-400 text-sm max-w-xs">
          Open <span className="text-emerald-400 font-semibold">Settings</span> (gear icon) in the sidebar and enter your LeetCode username to see live stats.
        </p>
      </div>
    );
  }

  /* ─── Loading ─────────────────────────────────────────────────────────────── */
  if (loading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Fetching stats for <span className="text-yellow-400">@{username}</span>…</p>
      </div>
    );
  }

  /* ─── Error ───────────────────────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-red-400 font-semibold">{error}</p>
        <button
          onClick={() => fetchStats(username)}
          className="bg-slate-800 border border-slate-700 hover:border-yellow-500 text-yellow-400 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!profile) return null;

  const heatmapGrid = getHeatmapGrid(profile.submissionCalendar);

  return (
    <div className="space-y-6">
      {/* ── Profile header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 p-5 bg-slate-800/60 border border-slate-700 rounded-2xl">
        {profile.avatar ? (
          <img src={profile.avatar} alt="" className="w-16 h-16 rounded-2xl border-2 border-yellow-500/30 shadow-lg shadow-yellow-500/10" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <User className="w-8 h-8 text-yellow-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-slate-100 truncate">
            {profile.realName || profile.username}
          </h3>
          <a
            href={`https://leetcode.com/${profile.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-400 text-sm hover:underline flex items-center gap-1 w-fit"
          >
            @{profile.username} <ExternalLink className="w-3 h-3" />
          </a>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              Rank #{profile.ranking.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              {profile.acceptanceRate.toFixed(1)}% Acceptance
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-orange-400" />
              {profile.streak}d Streak
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-center">
            <p className="text-3xl font-extrabold font-mono text-yellow-400">{profile.totalSolved}</p>
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">Solved</p>
          </div>
          <button
            onClick={() => fetchStats(username)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-yellow-400 transition-colors"
          >
            <RefreshCw className={twMerge('w-3.5 h-3.5', loading && 'animate-spin')} />
            {lastFetched ? lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Difficulty rings ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center gap-3 p-5 bg-slate-800/60 border border-slate-700 rounded-2xl">
          <SolvedRing solved={profile.easySolved} total={profile.totalEasy} color="#10b981" label="Easy" />
        </div>
        <div className="flex flex-col items-center gap-3 p-5 bg-slate-800/60 border border-slate-700 rounded-2xl">
          <SolvedRing solved={profile.mediumSolved} total={profile.totalMedium} color="#f59e0b" label="Medium" />
        </div>
        <div className="flex flex-col items-center gap-3 p-5 bg-slate-800/60 border border-slate-700 rounded-2xl">
          <SolvedRing solved={profile.hardSolved} total={profile.totalHard} color="#ef4444" label="Hard" />
        </div>
      </div>

      {/* ── Submission heatmap ─────────────────────────────────────────────── */}
      <div className="p-5 bg-slate-800/60 border border-slate-700 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            Submission Activity — Last 26 Weeks
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Less</span>
            {['bg-slate-800', 'bg-emerald-900', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-400'].map((c, i) => (
              <div key={i} className={twMerge('w-3 h-3 rounded-sm border border-slate-700', c)} />
            ))}
            <span>More</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex gap-1 min-w-fit">
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

        {tooltip && tooltip.count > 0 && (
          <p className="text-xs text-slate-400 mt-3 font-mono">
            📅 {tooltip.date} — <span className="text-emerald-400 font-bold">{tooltip.count}</span> submission{tooltip.count !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
};
