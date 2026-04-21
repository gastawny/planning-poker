import { beforeEach, describe, expect, it } from "bun:test";
import { handleRoomJoin } from "@/handlers/room-join";
import { addConnection } from "@/lib/connections";
import { makeRoom, makeUser } from "../helpers/make-room";
import { makeWs } from "../helpers/make-ws";
import { redisMock } from "../helpers/redis-mock";

beforeEach(() => redisMock.reset());

describe("handleRoomJoin", () => {
  it("lets a participant join successfully", async () => {
    const room = makeRoom({ roomId: "RJ-001", users: [] });
    redisMock.seed("RJ-001", room);

    const ws = makeWs();
    const userId = await handleRoomJoin(
      ws,
      { type: "room:join", name: "Alice", role: "participant" },
      "RJ-001"
    );

    expect(userId).not.toBeNull();
    const joined = ws.messages().find((m) => m.type === "room:joined");
    expect(joined).toBeDefined();
    if (userId && joined?.type === "room:joined") {
      expect(joined.userId).toBe(userId);
      expect(joined.state.users).toHaveLength(1);
    }
  });

  it("assigns facilitator role when hostId matches", async () => {
    const room = makeRoom({ roomId: "RJ-002", users: [] });
    redisMock.seed("RJ-002", room);

    const ws = makeWs();
    const userId = await handleRoomJoin(
      ws,
      { type: "room:join", name: "Host", role: "participant", hostId: room.hostId } as Parameters<
        typeof handleRoomJoin
      >[1],
      "RJ-002"
    );

    expect(userId).not.toBeNull();
    const joined = ws.messages().find((m) => m.type === "room:joined");
    if (joined?.type === "room:joined") {
      const user = joined.state.users.find((u) => u.id === userId);
      expect(user?.role).toBe("facilitator");
    }
  });

  it("returns null and sends error when room not found", async () => {
    const ws = makeWs();
    const userId = await handleRoomJoin(
      ws,
      { type: "room:join", name: "Alice", role: "participant" },
      "MISSING"
    );

    expect(userId).toBeNull();
    const err = ws.messages().find((m) => m.type === "error");
    expect(err).toBeDefined();
    if (err?.type === "error") expect(err.code).toBe("ROOM_NOT_FOUND");
    expect(ws.close).toHaveBeenCalledWith(4004, expect.any(String));
  });

  it("returns null when room is full (20 users)", async () => {
    const users = Array.from({ length: 20 }, () => makeUser());
    const room = makeRoom({ roomId: "RJ-003", users });
    redisMock.seed("RJ-003", room);

    const ws = makeWs();
    const userId = await handleRoomJoin(
      ws,
      { type: "room:join", name: "Overflow", role: "participant" },
      "RJ-003"
    );

    expect(userId).toBeNull();
    const err = ws.messages().find((m) => m.type === "error");
    if (err?.type === "error") expect(err.code).toBe("ROOM_FULL");
  });

  it("rejects name that is too short", async () => {
    const room = makeRoom({ roomId: "RJ-004", users: [] });
    redisMock.seed("RJ-004", room);

    const ws = makeWs();
    const userId = await handleRoomJoin(
      ws,
      { type: "room:join", name: "A", role: "participant" },
      "RJ-004"
    );

    expect(userId).toBeNull();
    const err = ws.messages().find((m) => m.type === "error");
    if (err?.type === "error") expect(err.code).toBe("INVALID_PAYLOAD");
  });

  it("rejects name that is too long", async () => {
    const room = makeRoom({ roomId: "RJ-005", users: [] });
    redisMock.seed("RJ-005", room);

    const ws = makeWs();
    const userId = await handleRoomJoin(
      ws,
      { type: "room:join", name: "A".repeat(31), role: "participant" },
      "RJ-005"
    );

    expect(userId).toBeNull();
    const err = ws.messages().find((m) => m.type === "error");
    if (err?.type === "error") expect(err.code).toBe("INVALID_PAYLOAD");
  });

  it("rejects invalid role", async () => {
    const room = makeRoom({ roomId: "RJ-006", users: [] });
    redisMock.seed("RJ-006", room);

    const ws = makeWs();
    const userId = await handleRoomJoin(
      ws,
      { type: "room:join", name: "Alice", role: "facilitator" as "participant" },
      "RJ-006"
    );

    expect(userId).toBeNull();
    const err = ws.messages().find((m) => m.type === "error");
    if (err?.type === "error") expect(err.code).toBe("INVALID_PAYLOAD");
  });

  it("broadcasts user:joined to existing users when a second user joins", async () => {
    const room = makeRoom({ roomId: "RJ-007", users: [] });
    redisMock.seed("RJ-007", room);

    const ws1 = makeWs();
    const firstId = await handleRoomJoin(
      ws1,
      { type: "room:join", name: "Alice", role: "participant" },
      "RJ-007"
    );
    expect(firstId).not.toBeNull();
    if (!firstId) throw new Error("Expected firstId");
    addConnection("RJ-007", firstId, ws1);
    ws1.reset();

    const ws2 = makeWs();
    await handleRoomJoin(ws2, { type: "room:join", name: "Bob", role: "participant" }, "RJ-007");

    const notification = ws1.messages().find((m) => m.type === "user:joined");
    expect(notification).toBeDefined();
    if (notification?.type === "user:joined") {
      expect(notification.user.name).toBe("Bob");
    }
  });
});
