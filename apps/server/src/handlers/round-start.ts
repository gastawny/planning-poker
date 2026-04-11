import { PermissionError, assertRole } from "@/lib/auth";
import { broadcast } from "@/lib/connections";
import { ErrorCode, sendError } from "@/lib/errors";
import { getRoom, saveRoom } from "@/services/redis";
import type { ClientEvent } from "@planning-poker/types";

type RoundStartPayload = Extract<ClientEvent, { type: "round:start" }>;

interface WsLike {
  send(data: string): void;
}

export async function handleRoundStart(
  ws: WsLike,
  payload: RoundStartPayload,
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
      sendError(ws, ErrorCode.PERMISSION_DENIED, "Only the facilitator can start a round");
      return;
    }
    throw err;
  }

  if (room.phase !== "waiting" && room.phase !== "revealed") {
    sendError(
      ws,
      ErrorCode.INVALID_PHASE,
      "Round can only be started from waiting or revealed phase"
    );
    return;
  }

  room.votes = {};
  for (const user of room.users) {
    if (user.role === "participant") {
      user.hasVoted = false;
    }
  }
  room.phase = "voting";
  room.taskName = payload.taskName ?? null;

  await saveRoom(roomId, room);

  broadcast(roomId, { type: "round:started", taskName: room.taskName });
}
