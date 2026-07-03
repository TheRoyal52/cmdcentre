import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { StudyNote } from '../types';
import { StickyNote, Plus, X, Search, Edit3, Clock } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

type NoteColor = StudyNote['color'];

const COLOR_STYLES: Record<NoteColor, { card: string; dot: string; ring: string }> = {
  yellow:  { card: 'bg-[#FCD34D]/6 border-[#FCD34D]/20',  dot: 'bg-[#FCD34D]',  ring: 'ring-[#FCD34D]/40' },
  cyan:    { card: 'bg-[#38BDF8]/6 border-[#38BDF8]/20',  dot: 'bg-[#38BDF8]',  ring: 'ring-[#38BDF8]/40' },
  emerald: { card: 'bg-[#10B981]/6 border-[#10B981]/20',  dot: 'bg-[#10B981]',  ring: 'ring-[#10B981]/40' },
  purple:  { card: 'bg-[#A78BFA]/6 border-[#A78BFA]/20',  dot: 'bg-[#A78BFA]',  ring: 'ring-[#A78BFA]/40' },
};

const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const wordCount = (text: string) => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  return { words, chars };
};

export const StudyNotes: React.FC = () => {
  const [notes,    setNotes]    = useState<StudyNote[]>([]);
  const [newNote,  setNewNote]  = useState('');
  const [newColor, setNewColor] = useState<NoteColor>('yellow');
  const [search,   setSearch]   = useState('');
  const [editing,  setEditing]  = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'studyNotes'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudyNote)));
    });
  }, []);

  // Global keyboard shortcut: Ctrl+N to focus textarea
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !editing) {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [editing]);

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    await addDoc(collection(db, 'studyNotes'), {
      content: newNote.trim(),
      color: newColor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setNewNote('');
    toast.success('Note saved.');
  };

  const deleteNote = async (id: string) => {
    await deleteDoc(doc(db, 'studyNotes', id));
    toast.success('Note deleted.');
  };

  const saveEdit = async () => {
    if (!editing || !editText.trim()) return;
    await updateDoc(doc(db, 'studyNotes', editing), {
      content: editText.trim(),
      updatedAt: new Date().toISOString(),
    });
    setEditing(null);
    setEditText('');
    toast.success('Note updated.');
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter(n => n.content.toLowerCase().includes(q));
  }, [notes, search]);

  const { words: inputWords } = wordCount(newNote);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <StickyNote className="w-4 h-4 text-[#A78BFA]" strokeWidth={1.75} />
        <h2 className="text-[15px] font-semibold text-[#F1F5F9]">Quick Notes</h2>
        <span className="ml-auto text-[11px] font-mono text-[#334155]">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
      </div>

      {/* New note form */}
      <form onSubmit={addNote} className="p-4 bg-[#111118] border border-[#1E1E2E] rounded-lg space-y-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Jot down a formula, concept, or reminder… (Ctrl+N to focus)"
            rows={2}
            className="w-full bg-[#0D0D12] border border-[#1E1E2E] focus:border-[#6366F1] rounded-md px-3 py-2.5 text-sm text-[#F1F5F9] placeholder-[#334155] focus:outline-none transition-colors resize-none leading-relaxed"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                addNote(e as any);
              }
            }}
          />
          {newNote.trim() && (
            <p className="absolute bottom-2 right-2 text-[10px] font-mono text-[#334155]">
              {inputWords}w · {newNote.length}c
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          {/* Color picker */}
          <div className="flex items-center gap-2">
            {(Object.keys(COLOR_STYLES) as NoteColor[]).map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                aria-label={`Color: ${c}`}
                className={twMerge(
                  'w-5 h-5 rounded-full transition-all',
                  COLOR_STYLES[c].dot,
                  newColor === c ? `ring-2 ring-offset-2 ring-offset-[#111118] scale-125 ${COLOR_STYLES[c].ring}` : 'opacity-50 hover:opacity-90',
                )}
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={!newNote.trim()}
            className="flex items-center gap-1.5 bg-[#6366F1] hover:bg-[#818CF8] active:scale-95 disabled:bg-[#1E1E2E] disabled:text-[#334155] text-white px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add · Ctrl+↵
          </button>
        </div>
      </form>

      {/* Search bar */}
      {notes.length > 2 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#334155]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="w-full input-base pl-9 py-2"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#334155] hover:text-[#94A3B8]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Notes masonry grid */}
      {filtered.length === 0 && (
        <div className="text-center py-10">
          <p className="text-[#334155] text-sm">
            {search ? `No notes matching "${search}"` : 'No notes yet. Press Ctrl+N to start.'}
          </p>
        </div>
      )}

      <div className="columns-2 gap-3 space-y-3">
        {filtered.map(note => {
          const style = COLOR_STYLES[note.color];
          const { words, chars } = wordCount(note.content);
          const isBeingEdited = editing === note.id;

          return (
            <div
              key={note.id}
              className={twMerge(
                'break-inside-avoid border rounded-lg p-3.5 relative group mb-3 transition-all',
                style.card,
                isBeingEdited && 'border-[#6366F1]/40',
              )}
            >
              {isBeingEdited ? (
                /* ── Edit mode ── */
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-sm text-[#F1F5F9] resize-none leading-relaxed"
                    rows={4}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveEdit(); }
                      if (e.key === 'Escape') { setEditing(null); setEditText(''); }
                    }}
                  />
                  <div className="flex gap-1.5 justify-end">
                    <button
                      onClick={() => { setEditing(null); setEditText(''); }}
                      className="text-[10px] font-mono text-[#475569] hover:text-[#94A3B8] px-2 py-1 rounded-md border border-[#1E1E2E]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      className="text-[10px] font-mono text-[#10B981] hover:bg-[#10B981]/10 px-2 py-1 rounded-md border border-[#10B981]/30"
                    >
                      Save · Ctrl+↵
                    </button>
                  </div>
                </div>
              ) : (
                /* ── View mode ── */
                <>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#E2E8F0] pr-8">{note.content}</p>
                  <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-white/5">
                    <Clock className="w-3 h-3 text-[#334155]" />
                    <p className="text-[10px] font-mono text-[#334155] flex-1">
                      {relativeTime(note.updatedAt ?? note.createdAt)}
                    </p>
                    <p className="text-[10px] font-mono text-[#334155]">{words}w</p>
                  </div>
                  {/* Action buttons — appear on hover */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditing(note.id); setEditText(note.content); }}
                      className="p-1 rounded-md bg-[#1E1E2E]/80 hover:bg-[#2D2D42] text-[#475569] hover:text-[#94A3B8] transition-colors"
                      aria-label="Edit note"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="p-1 rounded-md bg-[#1E1E2E]/80 hover:bg-red-500/20 text-[#475569] hover:text-red-400 transition-colors"
                      aria-label="Delete note"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {notes.length > 0 && (
        <p className="text-[10px] font-mono text-[#334155] text-center">
          Ctrl+N new · Ctrl+↵ save · Esc cancel edit
        </p>
      )}
    </div>
  );
};
