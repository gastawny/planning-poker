import { PermissionError, assertRole } from "@/lib/auth";
import { broadcast } from "@/lib/connections";
import { ErrorCode, sendError } from "@/lib/errors";
import { DEFAULT_SCALE, DEFAULT_SPECIAL_CARDS } from "@/lib/scales";
import { getRoom, saveRoom } from "@/services/redis";

interface WsLike {
  send(data: string): void;
}

export async function handleScaleReset(
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
      sendError(ws, ErrorCode.PERMISSION_DENIED, "Only the facilitator can reset the scale");
      return;
    }
    throw err;
  }

  let votesCleared = false;
  if (room.phase === "voting") {
    room.votes = {};
    for (const user of room.users) {
      if (user.role === "participant") user.hasVoted = false;
    }
    votesCleared = true;
  }

  room.scale = [...DEFAULT_SCALE];
  room.specialCards = [...DEFAULT_SPECIAL_CARDS];

  await saveRoom(roomId, room);

  broadcast(roomId, {
    type: "scale:updated",
    scale: room.scale,
    specialCards: room.specialCards,
    votesCleared,
  });
}
