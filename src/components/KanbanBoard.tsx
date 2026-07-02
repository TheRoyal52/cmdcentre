import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { PlacementTask, TaskStatus, TaskCategory } from '../types';
import { GripVertical, Plus, Trash2, Kanban } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const COLUMNS: { id: TaskStatus; label: string; topColor: string; countColor: string }[] = [
  { id: 'TODO',        label: '📋 To Do',      topColor: 'border-slate-500',  countColor: 'bg-slate-700 text-slate-300' },
  { id: 'IN_PROGRESS', label: '⚡ In Progress', topColor: 'border-cyan-500',   countColor: 'bg-cyan-500/20 text-cyan-300' },
  { id: 'DONE',        label: '✅ Done',         topColor: 'border-emerald-500',countColor: 'bg-emerald-500/20 text-emerald-300' },
];

const CATEGORY_STYLES: Record<TaskCategory, string> = {
  JAVA_DSA: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  WEB_DEV:  'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  EE:       'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  JAVA_DSA: '☕ Java/DSA',
  WEB_DEV:  '🌐 Web Dev',
  EE:       '⚡ EE Core',
};

const DEFAULT_TASKS: { title: string; category: TaskCategory; status: TaskStatus }[] = [
  { title: 'Solve 50 LeetCode Arrays problems', category: 'JAVA_DSA', status: 'TODO' },
  { title: 'Learn HashMap & HashSet patterns', category: 'JAVA_DSA', status: 'TODO' },
  { title: 'Build a PERN Stack CRUD app',       category: 'WEB_DEV',  status: 'TODO' },
  { title: 'Master React hooks (useMemo, useCallback)', category: 'WEB_DEV', status: 'TODO' },
  { title: 'Revise Synchronous Machines for viva', category: 'EE',    status: 'TODO' },
  { title: 'Practice DP: Longest Common Subsequence', category: 'JAVA_DSA', status: 'IN_PROGRESS' },
];

export const KanbanBoard: React.FC = () => {
  const [tasks, setTasks] = useState<PlacementTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('JAVA_DSA');
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [showSeed, setShowSeed] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PlacementTask));
      // Sort by creation time if available
      data.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      setTasks(data);
    });
    return () => unsubscribe();
  }, []);

  // Show seed button only when there are no tasks
  useEffect(() => { setShowSeed(tasks.length === 0); }, [tasks]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await addDoc(collection(db, 'tasks'), {
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      status: 'TODO',
      createdAt: new Date().toISOString(),
    });
    setNewTaskTitle('');
  };

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    await updateDoc(doc(db, 'tasks', id), { status });
  };

  const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, 'tasks', id));
  };

  const seedDefaults = async () => {
    for (const t of DEFAULT_TASKS) {
      await addDoc(collection(db, 'tasks'), { ...t, createdAt: new Date().toISOString() });
    }
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('taskId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  };

  const onDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('taskId');
    if (id) updateTaskStatus(id, status);
    setDragOverCol(null);
  };

  const doneCount = tasks.filter((t) => t.status === 'DONE').length;
  const totalCount = tasks.length;

  return (
    <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm h-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
          <Kanban className="w-6 h-6" /> Placement Roadmap
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400 font-medium">
            <span className="text-emerald-400 font-bold">{doneCount}</span>/{totalCount} done
          </span>
          {showSeed && (
            <button
              onClick={seedDefaults}
              className="text-xs bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              Seed Sample Tasks
            </button>
          )}
        </div>
      </div>

      {/* Add task form */}
      <form onSubmit={addTask} className="flex gap-2 shrink-0">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add a new task..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
        />
        <select
          value={newTaskCategory}
          onChange={(e) => setNewTaskCategory(e.target.value as TaskCategory)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
        >
          <option value="JAVA_DSA">Java/DSA</option>
          <option value="WEB_DEV">Web Dev</option>
          <option value="EE">EE Core</option>
        </select>
        <button
          type="submit"
          className="bg-cyan-500 hover:bg-cyan-600 active:scale-95 text-slate-900 font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-1 text-sm"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="shrink-0">
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-700 rounded-full"
              style={{ width: `${(doneCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden min-h-[300px]">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              onDragOver={(e) => onDragOver(e, col.id)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => onDrop(e, col.id)}
              className={twMerge(
                'flex flex-col rounded-xl border-t-4 bg-slate-900/60 p-3 transition-all',
                col.topColor,
                dragOverCol === col.id && 'ring-2 ring-cyan-500/40 bg-cyan-500/5',
              )}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-bold text-slate-200">{col.label}</h3>
                <span className={twMerge('text-xs font-bold px-2 py-0.5 rounded-full', col.countColor)}>
                  {colTasks.length}
                </span>
              </div>

              {/* Task cards */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, task.id)}
                    className="bg-slate-800 p-3.5 rounded-lg border border-slate-700 shadow-md cursor-grab active:cursor-grabbing hover:border-slate-500 hover:shadow-lg transition-all group select-none"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm text-slate-200 font-medium leading-snug">{task.title}</p>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span
                        className={twMerge(
                          'text-[11px] px-2 py-0.5 rounded-md border font-semibold',
                          CATEGORY_STYLES[task.category],
                        )}
                      >
                        {CATEGORY_LABELS[task.category]}
                      </span>
                      <GripVertical className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-700/50 rounded-lg text-slate-600 text-xs">
                    Drop tasks here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
