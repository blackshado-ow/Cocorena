import type { Metadata } from "next";
import { CountdownTimer } from "@/components/timers/CountdownTimer";
import { TimerSwitcher } from "@/components/shell/TimerSwitcher";
import { PageHeading } from "@/components/shell/PageHeading";

export const metadata: Metadata = {
  title: "Countdown",
  description: "Pick any duration hour, minute, second. Accurate to timestamps, refresh-safe, and honestly not counted as focus unless you log it.",
};

export default function CountdownPage() {
  return (
    <div className="flex animate-rise flex-col gap-6">
      <PageHeading title="Countdown" subtitle="Race small tasks or time a fixed block. Countdowns don't count as focus time unless you explicitly log them." />
      <TimerSwitcher />
      <CountdownTimer />
    </div>
  );
}
