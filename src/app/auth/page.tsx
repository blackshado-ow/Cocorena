import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to sync your streaks, tasks and study groups across devices.",
};

export default function AuthRoute() {
  return (
    <div className="mx-auto max-w-lg animate-rise">
      <AuthPage />
    </div>
  );
}
