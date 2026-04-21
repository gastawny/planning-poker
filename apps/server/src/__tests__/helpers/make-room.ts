import { DEFAULT_SCALE, DEFAULT_SPECIAL_CARDS } from "@/lib/scales";
import type { RoomState, RoomUser, UserRole } from "@planning-poker/types";

export function makeUser(overrides: Partial<RoomUser> = {}): RoomUser {
  return {
    id: crypto.randomUUID(),
    name: "Test User",
    role: "participant",
    hasVoted: false,
    connectedAt: Date.now(),
    ...overrides,
  };
}

export function makeRoom(overrides: Partial<RoomState> = {}): RoomState {
  const hostId = crypto.randomUUID();
  const facilitator = makeUser({ id: hostId, name: "Host", role: "facilitator" });
  return {
    roomId: `TST-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    hostId,
    phase: "waiting",
    taskName: null,
    scale: [...DEFAULT_SCALE],
    specialCards: [...DEFAULT_SPECIAL_CARDS],
    votes: {},
    users: [facilitator],
    ...overrides,
  };
}

export function makeRoomWithUsers(
  extraUsers: Partial<RoomUser & { role: UserRole }>[],
  overrides: Partial<RoomState> = {}
): { room: RoomState; facilitatorId: string; userIds: string[] } {
  const room = makeRoom(overrides);
  const facilitatorId = room.hostId;
  const userIds: string[] = [];

  for (const u of extraUsers) {
    const user = makeUser(u);
    userIds.push(user.id);
    room.users.push(user);
  }

  return { room, facilitatorId, userIds };
}
