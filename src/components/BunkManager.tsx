import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AttendanceRecord } from '../types';
import { Plus, Minus, AlertTriangle, CheckCircle2, Trash2, Shield, BookOpen } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

/* ─── Circular Progress Ring ─────────────────────────────────────────────── */
const ProgressRing: React.FC<{
  percent: number;
  size?: number;
  strokeWidth?: number;
  safeAt?: number;
}> = ({ percent, size = 78, strokeWidth = 6, safeAt = 75 }) => {
  const radius       = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped      = Math.min(100, Math.max(0, percent));
  const offset       = circumference - (clamped / 100) * circumference;
  const isSafe       = clamped >= safeAt;
  const isWarning    = clamped >= safeAt - 5 && !isSafe;
  const ringColor    = isSafe ? '#10B981' : isWarning ? '#F59E0B' : '#EF4444';

  return (
    <svg width={size} height={size} className="rotate-[-90deg]" role="img" aria-label={`${clamped.toFixed(0)}% attendance`}>
      {/* Track */}
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1E1E2E" strokeWidth={strokeWidth} />
      {/* Progress */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={ringColor}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.7s ease, stroke 0.4s ease' }}
      />
    </svg>
  );
};

const DEFAULT_SUBJECTS = [
  'Electrical Machines', 'Power Systems', 'Control Systems',
  'Analog Electronics', 'Digital Signal Processing', 'Power Electronics',
];

export const BunkManager: React.FC = () => {
  const [records,     setRecords]     = useState<AttendanceRecord[]>([]);
  const [newSubject,  setNewSubject]  = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, 'attendance'), snap => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    });
  }, []);

  const updateAttendance = async (
    id: string, field: 'attendedClasses' | 'totalClasses', increment: number, currentVal: number,
  ) => {
    const newVal = Math.max(0, currentVal + increment);
    if (field === 'attendedClasses') {
      const rec = records.find(r => r.id === id);
      if (rec && increment > 0 && newVal > rec.totalClasses) return;
    }
    await updateDoc(doc(db, 'attendance', id), { [field]: newVal });
  };

  const addSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSubject.trim();
    if (!name) return;
    await addDoc(collection(db, 'attendance'), { name, totalClasses: 0, attendedClasses: 0, targetPercent: 75 });
    setNewSubject('');
    setShowAddForm(false);
    toast.success(`"${name}" added.`);
  };

  const seedDefaults = async () => {
    for (const subject of DEFAULT_SUBJECTS) {
      if (!records.find(r => r.name === subject)) {
        await addDoc(collection(db, 'attendance'), { name: subject, totalClasses: 0, attendedClasses: 0, targetPercent: 75 });
      }
    }
    toast.success('EE subjects seeded.');
  };

  const deleteRecord = async (id: string, name: string) => {
    await deleteDoc(doc(db, 'attendance', id));
    toast.success(`"${name}" removed.`);
  };

  const getStatus = (attended: number, total: number, target: number) => {
    if (total === 0) return { text: 'No classes recorded yet.', type: 'empty' as const, detail: null };
    const pct = (attended / total) * 100;
    if (pct >= target) {
      const safeBunks = Math.floor((attended * 100 - target * total) / target);
      return {
        text:   `Safe — can bunk ${safeBunks} more class${safeBunks !== 1 ? 'es' : ''}`,
        type:   'safe' as const,
        detail: `${pct.toFixed(1)}% / target ${target}%`,
      };
    } else {
      const needed = Math.ceil((target * total - 100 * attended) / (100 - target));
      return {
        text:   `Attend next ${needed} class${needed !== 1 ? 'es' : ''} consecutively`,
        type:   'danger' as const,
        detail: `${pct.toFixed(1)}% / target ${target}%`,
      };
    }
  };

  const avgAttendance = records.length === 0 ? 0 :
    records.reduce((acc, r) => acc + (r.totalClasses === 0 ? 0 : (r.attendedClasses / r.totalClasses) * 100), 0) / records.length;
  const safeCount = records.filter(r => r.totalClasses === 0 || (r.attendedClasses / r.totalClasses) * 100 >= r.targetPercent).length;

  return (
    <div className="space-y-5">
      {/* Header row: summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Subjects', value: records.length, color: '#6366F1' },
          { label: 'Avg Attendance', value: `${avgAttendance.toFixed(1)}%`, color: avgAttendance >= 75 ? '#10B981' : '#EF4444' },
          { label: 'Subjects Safe', value: `${safeCount}/${records.length}`, color: '#10B981' },
        ].map(s => (
          <div key={s.label} className="bg-[#111118] border border-[#1E1E2E] rounded-lg p-4 text-center">
            <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="section-label mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Title + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#6366F1]" strokeWidth={1.75} />
          <h2 className="text-[15px] font-semibold text-[#F1F5F9]">Bunk Manager</h2>
        </div>
        <div className="flex gap-2">
          {records.length === 0 && (
            <button onClick={seedDefaults} className="btn-ghost text-xs">
              Seed EE Subjects
            </button>
          )}
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6366F1]/10 border border-[#6366F1]/25 hover:bg-[#6366F1]/15 text-[#818CF8] text-[12px] font-semibold rounded-md transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Subject
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <form onSubmit={addSubject} className="flex gap-2 p-3.5 bg-[#111118] border border-[#1E1E2E] rounded-lg animate-panel-in">
          <input
            type="text"
            value={newSubject}
            onChange={e => setNewSubject(e.target.value)}
            placeholder="Subject name…"
            autoFocus
            className="input-base flex-1 text-sm"
            aria-label="Subject name"
          />
          <button type="submit" className="btn-accent">Add</button>
          <button type="button" onClick={() => setShowAddForm(false)} className="btn-ghost">Cancel</button>
        </form>
      )}

      {/* Subject grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {records.map(record => {
          const pct    = record.totalClasses === 0 ? 0 : (record.attendedClasses / record.totalClasses) * 100;
          const status = getStatus(record.attendedClasses, record.totalClasses, record.targetPercent);
          const isSafe = status.type === 'safe' || status.type === 'empty';

          return (
            <div
              key={record.id}
              className={twMerge(
                'relative bg-[#111118] border rounded-lg p-4 overflow-hidden group',
                'transition-all duration-150',
                isSafe
                  ? 'border-[#1E1E2E] hover:border-[#2D2D42]'
                  : 'border-[#EF4444]/20 hover:border-[#EF4444]/35',
              )}
            >
              {/* Left accent bar */}
              <div
                className="absolute top-0 left-0 w-[3px] h-full rounded-l-lg"
                style={{ background: isSafe ? '#10B981' : '#EF4444' }}
              />

              {/* Delete button */}
              <button
                onClick={() => deleteRecord(record.id, record.name)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/10 text-[#334155] hover:text-red-400 transition-all"
                aria-label={`Delete ${record.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Top: ring + name */}
              <div className="flex items-center gap-4 mb-3 ml-2">
                <div className="relative shrink-0" title={`${pct.toFixed(1)}% attendance`}>
                  <ProgressRing percent={pct} safeAt={record.targetPercent} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className="text-[13px] font-bold font-mono"
                      style={{ color: isSafe ? '#10B981' : pct >= record.targetPercent - 5 ? '#F59E0B' : '#EF4444' }}
                    >
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-[14px] font-semibold text-[#F1F5F9] truncate">{record.name}</h3>
                  {status.detail && (
                    <p className="text-[11px] font-mono text-[#475569] mt-0.5">{status.detail}</p>
                  )}
                </div>
              </div>

              {/* Attended / Total controls */}
              <div className="space-y-2 ml-2 mb-3">
                {([
                  { label: 'Attended', field: 'attendedClasses' as const, value: record.attendedClasses },
                  { label: 'Total',    field: 'totalClasses'   as const, value: record.totalClasses    },
                ]).map(({ label, field, value }) => (
                  <div key={field} className="flex items-center justify-between bg-[#0D0D12] border border-[#1E1E2E] px-3 py-2 rounded-md">
                    <span className="text-[11px] text-[#475569] font-semibold uppercase tracking-wide">{label}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateAttendance(record.id, field, -1, value)}
                        className="w-6 h-6 flex items-center justify-center rounded-sm hover:bg-[#1F1F2A] text-[#475569] hover:text-[#F1F5F9] transition-colors"
                        aria-label={`Decrease ${label}`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-mono text-sm font-bold text-[#F1F5F9] tabular-nums">{value}</span>
                      <button
                        onClick={() => updateAttendance(record.id, field, 1, value)}
                        className="w-6 h-6 flex items-center justify-center rounded-sm hover:bg-[#1F1F2A] text-[#475569] hover:text-[#10B981] transition-colors"
                        aria-label={`Increase ${label}`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Status badge */}
              <div
                className={twMerge(
                  'ml-2 flex items-start gap-2 px-2.5 py-2 rounded-md text-[11px] font-medium',
                  isSafe
                    ? 'bg-[#10B981]/8 text-[#10B981] border border-[#10B981]/15'
                    : 'bg-[#EF4444]/8 text-[#EF4444] border border-[#EF4444]/15',
                )}
              >
                {isSafe
                  ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                }
                <span aria-live="polite">{status.text}</span>
              </div>
            </div>
          );
        })}

        {records.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-[#334155]" />
            <p className="text-[#475569] font-medium text-sm">No subjects tracked yet.</p>
            <p className="text-[#334155] text-xs mt-1">Click "Seed EE Subjects" to get started instantly.</p>
          </div>
        )}
      </div>
    </div>
  );
};
