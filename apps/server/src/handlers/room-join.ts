import { addConnection, broadcast, sendTo } from "@/lib/connections";
import { ErrorCode, sendError } from "@/lib/errors";
import { generateUserId } from "@/lib/ids";
import { getRoom, saveRoom } from "@/services/redis";
import type { ClientEvent, RoomUser } from "@planning-poker/types";

type JoinPayload = Extract<ClientEvent, { type: "room:join" }>;

interface WsLike {
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export async function handleRoomJoin(
  ws: WsLike,
  payload: JoinPayload,
  roomId: string
): Promise<string | null> {
  const { name, role } = payload;

  if (!name || name.length < 2 || name.length > 30) {
    sendError(ws, ErrorCode.INVALID_PAYLOAD, "Name must be between 2 and 30 characters");
    return null;
  }

  if (role !== "participant" && role !== "spectator") {
    sendError(ws, ErrorCode.INVALID_PAYLOAD, "Role must be participant or spectator");
    return null;
  }

  const room = await getRoom(roomId);
  if (!room) {
    sendError(ws, ErrorCode.ROOM_NOT_FOUND, "Room does not exist");
    ws.close(4004, "Room not found");
    return null;
  }

  if (room.users.length >= 20) {
    sendError(ws, ErrorCode.ROOM_FULL, "Room has reached the maximum of 20 users");
    return null;
  }

  const user: RoomUser = {
    id: generateUserId(),
    name,
    role,
    hasVoted: false,
    connectedAt: Date.now(),
  };

  room.users.push(user);
  await saveRoom(roomId, room);

  addConnection(roomId, user.id, ws);

  sendTo(roomId, user.id, { type: "room:state", state: room });
  broadcast(roomId, { type: "user:joined", user }, [user.id]);

  return user.id;
}
