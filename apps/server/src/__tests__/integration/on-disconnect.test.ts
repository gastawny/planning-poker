import { afterEach, beforeEach, describe, expect, it, jest } from "bun:test";
import { handleDisconnect } from "@/handlers/on-disconnect";
import { addConnection } from "@/lib/connections";
import { makeRoom, makeUser } from "../helpers/make-room";
import { makeWs } from "../helpers/make-ws";
import { redisMock } from "../helpers/redis-mock";

async function flushTimerCallbacks() {
  // After jest.advanceTimersByTime, async timer callbacks have started but their
  // internal awaits haven't resolved yet. Multiple Promise.resolve() flushes
  // drain the microtask queue until all async operations inside the callbacks complete.
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  redisMock.reset();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("handleDisconnect", () => {
  it("removes the user and broadcasts user:left to remaining users", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const participant = makeUser({ role: "participant" });
    const room = makeRoom({
      roomId: "OD-001",
      users: [facilitator, participant],
    });
    room.hostId = facilitator.id;
    redisMock.seed("OD-001", room);

    const observerWs = makeWs();
    addConnection("OD-001", facilitator.id, observerWs);
    addConnection("OD-001", participant.id, makeWs());

    await handleDisconnect("OD-001", participant.id);

    const saved = redisMock.store.get("room:OD-001");
    expect(saved?.users).toHaveLength(1);
    expect(saved?.users[0]?.id).toBe(facilitator.id);

    const left = observerWs.messages().find((m) => m.type === "user:left");
    expect(left).toBeDefined();
    if (left?.type === "user:left") expect(left.userId).toBe(participant.id);
  });

  it("does not immediately promote when facilitator disconnects", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const participant = makeUser({ role: "participant" });
    const room = makeRoom({
      roomId: "OD-002",
      users: [facilitator, participant],
    });
    room.hostId = facilitator.id;
    redisMock.seed("OD-002", room);

    const participantWs = makeWs();
    addConnection("OD-002", facilitator.id, makeWs());
    addConnection("OD-002", participant.id, participantWs);

    await handleDisconnect("OD-002", facilitator.id);

    const noPromotion = participantWs.messages().find((m) => m.type === "user:role_changed");
    expect(noPromotion).toBeUndefined();

    const saved = redisMock.store.get("room:OD-002");
    expect(saved?.users.every((u) => u.role !== "facilitator")).toBe(true);
  });

  it("promotes new host after grace period fires", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const participant = makeUser({ role: "participant" });
    const room = makeRoom({
      roomId: "OD-003",
      users: [facilitator, participant],
    });
    room.hostId = facilitator.id;
    redisMock.seed("OD-003", room);

    const participantWs = makeWs();
    addConnection("OD-003", facilitator.id, makeWs());
    addConnection("OD-003", participant.id, participantWs);

    await handleDisconnect("OD-003", facilitator.id);

    jest.advanceTimersByTime(6000);
    await flushTimerCallbacks();

    const promotion = participantWs.messages().find((m) => m.type === "user:role_changed");
    expect(promotion).toBeDefined();
    if (promotion?.type === "user:role_changed") {
      expect(promotion.userId).toBe(participant.id);
      expect(promotion.newRole).toBe("facilitator");
    }

    const saved = redisMock.store.get("room:OD-003");
    expect(saved?.hostId).toBe(participant.id);
  });

  it("skips promotion if facilitator has rejoined before grace period ends", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const participant = makeUser({ role: "participant" });
    const room = makeRoom({
      roomId: "OD-004",
      users: [facilitator, participant],
    });
    room.hostId = facilitator.id;
    redisMock.seed("OD-004", room);

    addConnection("OD-004", facilitator.id, makeWs());
    const participantWs = makeWs();
    addConnection("OD-004", participant.id, participantWs);

    await handleDisconnect("OD-004", facilitator.id);

    // Simulate facilitator rejoining: new user with "facilitator" role added before timer fires
    const rejoinedRoom = redisMock.store.get("room:OD-004");
    if (!rejoinedRoom) throw new Error("Room OD-004 not found in mock store");
    const rejoinedFacilitator = makeUser({ role: "facilitator" });
    rejoinedRoom.users.push(rejoinedFacilitator);
    redisMock.seed("OD-004", rejoinedRoom);

    jest.advanceTimersByTime(6000);
    await flushTimerCallbacks();

    const promotion = participantWs.messages().find((m) => m.type === "user:role_changed");
    expect(promotion).toBeUndefined();
  });

  it("schedules room deletion when last user disconnects", async () => {
    const participant = makeUser({ role: "participant" });
    const room = makeRoom({ roomId: "OD-005", users: [participant] });
    redisMock.seed("OD-005", room);
    addConnection("OD-005", participant.id, makeWs());

    await handleDisconnect("OD-005", participant.id);

    expect(redisMock.store.has("room:OD-005")).toBe(true);

    jest.advanceTimersByTime(61000);
    await flushTimerCallbacks();

    expect(redisMock.store.has("room:OD-005")).toBe(false);
  });

  it("does not delete room if someone rejoined before 60s deletion timer", async () => {
    const participant = makeUser({ role: "participant" });
    const room = makeRoom({ roomId: "OD-006", users: [participant] });
    redisMock.seed("OD-006", room);
    addConnection("OD-006", participant.id, makeWs());

    await handleDisconnect("OD-006", participant.id);

    // Simulate a new user joining before the 60s timer fires
    const rejoined = { ...room, users: [makeUser({ role: "participant" })] };
    redisMock.seed("OD-006", rejoined);

    jest.advanceTimersByTime(61000);
    await flushTimerCallbacks();

    // Room should still exist because users.length > 0
    expect(redisMock.store.has("room:OD-006")).toBe(true);
  });
});
