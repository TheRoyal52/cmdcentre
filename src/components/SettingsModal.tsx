import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { X, Settings, Save, CheckCircle2, ExternalLink, User, Flame } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [calorieTarget, setCalorieTarget]       = useState(2000);
  const [weightKg,      setWeightKg]            = useState<string>('');
  const [heightCm,      setHeightCm]            = useState<string>('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDoc(doc(db, 'userProfile', uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setLeetcodeUsername(d.leetcodeUsername ?? '');
        setCalorieTarget(d.calorieTarget ?? 2000);
        setWeightKg(d.weightKg ? String(d.weightKg) : '');
        setHeightCm(d.heightCm ? String(d.heightCm) : '');
      }
    });
  }, [isOpen]);

  const save = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setSaving(true);
    await setDoc(
      doc(db, 'userProfile', uid),
      {
        leetcodeUsername: leetcodeUsername.trim().toLowerCase(),
        calorieTarget: Number(calorieTarget) || 2000,
        ...(weightKg ? { weightKg: Number(weightKg) } : {}),
        ...(heightCm ? { heightCm: Number(heightCm) } : {}),
      },
      { merge: true },
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <Settings className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-lg">Settings</h2>
              <p className="text-xs text-slate-400">Personalize your Command Center</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* LeetCode section */}
          <section>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="text-yellow-400">⚡</span> LeetCode
            </h3>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Username</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={leetcodeUsername}
                  onChange={(e) => setLeetcodeUsername(e.target.value)}
                  placeholder="your-leetcode-username"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-yellow-500 transition-colors"
                />
              </div>
              {leetcodeUsername && (
                <a
                  href={`https://leetcode.com/${leetcodeUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-yellow-400 hover:border-yellow-500/50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Enter your LeetCode username to pull live stats & the submission heatmap.
            </p>
          </section>

          {/* Fitness section */}
          <section>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="text-orange-400">🔥</span> Health & Fitness
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <label className="block text-xs text-slate-400 mb-1.5 font-medium flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  Daily Calorie Target (kcal)
                </label>
                <input
                  type="number"
                  min={500}
                  max={5000}
                  value={calorieTarget}
                  onChange={(e) => setCalorieTarget(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Weight (kg)</label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="70"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Height (cm)</label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="175"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              {weightKg && heightCm && (
                <div className="flex flex-col justify-end">
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">BMI</label>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-cyan-400">
                    {(Number(weightKg) / Math.pow(Number(heightCm) / 100, 2)).toFixed(1)}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={save}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:bg-slate-700 text-slate-900 font-bold py-3 rounded-xl transition-all text-sm"
          >
            {saved ? (
              <><CheckCircle2 className="w-4 h-4" /> Saved!</>
            ) : saving ? (
              <><div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4" /> Save Settings</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
