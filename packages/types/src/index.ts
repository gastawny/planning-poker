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
  taskName: string;
  scale: string[];
  specialCards: string[];
  users: RoomUser[];
}

// Client → Server events
export type ClientEvent =
  | { type: "join"; roomId: string; userId: string; name: string; role: UserRole }
  | { type: "vote"; roomId: string; userId: string; card: string }
  | { type: "reveal"; roomId: string; userId: string }
  | { type: "reset"; roomId: string; userId: string; taskName?: string };

// Server → Client events
export type ServerEvent =
  | { type: "room_state"; state: RoomState }
  | { type: "user_joined"; user: RoomUser }
  | { type: "user_left"; userId: string }
  | { type: "error"; message: string };
