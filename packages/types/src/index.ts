export type UserRole = "facilitator" | "participant" | "spectator";

export type RoundPhase = "waiting" | "voting" | "revealed";

export interface RoomUser {
  id: string;
  name: string;
  role: UserRole;
  hasVoted: boolean;
  connectedAt: number;
}

export interface RoomState {
  roomId: string;
  hostId: string;
  phase: RoundPhase;
  taskName: string | null;
  scale: string[];
  specialCards: string[];
  votes: Record<string, string>;
  users: RoomUser[];
}

// Client → Server events
export type ClientEvent = { type: "room:join"; name: string; role: "participant" | "spectator" };

// Server → Client events
export type ServerEvent =
  | { type: "room:state"; state: RoomState }
  | { type: "user:joined"; user: RoomUser }
  | { type: "user:left"; userId: string }
  | { type: "error"; code: string; message: string };
