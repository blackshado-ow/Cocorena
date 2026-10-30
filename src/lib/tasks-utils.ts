/*
 * Task list logic. Pure functions so the UI stays thin and tests stay easy.
 */
import type { Priority, Task } from "@/lib/types";
import { todayKey } from "@/lib/dates";

export const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function isOverdue(task: Task, tz?: string | null): boolean {
  return !task.completed && !!task.dueDate && task.dueDate < todayKey(tz);
}

export type TaskFilter = "all" | "active" | "completed" | "overdue";

export function filterTasks(
  tasks: Task[],
  filter: TaskFilter,
  tz?: string | null,
): Task[] {
  switch (filter) {
    case "active":
      return tasks.filter((t) => !t.completed);
    case "completed":
      return tasks.filter((t) => t.completed);
    case "overdue":
      return tasks.filter((t) => isOverdue(t, tz));
    default:
      return tasks;
  }
}

export type TaskSort = "priority" | "due" | "created" | "completed";

export function sortTasks(tasks: Task[], sort: TaskSort = "priority"): Task[] {
  const copy = [...tasks];
  copy.sort((a, b) => {
    switch (sort) {
      case "priority":
        // Uncompleted first, then priority, then due date.
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        return pd !== 0 ? pd : compareDue(a, b);
      case "due":
        return compareDue(a, b) || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      case "created":
        return b.createdAt - a.createdAt;
      case "completed":
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (b.completedAt ?? 0) - (a.completedAt ?? 0);
    }
  });
  return copy;
}

function compareDue(a: Task, b: Task): number {
  // Undated sinks to the end.
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate.localeCompare(b.dueDate);
}

export interface TaskValidation {
  ok: boolean;
  error?: string;
}

export function validateTaskInput(input: { title: string; dueDate?: string; notes?: string }): TaskValidation {
  const title = input.title.trim();
  if (title.length === 0) return { ok: false, error: "Give the task a name." };
  if (title.length > 120) return { ok: false, error: "Keep task names under 120 characters." };
  if ((input.notes ?? "").length > 500) return { ok: false, error: "Keep notes under 500 characters." };
  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
    return { ok: false, error: "Due date must be a valid day." };
  }
  return { ok: true };
}

/** Tasks to surface on the dashboard: uncompleted, High→Low, due soonest first. */
export function topPriorityTasks(tasks: Task[], limit = 4): Task[] {
  return sortTasks(filterTasks(tasks, "active")).slice(0, limit);
}
