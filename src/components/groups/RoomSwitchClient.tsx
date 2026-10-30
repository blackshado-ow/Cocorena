"use client";

import { useState } from "react";
import { useCloudUser } from "@/lib/supabase/auth-state";
import { CloudGroupRoom, LocalGroupRoom } from "@/components/groups/CloudGroupRoom";
import { Spinner } from "@/components/ui/primitives";

/** Chooses the room implementation honestly: cloud room when signed in and the
 * group is a cloud group; local demo room otherwise. */
export function RoomSwitchClient({ groupId }: { groupId: string }) {
  const { configured, loading, user } = useCloudUser();
  const [forceLocal, setForceLocal] = useState(false);

  if (loading && configured) return <Spinner label="Checking sign-in" />;
  if (!configured || !user || forceLocal) return <LocalGroupRoom groupId={groupId} />;
  return <CloudGroupRoom groupId={groupId} userId={user.id} onNotFound={() => setForceLocal(true)} />;
}
