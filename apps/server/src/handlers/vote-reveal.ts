import { PermissionError, assertRole } from "@/lib/auth";
import { broadcast } from "@/lib/connections";
import { ErrorCode, sendError } from "@/lib/errors";
import { computeVoteStats } from "@/lib/voting";
import { getRoom, saveRoom } from "@/services/redis";

interface WsLike {
  send(data: string): void;
}

export async function handleVoteReveal(
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
      sendError(ws, ErrorCode.PERMISSION_DENIED, "Only the facilitator can reveal votes");
      return;
    }
    throw err;
  }

  if (room.phase !== "voting") {
    sendError(ws, ErrorCode.INVALID_PHASE, "Votes can only be revealed during the voting phase");
    return;
  }

  const stats = computeVoteStats(room.votes);
  const nonVoters = room.users
    .filter((u) => u.role === "participant" && !u.hasVoted)
    .map((u) => u.id);

  room.phase = "revealed";
  await saveRoom(roomId, room);

  broadcast(roomId, { type: "vote:revealed", votes: room.votes, stats, nonVoters });
}
