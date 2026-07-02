import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, LayoutDashboard, Shield, CalendarDays, Kanban, Code2, Bot, Sparkles, Dumbbell, Utensils, StickyNote, Settings, LogOut } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export type Tab = 'DASHBOARD' | 'BUNK' | 'KANBAN' | 'LEETCODE' | 'CHAT' | 'NOTES' | 'CALENDAR' | 'AI_PLAN' | 'FITNESS' | 'DIET';

interface Command {
  id: string;
  group: string;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
  action: () => void;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: Tab) => void;
  onSettings: () => void;
  onLogout: () => void;
}

export const CommandPalette: React.FC<Props> = ({ isOpen, onClose, onNavigate, onSettings, onLogout }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const makeNavCmd = (id: Tab, label: string, icon: React.ElementType, shortcut?: string): Command => ({
    id, group: 'Navigate', label, icon, shortcut,
    action: () => { onNavigate(id); onClose(); },
  });

  const ALL_COMMANDS: Command[] = [
    makeNavCmd('DASHBOARD', 'Dashboard — Overview',   LayoutDashboard, 'G D'),
    makeNavCmd('BUNK',      'Attendance — Bunk Mgr',  Shield,          'G B'),
    makeNavCmd('CALENDAR',  'Attendance Calendar',    CalendarDays,    'G C'),
    makeNavCmd('KANBAN',    'Task Board — Kanban',    Kanban,          'G K'),
    makeNavCmd('LEETCODE',  'LeetCode Stats',         Code2,           'G L'),
    makeNavCmd('CHAT',      'AI Mentor — Gemini',     Bot,             'G A'),
    makeNavCmd('AI_PLAN',   'AI Study Plan',          Sparkles,        'G P'),
    makeNavCmd('FITNESS',   'Fitness Tracker',        Dumbbell,        'G F'),
    makeNavCmd('DIET',      'Diet Tracker',           Utensils,        'G T'),
    makeNavCmd('NOTES',     'Study Notes',            StickyNote,      'G N'),
    {
      id: 'settings', group: 'App', label: 'Open Settings', icon: Settings,
      action: () => { onSettings(); onClose(); },
    },
    {
      id: 'logout', group: 'App', label: 'Sign Out', icon: LogOut,
      action: () => { onLogout(); onClose(); },
    },
  ];

  const filtered = query.trim()
    ? ALL_COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : ALL_COMMANDS;

  // Group results
  const groups = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  const flatList = Object.values(groups).flat();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  useEffect(() => { setSelected(0); }, [query]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, flatList.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      flatList[selected]?.action();
    }
  }, [isOpen, flatList, selected, onClose]);

  // Global ⌘K / Ctrl+K listener (registered at App level via prop, but also handle Escape here)
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!isOpen) return null;

  let flatIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Palette */}
      <div
        className="relative w-full max-w-[520px] bg-[#18181F] border border-[#2D2D42] rounded-xl shadow-overlay overflow-hidden animate-panel-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1E1E2E]">
          <Search className="w-4 h-4 text-[#475569] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-[#F1F5F9] placeholder-[#334155] focus:outline-none"
          />
          <kbd className="hidden sm:flex text-[10px] font-mono text-[#475569] border border-[#1E1E2E] bg-[#0D0D12] px-1.5 py-0.5 rounded items-center gap-1">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="py-1.5 max-h-[360px] overflow-y-auto">
          {flatList.length === 0 ? (
            <p className="px-4 py-8 text-sm text-[#334155] text-center">
              No commands found for "{query}"
            </p>
          ) : (
            Object.entries(groups).map(([groupName, cmds]) => (
              <div key={groupName}>
                <p className="section-label px-4 py-2">{groupName}</p>
                {cmds.map(cmd => {
                  const idx = flatIdx++;
                  const isSelected = idx === selected;
                  return (
                    <button
                      key={cmd.id}
                      data-idx={idx}
                      onClick={() => cmd.action()}
                      onMouseEnter={() => setSelected(idx)}
                      className={twMerge(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors group',
                        isSelected ? 'bg-[#6366F1]/10' : 'hover:bg-[#1F1F2A]',
                      )}
                    >
                      <div className={twMerge(
                        'w-7 h-7 rounded-md flex items-center justify-center shrink-0 border',
                        isSelected
                          ? 'bg-[#6366F1]/15 border-[#6366F1]/30 text-[#818CF8]'
                          : 'bg-[#18181F] border-[#1E1E2E] text-[#475569]',
                      )}>
                        <cmd.icon className="w-3.5 h-3.5" />
                      </div>
                      <span className={twMerge(
                        'text-sm flex-1 font-medium',
                        isSelected ? 'text-[#F1F5F9]' : 'text-[#94A3B8]',
                      )}>
                        {cmd.label}
                      </span>
                      {cmd.shortcut && (
                        <div className="flex gap-1">
                          {cmd.shortcut.split(' ').map(k => (
                            <kbd key={k} className="text-[10px] font-mono text-[#475569] border border-[#1E1E2E] bg-[#0D0D12] px-1.5 py-0.5 rounded">
                              {k}
                            </kbd>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[#1E1E2E] bg-[#0D0D12]">
          <span className="text-[10px] text-[#334155] font-mono">↑↓ navigate</span>
          <span className="text-[10px] text-[#334155] font-mono">↵ select</span>
          <span className="text-[10px] text-[#334155] font-mono">esc close</span>
          <span className="ml-auto text-[10px] text-[#334155] font-mono">⌘K</span>
        </div>
      </div>
    </div>
  );
};
