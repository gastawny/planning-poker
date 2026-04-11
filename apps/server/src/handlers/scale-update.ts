import { PermissionError, assertRole } from "@/lib/auth";
import { broadcast } from "@/lib/connections";
import { ErrorCode, sendError } from "@/lib/errors";
import { DEFAULT_SPECIAL_CARDS, VALID_SPECIAL_CARDS, validateScale } from "@/lib/scales";
import { getRoom, saveRoom } from "@/services/redis";
import type { ClientEvent } from "@planning-poker/types";

type ScaleUpdatePayload = Extract<ClientEvent, { type: "scale:update" }>;

interface WsLike {
  send(data: string): void;
}

export async function handleScaleUpdate(
  ws: WsLike,
  payload: ScaleUpdatePayload,
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
      sendError(ws, ErrorCode.PERMISSION_DENIED, "Only the facilitator can update the scale");
      return;
    }
    throw err;
  }

  const validation = validateScale(payload.scale);
  if (!validation.valid) {
    sendError(ws, ErrorCode.INVALID_PAYLOAD, validation.error);
    return;
  }

  const specialCards = [...DEFAULT_SPECIAL_CARDS];
  if (payload.specialCards?.includes("☕") && VALID_SPECIAL_CARDS.includes("☕")) {
    specialCards.push("☕");
  }

  let votesCleared = false;
  if (room.phase === "voting") {
    room.votes = {};
    for (const user of room.users) {
      if (user.role === "participant") user.hasVoted = false;
    }
    votesCleared = true;
  }

  room.scale = payload.scale;
  room.specialCards = specialCards;

  await saveRoom(roomId, room);

  broadcast(roomId, {
    type: "scale:updated",
    scale: room.scale,
    specialCards: room.specialCards,
    votesCleared,
  });
}
