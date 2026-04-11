import { broadcast } from "@/lib/connections";
import { ErrorCode, sendError } from "@/lib/errors";
import { checkAllVoted } from "@/lib/voting";
import { getRoom, saveRoom } from "@/services/redis";
import type { ClientEvent } from "@planning-poker/types";

type VoteSubmitPayload = Extract<ClientEvent, { type: "vote:submit" }>;

interface WsLike {
  send(data: string): void;
}

export async function handleVoteSubmit(
  ws: WsLike,
  payload: VoteSubmitPayload,
  roomId: string,
  callerId: string
): Promise<void> {
  const room = await getRoom(roomId);
  if (!room) {
    sendError(ws, ErrorCode.ROOM_NOT_FOUND, "Room does not exist");
    return;
  }

  const caller = room.users.find((u) => u.id === callerId);
  if (!caller || caller.role !== "participant") {
    sendError(ws, ErrorCode.PERMISSION_DENIED, "Only participants can submit votes");
    return;
  }

  if (room.phase !== "voting") {
    sendError(ws, ErrorCode.INVALID_PHASE, "Votes can only be submitted during the voting phase");
    return;
  }

  const { value } = payload;
  const validValues = [...room.scale, ...room.specialCards];
  if (!value || !validValues.includes(value)) {
    sendError(
      ws,
      ErrorCode.INVALID_PAYLOAD,
      "Vote value must be in the room's scale or special cards"
    );
    return;
  }

  room.votes[callerId] = value;
  caller.hasVoted = true;

  await saveRoom(roomId, room);

  const participants = room.users.filter((u) => u.role === "participant");
  const votesCount = participants.filter((u) => u.hasVoted).length;
  const participantsCount = participants.length;

  broadcast(roomId, { type: "vote:progress", userId: callerId, votesCount, participantsCount });

  if (checkAllVoted(room)) {
    broadcast(roomId, { type: "vote:all_voted" });
  }
}
