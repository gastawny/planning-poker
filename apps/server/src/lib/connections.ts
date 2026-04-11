import type { ServerEvent } from "@planning-poker/types";

interface WsLike {
  send(data: string): void;
}

const rooms = new Map<string, Map<string, WsLike>>();

export function addConnection(roomId: string, userId: string, ws: WsLike): void {
  let users = rooms.get(roomId);
  if (!users) {
    users = new Map();
    rooms.set(roomId, users);
  }
  users.set(userId, ws);
}

export function removeConnection(roomId: string, userId: string): void {
  const users = rooms.get(roomId);
  if (!users) return;
  users.delete(userId);
  if (users.size === 0) rooms.delete(roomId);
}

export function broadcast(
  roomId: string,
  payload: ServerEvent,
  excludeUserIds: string[] = []
): void {
  const users = rooms.get(roomId);
  if (!users) return;
  const data = JSON.stringify(payload);
  for (const [userId, ws] of users) {
    if (!excludeUserIds.includes(userId)) {
      ws.send(data);
    }
  }
}

export function sendTo(roomId: string, userId: string, payload: ServerEvent): void {
  const ws = rooms.get(roomId)?.get(userId);
  if (ws) ws.send(JSON.stringify(payload));
}

export function getConnectionCount(roomId: string): number {
  return rooms.get(roomId)?.size ?? 0;
}
