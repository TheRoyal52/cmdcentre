import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { PlacementTask, TaskStatus, TaskCategory } from '../types';
import { GripVertical, Plus, Trash2, LayoutList, Zap, CheckCircle, ClipboardList } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

/* ─── Column config — NO emoji ────────────────────────────────────────────── */
const COLUMNS: {
  id: TaskStatus;
  label: string;
  dotColor: string;
  accentBorder: string;
  dropBg: string;
}[] = [
  { id: 'TODO',        label: 'To Do',       dotColor: '#475569', accentBorder: '#2D2D42', dropBg: 'rgba(71,85,105,0.06)'   },
  { id: 'IN_PROGRESS', label: 'In Progress', dotColor: '#6366F1', accentBorder: '#6366F1', dropBg: 'rgba(99,102,241,0.06)'  },
  { id: 'DONE',        label: 'Done',        dotColor: '#10B981', accentBorder: '#10B981', dropBg: 'rgba(16,185,129,0.06)'  },
];

/* ─── Category config — NO emoji ─────────────────────────────────────────── */
const CATEGORY_CONFIG: Record<TaskCategory, { label: string; style: string }> = {
  JAVA_DSA: { label: 'Java / DSA', style: 'bg-[#F9731615] text-[#FB923C] border-[#F9731625]' },
  WEB_DEV:  { label: 'Web Dev',    style: 'bg-[#6366F115] text-[#818CF8] border-[#6366F125]' },
  EE:       { label: 'EE Core',    style: 'bg-[#A78BFA15] text-[#A78BFA] border-[#A78BFA25]' },
};

const DEFAULT_TASKS: { title: string; category: TaskCategory; status: TaskStatus }[] = [
  { title: 'Solve 50 LeetCode Arrays problems',      category: 'JAVA_DSA', status: 'TODO'        },
  { title: 'Learn HashMap & HashSet patterns',        category: 'JAVA_DSA', status: 'TODO'        },
  { title: 'Build a PERN Stack CRUD app',             category: 'WEB_DEV',  status: 'TODO'        },
  { title: 'Master React hooks (useMemo, callback)',  category: 'WEB_DEV',  status: 'TODO'        },
  { title: 'Revise Synchronous Machines for viva',    category: 'EE',       status: 'TODO'        },
  { title: 'Practice DP: Longest Common Subsequence', category: 'JAVA_DSA', status: 'IN_PROGRESS' },
];

