import type { Metadata } from "next";
import { ProfilePage } from "@/components/profile/ProfilePage";

export const metadata: Metadata = {
  title: "Your profile",
  description: "Your public study card: username, display name, avatar, and friend code.",
};

export default function ProfileRoute() {
  return (
    <div className="animate-rise">
      <ProfilePage />
    </div>
  );
}
