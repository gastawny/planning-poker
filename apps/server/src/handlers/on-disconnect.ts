import { broadcast, removeConnection } from "@/lib/connections";
import { deleteRoom, getRoom, saveRoom } from "@/services/redis";

export const HOST_REASSIGNMENT_DELAY_MS = 5_000;

const pendingHostTimers = new Map<string, ReturnType<typeof setTimeout>>();

export async function handleDisconnect(roomId: string, userId: string): Promise<void> {
  const room = await getRoom(roomId);
  if (!room) return;

  room.users = room.users.filter((u) => u.id !== userId);
  removeConnection(roomId, userId);

  if (room.users.length === 0) {
    await saveRoom(roomId, room);
    setTimeout(async () => {
      const current = await getRoom(roomId);
      if (current && current.users.length === 0) {
        await deleteRoom(roomId);
      }
    }, 60_000);
    return;
  }

  await saveRoom(roomId, room);
  broadcast(roomId, { type: "user:left", userId });

  if (room.hostId === userId) {
    const existing = pendingHostTimers.get(roomId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      pendingHostTimers.delete(roomId);
      const current = await getRoom(roomId);
      if (!current || current.users.length === 0) return;

      const hasFacilitator = current.users.some((u) => u.role === "facilitator");
      if (hasFacilitator) return;

      const candidates = current.users.filter((u) => u.role === "participant");
      const pool = candidates.length > 0 ? candidates : current.users;
      const newHost = pool.reduce((prev, cur) => (cur.connectedAt < prev.connectedAt ? cur : prev));
      current.hostId = newHost.id;
      newHost.role = "facilitator";
      await saveRoom(roomId, current);
      broadcast(roomId, { type: "user:role_changed", userId: newHost.id, newRole: "facilitator" });
    }, HOST_REASSIGNMENT_DELAY_MS);

    pendingHostTimers.set(roomId, timer);
  }
}
