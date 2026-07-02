import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc, query, where, setDoc, getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AttendanceRecord, AttendanceDay } from '../types';
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const toISO = (d: Date) => d.toISOString().split('T')[0]; // YYYY-MM-DD

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

/* Color for a day cell based on attendance ratio */
const cellColor = (attended: number, total: number): string => {
  if (total === 0) return 'bg-slate-800 border-slate-700 text-slate-600';
  const pct = attended / total;
  if (pct === 1)   return 'bg-emerald-600  border-emerald-500  text-emerald-100';
  if (pct >= 0.75) return 'bg-emerald-800  border-emerald-700  text-emerald-300';
  if (pct >= 0.5)  return 'bg-yellow-800   border-yellow-700   text-yellow-300';
  if (pct > 0)     return 'bg-red-800      border-red-700      text-red-300';
  return 'bg-red-950 border-red-900 text-red-400'; // total > 0, attended = 0
};

/* ─── Day edit modal ──────────────────────────────────────────────────────── */
interface DayModalProps {
  date: string;
  subjectId: string;
  subjectName: string;
  existing?: AttendanceDay;
  onClose: () => void;
}
const DayModal: React.FC<DayModalProps> = ({ date, subjectId, subjectName, existing, onClose }) => {
  const [total,    setTotal]    = useState(existing?.total    ?? 1);
  const [attended, setAttended] = useState(existing?.attended ?? 1);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const docId = `${subjectId}_${date}`;
    await setDoc(doc(db, 'attendanceDays', docId), {
      subjectId,
      subjectName,
      date,
      total:    Number(total),
      attended: Math.min(Number(attended), Number(total)),
    });
    setSaving(false);
    onClose();
  };

  const remove = async () => {
    const docId = `${subjectId}_${date}`;
    await deleteDoc(doc(db, 'attendanceDays', docId));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-5">
        <div>
          <h3 className="font-bold text-slate-100">{subjectName}</h3>
          <p className="text-sm text-slate-400">{new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Total Classes</label>
            <input type="number" min={0} max={20} value={total}
              onChange={e => setTotal(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-center text-lg font-bold focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Attended</label>
            <input type="number" min={0} max={total} value={attended}
              onChange={e => setAttended(Math.min(Number(e.target.value), total))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-center text-lg font-bold focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex gap-2">
          {[[1,1],[2,2],[1,0]].map(([t,a]) => (
            <button key={`${t}${a}`} onClick={() => { setTotal(t); setAttended(a); }}
              className={twMerge('flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors',
                a === t ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400')}>
              {t === a ? `✓ ${t}/${t}` : `✗ ${a}/${t}`}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={save} disabled={saving}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save'}
          </button>
          {existing && (
            <button onClick={remove}
              className="px-3 py-2.5 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Main Calendar ────────────────────────────────────────────────────────── */
export const AttendanceCalendar: React.FC = () => {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [subjects,  setSubjects]  = useState<AttendanceRecord[]>([]);
  const [days,      setDays]      = useState<AttendanceDay[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<AttendanceRecord | null>(null);
  const [editDay, setEditDay] = useState<string | null>(null);

  /* Fetch subjects */
  useEffect(() => {
    return onSnapshot(collection(db, 'attendance'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
      setSubjects(data);
      if (data.length > 0 && !selectedSubject) setSelectedSubject(data[0]);
    });
  }, []);

  /* Fetch days for this subject + month */
  useEffect(() => {
    if (!selectedSubject) return;
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate   = `${year}-${String(month + 1).padStart(2, '0')}-31`;
    const q = query(
      collection(db, 'attendanceDays'),
      where('subjectId', '==', selectedSubject.id),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
    );
    return onSnapshot(q, (snap) => {
      setDays(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceDay)));
    });
  }, [selectedSubject, year, month]);

  /* Build calendar grid */
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const dayMap = useMemo(() => {
    const m: Record<string, AttendanceDay> = {};
    days.forEach(d => { m[d.date] = d; });
    return m;
  }, [days]);

  const totalAttended = days.reduce((s, d) => s + d.attended, 0);
  const totalClasses  = days.reduce((s, d) => s + d.total, 0);
  const monthPct = totalClasses > 0 ? ((totalAttended / totalClasses) * 100).toFixed(1) : '—';

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const existingDay = editDay ? dayMap[editDay] : undefined;

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CalendarDays className="w-12 h-12 text-slate-600 mb-4" />
        <h3 className="text-xl font-bold text-slate-300 mb-2">No Subjects Yet</h3>
        <p className="text-slate-500 text-sm">Add subjects in <strong>Bunk Manager</strong> first, then use this calendar to log attendance by date.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Edit modal */}
      {editDay && selectedSubject && (
        <DayModal
          date={editDay}
          subjectId={selectedSubject.id}
          subjectName={selectedSubject.name}
          existing={existingDay}
          onClose={() => setEditDay(null)}
        />
      )}

      {/* Subject selector */}
      <div className="flex flex-wrap gap-2">
        {subjects.map(sub => (
          <button key={sub.id} onClick={() => setSelectedSubject(sub)}
            className={twMerge(
              'px-4 py-2 rounded-xl text-sm font-semibold border transition-all',
              selectedSubject?.id === sub.id
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600',
            )}>
            {sub.name}
          </button>
        ))}
      </div>

      {/* Calendar card */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-100">{monthNames[month]} {year}</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {selectedSubject?.name} ·{' '}
              <span className={twMerge('font-bold', Number(monthPct) >= 75 ? 'text-emerald-400' : 'text-red-400')}>
                {monthPct}%
              </span>
              {totalClasses > 0 && <span className="text-slate-500"> ({totalAttended}/{totalClasses})</span>}
            </p>
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day name headers */}
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map(d => (
            <div key={d} className="text-center text-xs font-bold text-slate-500 py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((dayNum, i) => {
            if (dayNum === null) return <div key={i} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayData = dayMap[dateStr];
            const isFuture = new Date(dateStr) > today;
            const isToday  = dateStr === toISO(today);

            return (
              <button
                key={i}
                disabled={isFuture}
                onClick={() => setEditDay(dateStr)}
                className={twMerge(
                  'aspect-square flex flex-col items-center justify-center rounded-lg border text-xs font-semibold transition-all hover:scale-105 hover:shadow-lg disabled:opacity-30 disabled:cursor-not-allowed relative',
                  dayData ? cellColor(dayData.attended, dayData.total) : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300',
                  isToday && 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-900',
                )}
              >
                <span className="text-[13px]">{dayNum}</span>
                {dayData && (
                  <span className="text-[9px] opacity-70 leading-none">
                    {dayData.attended}/{dayData.total}
                  </span>
                )}
                {isToday && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-5 pt-4 border-t border-slate-700/50 flex-wrap text-[11px] text-slate-500">
          {[
            { label: 'No class', cls: 'bg-slate-800 border-slate-700' },
            { label: 'Bunked',   cls: 'bg-red-950 border-red-900' },
            { label: '50%+ att', cls: 'bg-yellow-800 border-yellow-700' },
            { label: '75%+ att', cls: 'bg-emerald-800 border-emerald-700' },
            { label: 'Full att', cls: 'bg-emerald-600 border-emerald-500' },
          ].map(({ label, cls }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={twMerge('w-3 h-3 rounded border', cls)} />
              <span>{label}</span>
            </div>
          ))}
          <span className="ml-auto text-slate-600 italic">Click any past day to log attendance</span>
        </div>
      </div>

      {/* Monthly summary */}
      {days.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400 font-mono">{totalAttended}</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">Attended</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-300 font-mono">{totalClasses}</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">Total Classes</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
            <p className={twMerge('text-2xl font-bold font-mono', Number(monthPct) >= 75 ? 'text-emerald-400' : 'text-red-400')}>
              {monthPct}%
            </p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wide">This Month</p>
          </div>
        </div>
      )}
    </div>
  );
};
