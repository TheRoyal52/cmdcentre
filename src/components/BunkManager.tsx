import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AttendanceRecord } from '../types';
import { Plus, Minus, AlertTriangle, CheckCircle2, Trash2, Shield } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

// Circular progress ring component
const ProgressRing: React.FC<{ percent: number; size?: number; strokeWidth?: number }> = ({
  percent,
  size = 80,
  strokeWidth = 7,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clamped / 100) * circumference;
  const isSafe = clamped >= 75;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#1e293b"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={isSafe ? '#10b981' : '#ef4444'}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
      />
    </svg>
  );
};

const DEFAULT_SUBJECTS = [
  'Electrical Machines',
  'Power Systems',
  'Control Systems',
  'Analog Electronics',
  'Digital Signal Processing',
  'Power Electronics',
];

export const BunkManager: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord));
      setRecords(data);
    });
    return () => unsubscribe();
  }, []);

  const updateAttendance = async (
    id: string,
    field: 'attendedClasses' | 'totalClasses',
    increment: number,
    currentVal: number,
  ) => {
    const newVal = Math.max(0, currentVal + increment);
    // If decrementing attended, ensure attended <= total
    if (field === 'attendedClasses') {
      const rec = records.find((r) => r.id === id);
      if (rec && increment > 0 && newVal > rec.totalClasses) return; // attended can't exceed total
    }
    await updateDoc(doc(db, 'attendance', id), { [field]: newVal });
  };

  const addSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSubject.trim();
    if (!name) return;
    await addDoc(collection(db, 'attendance'), {
      name,
      totalClasses: 0,
      attendedClasses: 0,
      targetPercent: 75,
    });
    setNewSubject('');
    setShowAddForm(false);
  };

  const seedDefaults = async () => {
    for (const subject of DEFAULT_SUBJECTS) {
      if (!records.find((r) => r.name === subject)) {
        await addDoc(collection(db, 'attendance'), {
          name: subject,
          totalClasses: 0,
          attendedClasses: 0,
          targetPercent: 75,
        });
      }
    }
  };

  const deleteRecord = async (id: string) => {
    await deleteDoc(doc(db, 'attendance', id));
  };

  const getStatusMessage = (attended: number, total: number, target: number) => {
    if (total === 0) return { text: 'No classes recorded yet.', safe: true, detail: null };
    const currentPercent = (attended / total) * 100;
    if (currentPercent >= target) {
      const safeBunks = Math.floor((attended * 100 - target * total) / target);
      return {
        text: `Safe — you can bunk ${safeBunks} more class${safeBunks !== 1 ? 'es' : ''}.`,
        safe: true,
        detail: `${currentPercent.toFixed(1)}% ≥ ${target}%`,
      };
    } else {
      const needed = Math.ceil((target * total - 100 * attended) / (100 - target));
      return {
        text: `Must attend next ${needed} class${needed !== 1 ? 'es' : ''} consecutively.`,
        safe: false,
        detail: `${currentPercent.toFixed(1)}% < ${target}%`,
      };
    }
  };

  const avgAttendance =
    records.length === 0
      ? 0
      : records.reduce((acc, r) => {
          return acc + (r.totalClasses === 0 ? 0 : (r.attendedClasses / r.totalClasses) * 100);
        }, 0) / records.length;

  const safeCount = records.filter((r) => {
    if (r.totalClasses === 0) return true;
    return (r.attendedClasses / r.totalClasses) * 100 >= r.targetPercent;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400 font-mono">{records.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wide">Subjects</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-cyan-400 font-mono">{avgAttendance.toFixed(1)}%</p>
          <p className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wide">Avg Attendance</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400 font-mono">{safeCount}/{records.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wide">Subjects Safe</p>
        </div>
      </div>

      {/* Title + Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Bunk Manager
        </h2>
        <div className="flex gap-2">
          {records.length === 0 && (
            <button
              onClick={seedDefaults}
              className="text-sm bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              Seed EE Subjects
            </button>
          )}
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="text-sm bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add Subject
          </button>
        </div>
      </div>

      {/* Add Subject Form */}
      {showAddForm && (
        <form
          onSubmit={addSubject}
          className="flex gap-2 p-4 bg-slate-800/50 border border-slate-700 rounded-xl"
        >
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Subject name..."
            autoFocus
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
          />
          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(false)}
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Subject Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {records.map((record) => {
          const percent =
            record.totalClasses === 0
              ? 0
              : (record.attendedClasses / record.totalClasses) * 100;
          const status = getStatusMessage(
            record.attendedClasses,
            record.totalClasses,
            record.targetPercent,
          );

          return (
            <div
              key={record.id}
              className={twMerge(
                'bg-slate-900 p-5 rounded-xl border shadow-lg relative overflow-hidden group transition-all hover:scale-[1.01]',
                status.safe ? 'border-slate-700 hover:border-emerald-500/40' : 'border-red-500/30',
              )}
            >
              {/* Side accent bar */}
              <div
                className={twMerge(
                  'absolute top-0 left-0 w-1 h-full rounded-l-xl',
                  status.safe ? 'bg-gradient-to-b from-emerald-500 to-cyan-500' : 'bg-red-500',
                )}
              />

              {/* Delete button */}
              <button
                onClick={() => deleteRecord(record.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-4 mb-4">
                {/* Progress Ring */}
                <div className="relative shrink-0">
                  <ProgressRing percent={percent} size={76} strokeWidth={7} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className={twMerge(
                        'text-sm font-bold font-mono',
                        status.safe ? 'text-emerald-400' : 'text-red-400',
                      )}
                    >
                      {percent.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="overflow-hidden">
                  <h3 className="text-base font-semibold text-slate-100 truncate">{record.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Target: {record.targetPercent}%</p>
                  {status.detail && (
                    <p
                      className={twMerge(
                        'text-xs font-mono mt-1',
                        status.safe ? 'text-emerald-500' : 'text-red-400',
                      )}
                    >
                      {status.detail}
                    </p>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-2 mb-4">
                {(
                  [
                    {
                      label: 'Attended',
                      field: 'attendedClasses' as const,
                      value: record.attendedClasses,
                    },
                    {
                      label: 'Total',
                      field: 'totalClasses' as const,
                      value: record.totalClasses,
                    },
                  ] as const
                ).map(({ label, field, value }) => (
                  <div
                    key={field}
                    className="flex items-center justify-between bg-slate-800 px-3 py-2 rounded-lg"
                  >
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                      {label}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateAttendance(record.id, field, -1, value)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-mono text-sm font-semibold">
                        {value}
                      </span>
                      <button
                        onClick={() => updateAttendance(record.id, field, 1, value)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-slate-700 rounded-md text-slate-400 hover:text-emerald-400 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Status badge */}
              <div
                className={twMerge(
                  'flex items-start gap-2 p-2.5 rounded-lg text-xs font-medium',
                  status.safe
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400',
                )}
              >
                {!status.safe ? (
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                )}
                <p>{status.text}</p>
              </div>
            </div>
          );
        })}

        {records.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-500">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No subjects tracked yet.</p>
            <p className="text-sm mt-1">Click "Seed EE Subjects" to get started instantly.</p>
          </div>
        )}
      </div>
    </div>
  );
};
