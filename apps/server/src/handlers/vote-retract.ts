import { broadcast } from "@/lib/connections";
import { ErrorCode, sendError } from "@/lib/errors";
import { getRoom, saveRoom } from "@/services/redis";
import type { ClientEvent } from "@planning-poker/types";

type VoteRetractPayload = Extract<ClientEvent, { type: "vote:retract" }>;

interface WsLike {
  send(data: string): void;
}

export async function handleVoteRetract(
  ws: WsLike,
  _payload: VoteRetractPayload,
  roomId: string,
  callerId: string
): Promise<void> {
  const room = await getRoom(roomId);
  if (!room) {
    sendError(ws, ErrorCode.ROOM_NOT_FOUND, "Room does not exist");
    return;
  }

  if (room.phase !== "voting") {
    sendError(ws, ErrorCode.INVALID_PHASE, "Votes can only be retracted during the voting phase");
    return;
  }

  if (!room.votes[callerId]) return;

  delete room.votes[callerId];

  const caller = room.users.find((u) => u.id === callerId);
  if (caller) caller.hasVoted = false;

  await saveRoom(roomId, room);

  const participants = room.users.filter((u) => u.role === "participant");
  const votesCount = participants.filter((u) => u.hasVoted).length;
  const participantsCount = participants.length;

  broadcast(roomId, { type: "vote:progress", userId: callerId, votesCount, participantsCount });
}
