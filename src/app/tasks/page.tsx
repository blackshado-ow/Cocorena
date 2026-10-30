import type { Metadata } from "next";
import { TaskPage } from "@/components/tasks/TaskPage";
import { PageHeading } from "@/components/shell/PageHeading";

export const metadata: Metadata = {
  title: "Tasks",
  description: "Priority-based task list with due dates, notes, filters and completion tracking.",
};

export default function TasksPage() {
  return (
    <div className="flex animate-rise flex-col gap-6">
      <PageHeading title="Tasks" subtitle="Plan by priority, not by panic. High, Medium, Low — with due dates, notes, and honest filtering." />
      <TaskPage />
    </div>
  );
}
