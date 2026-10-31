import type { Metadata } from "next";
import { JoinGroupView } from "@/components/groups/JoinGroupView";

export const metadata: Metadata = {
  title: "Join a group",
  description: "Use an invitation link or code to join a shared study group.",
};

export default function GroupsJoinRoute() {
  return (
    <div className="animate-rise">
      <JoinGroupView />
    </div>
  );
}
