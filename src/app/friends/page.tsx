import type { Metadata } from "next";
import { FriendsPage } from "@/components/friends/FriendsPage";

export const metadata: Metadata = {
  title: "Friends",
  description: "Find study partners by username or friend code, exchange requests, and build your study circle.",
};

export default function FriendsRoute() {
  return (
    <div className="animate-rise">
      <FriendsPage />
    </div>
  );
}
