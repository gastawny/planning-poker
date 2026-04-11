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
export type ClientEvent =
  | { type: "room:join"; name: string; role: "participant" | "spectator" }
  | { type: "user:change_role"; targetUserId: string; newRole: "participant" | "spectator" }
  | { type: "room:kick"; targetUserId: string };

// Server → Client events
export type ServerEvent =
  | { type: "room:state"; state: RoomState }
  | { type: "user:joined"; user: RoomUser }
  | { type: "user:left"; userId: string; kicked?: boolean }
  | { type: "user:role_changed"; userId: string; newRole: UserRole }
  | { type: "vote:all_voted" }
  | { type: "error"; code: string; message: string };
