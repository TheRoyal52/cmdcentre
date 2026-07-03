import React, { useState, useEffect, useRef, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { X, Settings, Save, CheckCircle2, ExternalLink, User, Flame, Target, Zap } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [calorieTarget, setCalorieTarget]       = useState(2000);
  const [weightKg,      setWeightKg]            = useState<string>('');
  const [heightCm,      setHeightCm]            = useState<string>('');
  const [weeklyGoal,    setWeeklyGoal]           = useState(150);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [lcError, setLcError] = useState('');
  const firstFocusRef = useRef<HTMLInputElement>(null);
  const panelRef      = useRef<HTMLDivElement>(null);

  // Load from Firestore
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
        setWeeklyGoal(d.weeklyMinGoal ?? 150);
      }
    });
    // Focus first input when modal opens
    setTimeout(() => firstFocusRef.current?.focus(), 80);
  }, [isOpen]);

  // Escape key close + focus trap
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      // Focus trap
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, input, a, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Validate LeetCode username
  const validateLc = (val: string) => {
    if (!val) { setLcError(''); return true; }
    const valid = /^[a-zA-Z0-9_-]+$/.test(val);
    setLcError(valid ? '' : 'LeetCode usernames can only contain letters, numbers, underscores, and dashes.');
    return valid;
  };

  const save = async () => {
    if (!validateLc(leetcodeUsername)) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setSaving(true);
    await setDoc(
      doc(db, 'userProfile', uid),
      {
        leetcodeUsername: leetcodeUsername.trim().toLowerCase(),
        calorieTarget: Number(calorieTarget) || 2000,
        weeklyMinGoal: Number(weeklyGoal) || 150,
        ...(weightKg ? { weightKg: Number(weightKg) } : {}),
        ...(heightCm ? { heightCm: Number(heightCm) } : {}),
      },
      { merge: true },
    );
    setSaving(false);
    setSaved(true);
    toast.success('Settings saved.');
    setTimeout(() => { setSaved(false); onClose(); }, 900);
  };

  if (!isOpen) return null;

  const bmi = weightKg && heightCm
    ? (Number(weightKg) / Math.pow(Number(heightCm) / 100, 2)).toFixed(1)
    : null;

  const bmiCategory = bmi
    ? Number(bmi) < 18.5 ? 'Underweight'
    : Number(bmi) < 25 ? 'Normal'
    : Number(bmi) < 30 ? 'Overweight'
    : 'Obese'
    : null;

  const bmiColor = bmi
    ? Number(bmi) < 18.5 ? '#38BDF8'
    : Number(bmi) < 25  ? '#10B981'
    : Number(bmi) < 30  ? '#F59E0B'
    : '#EF4444'
    : '#475569';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Settings">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-md bg-[#111118] border border-[#2D2D42] rounded-xl shadow-overlay overflow-hidden panel-enter"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E2E]">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#6366F1]/12 border border-[#6366F1]/25 rounded-md">
              <Settings className="w-4 h-4 text-[#6366F1]" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="font-semibold text-[#F1F5F9] text-[15px]">Settings</h2>
              <p className="text-[11px] text-[#475569]">Personalize your Command Center</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#1E1E2E] text-[#475569] hover:text-[#F1F5F9] transition-colors"
            aria-label="Close settings (Escape)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* ── LeetCode ───────────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3.5 h-3.5 text-[#FCD34D]" strokeWidth={1.75} />
              <p className="section-label">LeetCode</p>
            </div>
            <label className="block text-[12px] text-[#475569] mb-1.5" htmlFor="lc-username">Username</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#475569]" />
                <input
                  ref={firstFocusRef}
                  id="lc-username"
                  type="text"
                  value={leetcodeUsername}
                  onChange={e => { setLeetcodeUsername(e.target.value); validateLc(e.target.value); }}
                  placeholder="your-leetcode-username"
                  className={twMerge('input-base pl-9', lcError ? 'border-red-500/50 focus:border-red-500' : '')}
                  pattern="[a-zA-Z0-9_\-]+"
                />
              </div>
              {leetcodeUsername && !lcError && (
                <a
                  href={`https://leetcode.com/${leetcodeUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-[#1E1E2E] border border-[#2D2D42] rounded-md text-[#475569] hover:text-[#FCD34D] hover:border-[#FCD34D]/30 transition-colors"
                  aria-label="Open LeetCode profile"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            {lcError && <p className="text-[11px] text-red-400 mt-1.5">{lcError}</p>}
            {!lcError && <p className="text-[11px] text-[#334155] mt-1.5">Enter your username to pull live stats and submission heatmap.</p>}
          </section>

          <div className="border-t border-[#1E1E2E]" />

          {/* ── Fitness ─────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-3.5 h-3.5 text-[#F97316]" strokeWidth={1.75} />
              <p className="section-label">Health & Fitness</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] text-[#475569] mb-1.5" htmlFor="cal-target">
                  Daily Calorie Target (kcal)
                </label>
                <input
                  id="cal-target"
                  type="number"
                  min={500}
                  max={5000}
                  value={calorieTarget}
                  onChange={e => setCalorieTarget(Number(e.target.value))}
                  className="input-base"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#475569] mb-1.5" htmlFor="weekly-goal">
                  Weekly Exercise Goal (min) — WHO recommends 150
                </label>
                <input
                  id="weekly-goal"
                  type="number"
                  min={30}
                  max={1000}
                  value={weeklyGoal}
                  onChange={e => setWeeklyGoal(Number(e.target.value))}
                  className="input-base"
                />
                <div className="flex gap-2 mt-2">
                  {[75, 150, 300].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setWeeklyGoal(v)}
                      className={twMerge(
                        'flex-1 py-1 text-[11px] font-mono rounded-md border transition-all',
                        weeklyGoal === v
                          ? 'bg-[#6366F1]/12 border-[#6366F1]/30 text-[#818CF8]'
                          : 'bg-[#0D0D12] border-[#1E1E2E] text-[#475569] hover:border-[#2D2D42]',
                      )}
                    >
                      {v} min{v === 150 ? ' (WHO)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] text-[#475569] mb-1.5" htmlFor="weight">Weight (kg)</label>
                  <input
                    id="weight"
                    type="number"
                    value={weightKg}
                    onChange={e => setWeightKg(e.target.value)}
                    placeholder="70"
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[#475569] mb-1.5" htmlFor="height">Height (cm)</label>
                  <input
                    id="height"
                    type="number"
                    value={heightCm}
                    onChange={e => setHeightCm(e.target.value)}
                    placeholder="175"
                    className="input-base"
                  />
                </div>
              </div>

              {bmi && (
                <div className="flex items-center gap-3 p-3 bg-[#0D0D12] border border-[#1E1E2E] rounded-md">
                  <div className="text-center">
                    <p className="text-[20px] font-bold font-mono" style={{ color: bmiColor }}>{bmi}</p>
                    <p className="text-[10px] text-[#475569]">BMI</p>
                  </div>
                  <div className="w-px h-10 bg-[#1E1E2E]" />
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: bmiColor }}>{bmiCategory}</p>
                    <p className="text-[11px] text-[#475569]">
                      {Number(bmi) < 18.5 ? 'Consider increasing caloric intake'
                        : Number(bmi) < 25 ? 'Healthy range — keep it up!'
                        : Number(bmi) < 30 ? 'Consider moderate exercise increase'
                        : 'Consult a healthcare professional'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 border-t border-[#1E1E2E]">
          <button
            onClick={save}
            disabled={saving || !!lcError}
            className="w-full flex items-center justify-center gap-2 bg-[#6366F1] hover:bg-[#818CF8] active:scale-95 disabled:bg-[#1E1E2E] disabled:text-[#334155] text-white font-bold py-2.5 rounded-md transition-all text-sm"
          >
            {saved ? (
              <><CheckCircle2 className="w-4 h-4" /> Saved!</>
            ) : saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4" /> Save Settings</>
            )}
          </button>
          <p className="text-center text-[10px] text-[#334155] font-mono mt-2">Esc to close</p>
        </div>
      </div>
    </div>
  );
};
