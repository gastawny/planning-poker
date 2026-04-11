import { PermissionError, assertRole } from "@/lib/auth";
import { broadcast } from "@/lib/connections";
import { ErrorCode, sendError } from "@/lib/errors";
import { getRoom, saveRoom } from "@/services/redis";

interface WsLike {
  send(data: string): void;
}

export async function handleRoundReset(
  ws: WsLike,
  roomId: string,
  callerId: string
): Promise<void> {
  const room = await getRoom(roomId);
  if (!room) {
    sendError(ws, ErrorCode.ROOM_NOT_FOUND, "Room does not exist");
    return;
  }

  try {
    assertRole(room, callerId, "facilitator");
  } catch (err) {
    if (err instanceof PermissionError) {
      sendError(ws, ErrorCode.PERMISSION_DENIED, "Only the facilitator can reset the round");
      return;
    }
    throw err;
  }

  room.votes = {};
  for (const user of room.users) {
    if (user.role === "participant") {
      user.hasVoted = false;
    }
  }
  room.phase = "waiting";

  await saveRoom(roomId, room);

  broadcast(roomId, { type: "round:reset" });
}
