import type { Metadata } from "next";
import { FocusCornerPage } from "@/components/focuscorner/FocusCornerPage";

export const metadata: Metadata = {
  title: "Focus Corner",
  description: "Curated, practical advice on focus, study techniques, breaks, habits and exam prep.",
};

export default function FocusCornerRoute() {
  return (
    <div className="animate-rise">
      <FocusCornerPage />
    </div>
  );
}