export const KanbanBoard: React.FC = () => {
  const [tasks,           setTasks]           = useState<PlacementTask[]>([]);
  const [newTaskTitle,    setNewTaskTitle]    = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('JAVA_DSA');
  const [dragOverCol,     setDragOverCol]     = useState<TaskStatus | null>(null);
  const [showSeed,        setShowSeed]        = useState(false);
  const [draggingId,      setDraggingId]      = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'tasks'), snapshot => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PlacementTask));
      data.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      setTasks(data);
    });
  }, []);

  useEffect(() => { setShowSeed(tasks.length === 0); }, [tasks]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    await addDoc(collection(db, 'tasks'), { title, category: newTaskCategory, status: 'TODO', createdAt: new Date().toISOString() });
    setNewTaskTitle('');
    toast.success('Task added.');
  };

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    await updateDoc(doc(db, 'tasks', id), { status });
  };

  const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, 'tasks', id));
    toast.success('Task deleted.');
  };

  const seedDefaults = async () => {
    for (const t of DEFAULT_TASKS) {
      await addDoc(collection(db, 'tasks'), { ...t, createdAt: new Date().toISOString() });
    }
    toast.success('Sample tasks seeded.');
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('taskId', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(id);
  };

  const onDragEnd = () => setDraggingId(null);

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
    setDraggingId(null);
  };

  const doneCount  = tasks.filter(t => t.status === 'DONE').length;
  const totalCount = tasks.length;
  const progress   = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  return (
    <div className="h-full flex flex-col gap-4 bg-[#111118] border border-[#1E1E2E] rounded-lg p-5 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <LayoutList className="w-4 h-4 text-[#6366F1]" strokeWidth={1.75} />
          <h2 className="text-[15px] font-semibold text-[#F1F5F9]">Placement Roadmap</h2>
          {totalCount > 0 && (
            <span className="text-[11px] font-mono text-[#475569] bg-[#1F1F2A] border border-[#1E1E2E] px-1.5 py-0.5 rounded-md ml-1">
              {doneCount}/{totalCount}
            </span>
          )}
        </div>
        {showSeed && (
          <button
            onClick={seedDefaults}
            className="text-[12px] text-[#475569] hover:text-[#94A3B8] border border-[#1E1E2E] hover:border-[#2D2D42] bg-[#111118] px-2.5 py-1 rounded-md transition-all"
          >
            Seed sample tasks
          </button>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="shrink-0">
          <div className="h-[3px] bg-[#1E1E2E] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #6366F1, #10B981)' }}
            />
          </div>
          <p className="text-[10px] text-[#334155] font-mono mt-1">{progress.toFixed(0)}% complete</p>
        </div>
      )}

      {/* Add task form */}
      <form onSubmit={addTask} className="flex gap-2 shrink-0">
        <input
          type="text"
          value={newTaskTitle}
          onChange={e => setNewTaskTitle(e.target.value)}
          placeholder="Add a new task..."
          className="input-base flex-1 text-sm"
          aria-label="New task title"
        />
        <select
          value={newTaskCategory}
          onChange={e => setNewTaskCategory(e.target.value as TaskCategory)}
          className="input-base text-sm cursor-pointer"
          style={{ width: 'auto', padding: '7px 8px' }}
          aria-label="Task category"
        >
          <option value="JAVA_DSA">Java/DSA</option>
          <option value="WEB_DEV">Web Dev</option>
          <option value="EE">EE Core</option>
        </select>
        <button
          type="submit"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6366F1] hover:bg-[#818CF8] active:scale-95 text-white text-sm font-semibold rounded-md transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </form>

      {/* Kanban columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 overflow-hidden min-h-[200px]">
        {COLUMNS.map(col => {
          const colTasks    = tasks.filter(t => t.status === col.id);
          const isDropTarget = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={e => onDragOver(e, col.id)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={e => onDrop(e, col.id)}
              className="flex flex-col rounded-lg border transition-all duration-150 overflow-hidden"
              style={{
                borderColor: isDropTarget ? col.accentBorder : '#1E1E2E',
                background:  isDropTarget ? col.dropBg : '#0D0D12',
                boxShadow:   isDropTarget ? `inset 0 0 0 1px ${col.accentBorder}30` : 'none',
              }}
            >
              {/* Column header */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0"
                style={{ borderColor: '#1E1E2E' }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.dotColor }} />
                <span className="text-[12px] font-semibold text-[#94A3B8] uppercase tracking-wide flex-1">
                  {col.label}
                </span>
                <span
                  className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm"
                  style={{ color: col.dotColor, background: `${col.dotColor}15`, border: `1px solid ${col.dotColor}25` }}
                >
                  {colTasks.length}
                </span>
              </div>

              {/* Task list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={e => onDragStart(e, task.id)}
                    onDragEnd={onDragEnd}
                    className={twMerge(
                      'group bg-[#111118] border border-[#1E1E2E] rounded-md p-3',
                      'cursor-grab active:cursor-grabbing select-none',
                      'hover:border-[#2D2D42] hover:shadow-raised',
                      'transition-all duration-150',
                      draggingId === task.id && 'opacity-40 scale-95',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* Grip — visible only on hover */}
                      <GripVertical
                        className="w-3.5 h-3.5 text-[#334155] shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                      <p className="text-[13px] text-[#94A3B8] group-hover:text-[#F1F5F9] font-medium leading-snug flex-1 transition-colors">
                        {task.title}
                      </p>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-red-500/10 text-[#334155] hover:text-red-400 transition-all"
                        aria-label="Delete task"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="mt-2.5 ml-5">
                      <span className={twMerge(
                        'text-[10px] px-1.5 py-0.5 rounded-sm border font-semibold font-mono',
                        CATEGORY_CONFIG[task.category].style,
                      )}>
                        {CATEGORY_CONFIG[task.category].label}
                      </span>
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div className="h-20 flex items-center justify-center border border-dashed border-[#1E1E2E] rounded-md">
                    <p className="text-[11px] text-[#334155]">Drop tasks here</p>
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
