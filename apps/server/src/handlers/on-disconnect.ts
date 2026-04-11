import { broadcast, removeConnection } from "@/lib/connections";
import { deleteRoom, getRoom, saveRoom } from "@/services/redis";

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

  if (room.hostId === userId) {
    const participants = room.users.filter((u) => u.role === "participant");
    const candidates = participants.length > 0 ? participants : room.users;
    const newHost = candidates.reduce((prev, cur) =>
      cur.connectedAt < prev.connectedAt ? cur : prev
    );
    room.hostId = newHost.id;
    newHost.role = "facilitator";
  }

  await saveRoom(roomId, room);
  broadcast(roomId, { type: "user:left", userId });
}
