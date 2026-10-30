import type { FocusSession, Task } from "@/lib/types";

/*
 * Pure merge rules for importing guest data into an account.
 *
 * Goal: import everything safe, duplicate nothing.
 * - Local items whose id already exists in the cloud are SKIPPED.
 * - Cloud rows own the sync flag `cloudOwned` (set true when imported).
 */
export interface MergePlan<T> {
  toUpload: T[];
  skipped: number;
}

function mergeById<T extends { id: string }>(local: T[], remoteIds: Set<string>): MergePlan<T> {
  const toUpload: T[] = [];
  let skipped = 0;
  for (const item of local) {
    if (remoteIds.has(item.id)) {
      skipped += 1;
    } else {
      toUpload.push(item);
    }
  }
  return { toUpload, skipped };
}

export function planTaskImport(local: Task[], remoteTasks: Pick<Task, "id">[]): MergePlan<Task> {
  return mergeById(local, new Set(remoteTasks.map((t) => t.id)));
}

export function planSessionImport(
  local: FocusSession[],
  remoteSessions: Pick<FocusSession, "id">[],
): MergePlan<FocusSession> {
  return mergeById(local, new Set(remoteSessions.map((s) => s.id)));
}
