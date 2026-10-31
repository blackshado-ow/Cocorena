"use client";

import { useMemo, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Check, ListChecks, Pencil, Plus, StickyNote, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  EmptyState,
  Field,
  Select,
  Spinner,
  TextInput,
} from "@/components/ui/primitives";
import { guestStore, useSettings, useTasks } from "@/lib/store";
import { mirrorDeleteTask, mirrorUpsertTask } from "@/lib/supabase/sync";
import { uid } from "@/lib/storage";
import { useMounted } from "@/hooks/use-mounted";
import { todayKey } from "@/lib/dates";
import { formatKeyShort } from "@/lib/dates";
import {
  filterTasks,
  isOverdue,
  PRIORITY_LABEL,
  sortTasks,
  validateTaskInput,
  type TaskFilter,
  type TaskSort,
} from "@/lib/tasks-utils";
import type { Priority, Task } from "@/lib/types";

const priorityIcon = { high: ArrowUpNarrowWide, medium: ArrowDownWideNarrow, low: ArrowDownWideNarrow } as const;
const priorityTone = { high: "terracotta", medium: "brown", low: "neutral" } as const;

function TaskRow({ task, onEdit, onDelete, today }: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  today: string;
}) {
  const Icon = priorityIcon[task.priority];
  const overdue = isOverdue(task, today);
  function toggleComplete() {
    const updated: Task = task.completed
      ? { ...task, completed: false, completedAt: undefined }
      : { ...task, completed: true, completedAt: Date.now() };
    guestStore.updateTask(task.id, updated);
    mirrorUpsertTask(updated);
  }
  return (
    <li className="flex items-start gap-3 rounded-md border border-line/80 bg-surface px-4 py-3 transition-colors hover:border-brown/40 hover:bg-brown-wash/40">
      <button
        role="checkbox"
        aria-checked={task.completed}
        aria-label={task.completed ? `Mark ${task.title} as incomplete` : `Mark ${task.title} as complete`}
        onClick={toggleComplete}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${
          task.completed ? "border-forest bg-forest text-cream" : "border-line bg-cream hover:border-forest"
        }`}
      >
        {task.completed ? <Check size={14} aria-hidden /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${task.completed ? "text-ink-soft line-through" : "text-forest"}`}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          <Badge tone={priorityTone[task.priority]}>
            <Icon size={11} aria-hidden /> {PRIORITY_LABEL[task.priority]} priority
          </Badge>
          {task.dueDate ? (
            <span className={overdue ? "font-medium text-miss" : ""}>
              Due {formatKeyShort(task.dueDate)}
              {overdue ? " · overdue" : ""}
            </span>
          ) : null}
          {task.notes ? (
            <span className="inline-flex items-center gap-1">
              <StickyNote size={11} aria-hidden /> has notes
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="sm" aria-label={`Edit ${task.title}`} onClick={onEdit}>
          <Pencil size={15} aria-hidden />
        </Button>
        <Button variant="ghost" size="sm" aria-label={`Delete ${task.title}`} onClick={onDelete}>
          <Trash2 size={15} aria-hidden />
        </Button>
      </div>
    </li>
  );
}

export function TaskPage() {
  const tasks = useTasks();
  const settings = useSettings();
  const mounted = useMounted();
  const [filter, setFilter] = useState<TaskFilter>("active");
  const [sort, setSort] = useState<TaskSort>("priority");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  const today = mounted ? todayKey(settings.timezone) : "";
  const visible = useMemo(() => sortTasks(filterTasks(tasks, filter, today), sort), [tasks, filter, sort, today]);
  const completedCount = tasks.filter((t) => t.completed).length;

  function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (adding) return; // double-click guard
    const validation = validateTaskInput({ title, dueDate: dueDate || undefined });
    if (!validation.ok) {
      setAddError(validation.error ?? "Something isn't right.");
      return;
    }
    setAdding(true);
    const task: Task = {
      id: uid(),
      title: title.trim(),
      priority,
      dueDate: dueDate || undefined,
      completed: false,
      createdAt: Date.now(),
    };
    guestStore.addTask(task);
    mirrorUpsertTask(task);
    setTitle("");
    setPriority("medium");
    setDueDate("");
    setAddError(null);
    setAdding(false);
  }

  function saveEdit(id: string, patch: Partial<Task>) {
    guestStore.updateTask(id, patch);
    const full = tasks.find((t) => t.id === id);
    if (full) mirrorUpsertTask({ ...full, ...patch });
    setEditTask(null);
  }

  function confirmDelete() {
    if (!deleteTask) return;
    guestStore.deleteTask(deleteTask.id);
    mirrorDeleteTask(deleteTask.id);
    setDeleteTask(null);
  }

  const emptyMessage: Record<TaskFilter, { title: string; hint: string }> = {
    all: { title: "No tasks yet", hint: "Add your first task above — start with something small you can do in one focus session." },
    active: { title: "Nothing on your list", hint: "Everything is done. Add a new task or enjoy the calm." },
    completed: { title: "Nothing completed yet", hint: "Completed tasks will collect here." },
    overdue: { title: "Nothing overdue", hint: "You're on top of every due date." },
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5 md:p-6">
        <form onSubmit={addTask} className="flex flex-col gap-4" aria-label="Add a task">
          <p className="eyebrow text-brown">New task</p>
          <div className="grid gap-3 md:grid-cols-[1fr_10rem_11rem_auto] md:items-end">
            <Field label="Task" htmlFor="task-title" error={addError ?? undefined}>
              <TextInput
                id="task-title"
                placeholder="e.g. Revise integration formulas"
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                aria-describedby={addError ? "task-title-error" : undefined}
              />
            </Field>
            <Field label="Priority" htmlFor="task-priority">
              <Select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </Field>
            <Field label="Due date (optional)" htmlFor="task-due">
              <TextInput id="task-due" type="date" value={dueDate} min="2000-01-01" onChange={(e) => setDueDate(e.target.value)} />
            </Field>
            <Button type="submit" loading={adding}>
              <Plus size={16} aria-hidden /> Add task
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Tasks"
          subtitle={`${completedCount} of ${tasks.length} completed`}
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <label className="sr-only" htmlFor="task-sort">
                Sort tasks
              </label>
              <Select id="task-sort" value={sort} onChange={(e) => setSort(e.target.value as TaskSort)} className="w-44">
                <option value="priority">Sort: priority</option>
                <option value="due">Sort: due date</option>
                <option value="created">Sort: recently added</option>
              </Select>
            </div>
          }
        />
        <div className="flex flex-wrap items-center gap-5 border-b border-line px-5">
          {(["active", "overdue", "completed", "all"] as TaskFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`-mb-px border-b-2 pb-2.5 pt-2.5 text-sm capitalize transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-forest ${
                filter === f
                  ? "border-forest font-medium text-forest"
                  : "border-transparent text-ink-soft hover:border-brown/45 hover:text-forest"
              }`}
            >
              {f}
              {f === "overdue" && mounted && filterTasks(tasks, f, today).length > 0
                ? ` (${filterTasks(tasks, f, today).length})`
                : null}
            </button>
          ))}
        </div>

        <div className="p-4">
          {mounted ? (
            visible.length === 0 ? (
              <EmptyState
                icon={<ListChecks size={28} />}
                title={emptyMessage[filter].title}
                hint={emptyMessage[filter].hint}
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {visible.map((t) => (
                  <TaskRow key={t.id} task={t} today={today} onEdit={() => setEditTask(t)} onDelete={() => setDeleteTask(t)} />
                ))}
              </ul>
            )
          ) : (
            <Spinner label="Opening tasks" />
          )}
        </div>
      </Card>

      <EditDialog key={editTask?.id ?? "closed"} task={editTask} onClose={() => setEditTask(null)} onSave={saveEdit} />
      <DeleteDialog task={deleteTask} onClose={() => setDeleteTask(null)} onConfirm={confirmDelete} />
    </div>
  );
}

