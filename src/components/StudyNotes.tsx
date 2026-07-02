import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { StudyNote } from '../types';
import { StickyNote, Plus, X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

type NoteColor = StudyNote['color'];

const COLOR_STYLES: Record<NoteColor, string> = {
  yellow:  'bg-yellow-500/10 border-yellow-500/30 text-yellow-100',
  cyan:    'bg-cyan-500/10 border-cyan-500/30 text-cyan-100',
  emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100',
  purple:  'bg-purple-500/10 border-purple-500/30 text-purple-100',
};

const COLOR_DOTS: Record<NoteColor, string> = {
  yellow:  'bg-yellow-400',
  cyan:    'bg-cyan-400',
  emerald: 'bg-emerald-400',
  purple:  'bg-purple-400',
};

export const StudyNotes: React.FC = () => {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newColor, setNewColor] = useState<NoteColor>('yellow');

  useEffect(() => {
    const q = query(collection(db, 'studyNotes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as StudyNote)));
    });
    return () => unsubscribe();
  }, []);

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    await addDoc(collection(db, 'studyNotes'), {
      content: newNote.trim(),
      color: newColor,
      createdAt: new Date().toISOString(),
    });
    setNewNote('');
  };

  const deleteNote = async (id: string) => {
    await deleteDoc(doc(db, 'studyNotes', id));
  };

  return (
    <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm">
      <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2 mb-4">
        <StickyNote className="w-5 h-5" /> Quick Notes
      </h2>

      {/* Add note */}
      <form onSubmit={addNote} className="flex flex-col gap-2 mb-5">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Jot down a formula, concept or reminder..."
          rows={2}
          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              addNote(e as any);
            }
          }}
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(Object.keys(COLOR_DOTS) as NoteColor[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={twMerge(
                  'w-5 h-5 rounded-full transition-all',
                  COLOR_DOTS[c],
                  newColor === c ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white/50 scale-125' : 'opacity-60 hover:opacity-100',
                )}
              />
            ))}
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 text-purple-400 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </form>

      {/* Notes grid */}
      <div className="columns-2 gap-3 space-y-3">
        {notes.length === 0 && (
          <p className="text-slate-500 text-sm text-center col-span-2 py-6">
            No notes yet. Press Ctrl+Enter to save quickly!
          </p>
        )}
        {notes.map((note) => (
          <div
            key={note.id}
            className={twMerge(
              'break-inside-avoid border rounded-xl p-3.5 relative group mb-3',
              COLOR_STYLES[note.color],
            )}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap pr-5">{note.content}</p>
            <button
              onClick={() => deleteNote(note.id)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-black/20 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <p className="text-[10px] opacity-50 mt-2">
              {new Date(note.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
