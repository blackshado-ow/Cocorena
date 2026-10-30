import type { Metadata } from "next";
import { StopwatchTimer } from "@/components/timers/StopwatchTimer";
import { TimerSwitcher } from "@/components/shell/TimerSwitcher";
import { PageHeading } from "@/components/shell/PageHeading";

export const metadata: Metadata = {
  title: "Stopwatch",
  description: "A timestamp-accurate stopwatch for long study blocks, with honest pause handling and explicit save.",
};

export default function StopwatchPage() {
  return (
    <div className="flex animate-rise flex-col gap-6">
      <PageHeading title="Stopwatch" subtitle="Study as long as you like. Pause to take breaks — only unpaused time is counted, and only saved sessions count toward your goal." />
      <TimerSwitcher />
      <StopwatchTimer />
    </div>
  );
}
