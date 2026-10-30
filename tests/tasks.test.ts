import { describe, expect, it } from "vitest";
import { filterTasks, isOverdue, sortTasks, topPriorityTasks, validateTaskInput } from "@/lib/tasks-utils";
import { addDaysKey, todayKey } from "@/lib/dates";
import type { Task } from "@/lib/types";

function task(over: Partial<Task>): Task {
  return {
    id: "t1",
    title: "Task",
    priority: "medium",
    completed: false,
    createdAt: 1,
    ...over,
  } as Task;
}

describe("task utils", () => {
  const today = todayKey("UTC");

  it("sorts uncompleted first, then High→Low, then due dates", () => {
    const list: Task[] = [
      task({ id: "done-low", priority: "low", completed: true }),
      task({ id: "d1", priority: "medium", dueDate: addDaysKey(today, 2) }),
      task({ id: "h1", priority: "high" }),
      task({ id: "h2", priority: "high", dueDate: addDaysKey(today, 1) }),
      task({ id: "l1", priority: "low" }),
    ];
    expect(sortTasks(list).map((t) => t.id)).toEqual(["h2", "h1", "d1", "l1", "done-low"]);
  });

  it("overdue detection uses due date vs local today", () => {
    expect(isOverdue(task({ dueDate: addDaysKey(today, -1) }), "UTC")).toBe(true);
    expect(isOverdue(task({ dueDate: today }), "UTC")).toBe(false);
    expect(isOverdue(task({ dueDate: addDaysKey(today, -1), completed: true }), "UTC")).toBe(false);
    expect(isOverdue(task({}), "UTC")).toBe(false);
  });

  it("filters active / completed / overdue / all", () => {
    const list: Task[] = [
      task({ id: "a" }),
      task({ id: "b", completed: true }),
      task({ id: "c", dueDate: addDaysKey(today, -3) }),
      task({ id: "d", completed: true, dueDate: addDaysKey(today, -3) }),
    ];
    expect(filterTasks(list, "active", "UTC").map((t) => t.id)).toEqual(["a", "c"]);
    expect(filterTasks(list, "completed", "UTC").map((t) => t.id)).toEqual(["b", "d"]);
    expect(filterTasks(list, "overdue", "UTC").map((t) => t.id)).toEqual(["c"]);
    expect(filterTasks(list, "all", "UTC")).toHaveLength(4);
  });

  it("topPriorityTasks returns active, high-first, limited", () => {
    const list: Task[] = [
      task({ id: "h", priority: "high" }),
      task({ id: "m" }),
      task({ id: "done", completed: true }),
      task({ id: "l", priority: "low" }),
    ];
    expect(topPriorityTasks(list, 2).map((t) => t.id)).toEqual(["h", "m"]);
  });

  it("validates task input", () => {
    expect(validateTaskInput({ title: "" }).ok).toBe(false);
    expect(validateTaskInput({ title: "x".repeat(121) }).ok).toBe(false);
    expect(validateTaskInput({ title: "Study", notes: "y".repeat(501) }).ok).toBe(false);
    expect(validateTaskInput({ title: "Study", dueDate: "2026-06-01" }).ok).toBe(true);
    expect(validateTaskInput({ title: "Study", dueDate: "June" }).ok).toBe(false);
  });
});
