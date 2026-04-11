import type { ServerEvent } from "@planning-poker/types";

export const ErrorCode = {
  PERMISSION_DENIED: "PERMISSION_DENIED",
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
  ROOM_FULL: "ROOM_FULL",
  INVALID_PHASE: "INVALID_PHASE",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

interface WsLike {
  send(data: string): void;
}

export function sendError(ws: WsLike, code: ErrorCode, message: string): void {
  const payload: ServerEvent = { type: "error", code, message };
  ws.send(JSON.stringify(payload));
}