function EditDialog({ task, onClose, onSave }: {
  task: Task | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Task>) => void;
}) {
  const [title, setTitle] = useState<Task["title"]>(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [error, setError] = useState<string | null>(null);

  if (!task) return <Dialog open={false} onClose={onClose} title="Edit task">{null}</Dialog>;

  return (
    <Dialog open onClose={onClose} title="Edit task">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const validation = validateTaskInput({ title, dueDate: dueDate || undefined, notes });
          if (!validation.ok) {
            setError(validation.error ?? "Invalid");
            return;
          }
          onSave(task.id, {
            title: title.trim(),
            notes: notes || undefined,
            priority,
            dueDate: dueDate || undefined,
          });
        }}
      >
        <Field label="Task name" htmlFor="edit-title" error={error ?? undefined}>
          <TextInput id="edit-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Notes (optional)" htmlFor="edit-notes">
          <textarea
            id="edit-notes"
            value={notes}
            maxLength={500}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-2 focus:outline-offset-1 focus:outline-forest/25"
            placeholder="Anything you want to remember about this task"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority" htmlFor="edit-priority">
            <Select id="edit-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </Field>
          <Field label="Due date" htmlFor="edit-due">
            <TextInput id="edit-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save changes</Button>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteDialog({ task, onClose, onConfirm }: {
  task: Task | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={task !== null}
      onClose={onClose}
      title="Delete this task?"
    >
      {task ? (
        <>
          <p className="text-sm text-ink-soft">
            <strong className="text-forest">{task.title}</strong> will be removed from your list. This can&apos;t be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirm}>
              <Trash2 size={15} aria-hidden /> Delete task
            </Button>
          </div>
        </>
      ) : null}
    </Dialog>
  );
}
