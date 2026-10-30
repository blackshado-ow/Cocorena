import type { Metadata } from "next";
import { PomodoroTimer } from "@/components/timers/PomodoroTimer";
import { TimerSwitcher } from "@/components/shell/TimerSwitcher";
import { PageHeading } from "@/components/shell/PageHeading";

export const metadata: Metadata = {
  title: "Focus timer",
  description: "One 25-minute Pomodoro focus session. Pause when you need, break unlocks only when the session concludes.",
};

export default function FocusPage() {
  return (
    <div className="flex animate-rise flex-col gap-6">
      <PageHeading title="Pomodoro" subtitle="25 minutes of focus, then a 5-minute break unlocks — but only after the session completes. Paused time never counts." />
      <TimerSwitcher />
      <PomodoroTimer />
    </div>
  );
}
