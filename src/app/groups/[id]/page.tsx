import type { Metadata } from "next";
import { RoomSwitchClient } from "@/components/groups/RoomSwitchClient";

export const metadata: Metadata = {
  title: "Study room",
  description: "Your shared study room — presence, focus totals, synchronized sessions.",
};

export default async function GroupRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="animate-rise">
      <RoomSwitchClient groupId={id} />
    </div>
  );
}
