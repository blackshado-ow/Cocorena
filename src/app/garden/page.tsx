import type { Metadata } from "next";
import { GardenView } from "@/components/garden/GardenView";
import { PageHeading } from "@/components/shell/PageHeading";

export const metadata: Metadata = {
  title: "Streak Garden",
  description: "Your consistency as a coconut grove: one healthy coconut per qualifying day, no shaming for missed ones.",
};

export default function GardenPage() {
  return (
    <div className="flex animate-rise flex-col gap-6">
      <PageHeading title="Streak Garden" subtitle="Every qualifying day grows your grove. Miss a day and the coconut shows it honestly — without guilt." />
      <GardenView />
    </div>
  );
}
