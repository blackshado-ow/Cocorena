import type { Metadata } from "next";
import { GroupsPage } from "@/components/groups/GroupsPage";

export const metadata: Metadata = {
  title: "Study groups",
  description: "Create or join study groups of up to 12; track individual and group focus time honestly.",
};

export default function GroupsRoute() {
  return (
    <div className="animate-rise">
      <GroupsPage />
    </div>
  );
}
