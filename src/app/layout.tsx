import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import { AppShellFallback } from "@/components/shell/AppShellFallback";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cocorena — your tropical study companion",
    template: "%s · Cocorena",
  },
  description:
    "Cocorena is a gamified productivity and study companion: Pomodoro focus sessions, a real stopwatch, countdowns, coconut-tree streaks, priority tasks, study groups, and practical advice.",
  applicationName: "Cocorena",
};

export const viewport: Viewport = {
  themeColor: "#faf3e3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={<AppShellFallback />}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
