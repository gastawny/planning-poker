import { PermissionError, assertRole } from "@/lib/auth";
import { broadcast, closeConnection, removeConnection } from "@/lib/connections";
import { ErrorCode, sendError } from "@/lib/errors";
import { getRoom, saveRoom } from "@/services/redis";
import type { ClientEvent } from "@planning-poker/types";

type KickPayload = Extract<ClientEvent, { type: "room:kick" }>;

interface WsLike {
  send(data: string): void;
}

export async function handleKick(
  ws: WsLike,
  payload: KickPayload,
  roomId: string,
  callerId: string
): Promise<void> {
  const { targetUserId } = payload;

  if (!targetUserId) {
    sendError(ws, ErrorCode.INVALID_PAYLOAD, "targetUserId is required");
    return;
  }

  const room = await getRoom(roomId);
  if (!room) {
    sendError(ws, ErrorCode.ROOM_NOT_FOUND, "Room does not exist");
    return;
  }

  try {
    assertRole(room, callerId, "facilitator");
  } catch (err) {
    if (err instanceof PermissionError) {
      sendError(ws, ErrorCode.PERMISSION_DENIED, "Only the facilitator can kick users");
      return;
    }
    throw err;
  }

  const target = room.users.find((u) => u.id === targetUserId);
  if (!target) {
    sendError(ws, ErrorCode.INVALID_PAYLOAD, "Target user not found in room");
    return;
  }

  room.users = room.users.filter((u) => u.id !== targetUserId);
  delete room.votes[targetUserId];
  await saveRoom(roomId, room);

  closeConnection(roomId, targetUserId, 4003, "Kicked from room");
  removeConnection(roomId, targetUserId);

  broadcast(roomId, { type: "user:left", userId: targetUserId, kicked: true });
}
