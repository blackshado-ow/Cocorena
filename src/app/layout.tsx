import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

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

/* Routes are student-sized, so instant navigation (client shell streaming)
 * adds little here — opt the whole app out and let navigations render on
 * the server in one pass instead.
 */
export const instant = false;

export const viewport: Viewport = {
  themeColor: "#f8f3e7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
