import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/SettingsPage";

export const metadata: Metadata = {
  title: "Settings",
  description: "Durations, daily goal, sound and notifications, timezone policy, and account management.",
};

export default function SettingsRoute() {
  return (
    <div className="animate-rise">
      <SettingsPage />
    </div>
  );
}
