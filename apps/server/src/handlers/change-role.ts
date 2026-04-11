import { PermissionError, assertRole } from "@/lib/auth";
import { broadcast } from "@/lib/connections";
import { ErrorCode, sendError } from "@/lib/errors";
import { getRoom, saveRoom } from "@/services/redis";
import type { ClientEvent } from "@planning-poker/types";

type ChangeRolePayload = Extract<ClientEvent, { type: "user:change_role" }>;

interface WsLike {
  send(data: string): void;
}

function checkAllVoted(room: Parameters<typeof saveRoom>[1]): boolean {
  const participants = room.users.filter((u) => u.role === "participant");
  if (participants.length === 0) return false;
  return participants.every((u) => u.hasVoted);
}

export async function handleChangeRole(
  ws: WsLike,
  payload: ChangeRolePayload,
  roomId: string,
  callerId: string
): Promise<void> {
  const { targetUserId, newRole } = payload;

  if (!targetUserId) {
    sendError(ws, ErrorCode.INVALID_PAYLOAD, "targetUserId is required");
    return;
  }

  if (newRole !== "participant" && newRole !== "spectator") {
    sendError(ws, ErrorCode.INVALID_PAYLOAD, "newRole must be participant or spectator");
    return;
  }

  const room = await getRoom(roomId);
  if (!room) {
    sendError(ws, ErrorCode.ROOM_NOT_FOUND, "Room does not exist");
    return;
  }

  const target = room.users.find((u) => u.id === targetUserId);
  if (!target) {
    sendError(ws, ErrorCode.INVALID_PAYLOAD, "Target user not found in room");
    return;
  }

  if (target.role === "facilitator") {
    sendError(ws, ErrorCode.PERMISSION_DENIED, "Cannot change the facilitator's role");
    return;
  }

  if (callerId !== targetUserId) {
    try {
      assertRole(room, callerId, "facilitator");
    } catch (err) {
      if (err instanceof PermissionError) {
        sendError(
          ws,
          ErrorCode.PERMISSION_DENIED,
          "Only the facilitator can change another user's role"
        );
        return;
      }
      throw err;
    }
  }

  const previousRole = target.role;
  target.role = newRole;

  if (previousRole === "participant" && newRole === "spectator") {
    delete room.votes[targetUserId];
    target.hasVoted = false;
  } else if (previousRole === "spectator" && newRole === "participant") {
    if (room.phase === "voting") {
      target.hasVoted = false;
    }
  }

  await saveRoom(roomId, room);

  broadcast(roomId, { type: "user:role_changed", userId: targetUserId, newRole });

  if (room.phase === "voting" && checkAllVoted(room)) {
    broadcast(roomId, { type: "vote:all_voted" });
  }
}
