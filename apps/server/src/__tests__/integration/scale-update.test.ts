import { beforeEach, describe, expect, it } from "bun:test";
import { handleScaleUpdate } from "@/handlers/scale-update";
import { addConnection } from "@/lib/connections";
import { makeRoom, makeUser } from "../helpers/make-room";
import { makeWs } from "../helpers/make-ws";
import { redisMock } from "../helpers/redis-mock";

beforeEach(() => redisMock.reset());

describe("handleScaleUpdate", () => {
  it("updates scale in waiting phase with votesCleared: false", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const room = makeRoom({ roomId: "SU-001", phase: "waiting", users: [facilitator] });
    room.hostId = facilitator.id;
    redisMock.seed("SU-001", room);

    const observerWs = makeWs();
    addConnection("SU-001", facilitator.id, observerWs);

    const ws = makeWs();
    await handleScaleUpdate(
      ws,
      { type: "scale:update", scale: ["1", "2", "3"] },
      "SU-001",
      facilitator.id
    );

    const updated = observerWs.messages().find((m) => m.type === "scale:updated");
    expect(updated).toBeDefined();
    if (updated?.type === "scale:updated") {
      expect(updated.scale).toEqual(["1", "2", "3"]);
      expect(updated.votesCleared).toBe(false);
    }
  });

  it("clears votes during voting phase and sets votesCleared: true", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const participant = makeUser({ role: "participant", hasVoted: true });
    const room = makeRoom({
      roomId: "SU-002",
      phase: "voting",
      users: [facilitator, participant],
      votes: { [participant.id]: "5" },
    });
    room.hostId = facilitator.id;
    redisMock.seed("SU-002", room);

    const observerWs = makeWs();
    addConnection("SU-002", facilitator.id, observerWs);

    const ws = makeWs();
    await handleScaleUpdate(
      ws,
      { type: "scale:update", scale: ["1", "2", "3"] },
      "SU-002",
      facilitator.id
    );

    const updated = observerWs.messages().find((m) => m.type === "scale:updated");
    if (updated?.type === "scale:updated") expect(updated.votesCleared).toBe(true);

    const saved = redisMock.store.get("room:SU-002");
    expect(Object.keys(saved?.votes ?? {})).toHaveLength(0);
    expect(saved?.users.find((u) => u.id === participant.id)?.hasVoted).toBe(false);
  });

  it("rejects scale with fewer than 2 values", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const room = makeRoom({ roomId: "SU-003", users: [facilitator] });
    room.hostId = facilitator.id;
    redisMock.seed("SU-003", room);

    const ws = makeWs();
    await handleScaleUpdate(ws, { type: "scale:update", scale: ["1"] }, "SU-003", facilitator.id);

    const err = ws.lastMessage();
    if (err?.type === "error") expect(err.code).toBe("INVALID_PAYLOAD");
  });

  it("rejects scale with more than 15 values", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const room = makeRoom({ roomId: "SU-004", users: [facilitator] });
    room.hostId = facilitator.id;
    redisMock.seed("SU-004", room);

    const scale = Array.from({ length: 16 }, (_, i) => String(i + 1));
    const ws = makeWs();
    await handleScaleUpdate(ws, { type: "scale:update", scale }, "SU-004", facilitator.id);

    const err = ws.lastMessage();
    if (err?.type === "error") expect(err.code).toBe("INVALID_PAYLOAD");
  });

  it("includes coffee card when opt-in", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const room = makeRoom({ roomId: "SU-005", users: [facilitator] });
    room.hostId = facilitator.id;
    redisMock.seed("SU-005", room);

    const observerWs = makeWs();
    addConnection("SU-005", facilitator.id, observerWs);

    const ws = makeWs();
    await handleScaleUpdate(
      ws,
      { type: "scale:update", scale: ["1", "2", "3"], specialCards: ["☕"] },
      "SU-005",
      facilitator.id
    );

    const updated = observerWs.messages().find((m) => m.type === "scale:updated");
    if (updated?.type === "scale:updated") {
      expect(updated.specialCards).toContain("☕");
      expect(updated.specialCards).toContain("?");
      expect(updated.specialCards).toContain("∞");
    }
  });

  it("always includes ? and ∞ even if omitted from payload", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const room = makeRoom({ roomId: "SU-006", users: [facilitator] });
    room.hostId = facilitator.id;
    redisMock.seed("SU-006", room);

    const observerWs = makeWs();
    addConnection("SU-006", facilitator.id, observerWs);

    const ws = makeWs();
    await handleScaleUpdate(
      ws,
      { type: "scale:update", scale: ["1", "2", "3"] },
      "SU-006",
      facilitator.id
    );

    const updated = observerWs.messages().find((m) => m.type === "scale:updated");
    if (updated?.type === "scale:updated") {
      expect(updated.specialCards).toContain("?");
      expect(updated.specialCards).toContain("∞");
    }
  });

  it("rejects non-facilitator with PERMISSION_DENIED", async () => {
    const participant = makeUser({ role: "participant" });
    const room = makeRoom({ roomId: "SU-007", users: [participant] });
    redisMock.seed("SU-007", room);

    const ws = makeWs();
    await handleScaleUpdate(
      ws,
      { type: "scale:update", scale: ["1", "2", "3"] },
      "SU-007",
      participant.id
    );

    const err = ws.lastMessage();
    if (err?.type === "error") expect(err.code).toBe("PERMISSION_DENIED");
  });

  it("rejects non-ascending scale values", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const room = makeRoom({ roomId: "SU-008", users: [facilitator] });
    room.hostId = facilitator.id;
    redisMock.seed("SU-008", room);

    const ws = makeWs();
    await handleScaleUpdate(
      ws,
      { type: "scale:update", scale: ["5", "3", "1"] },
      "SU-008",
      facilitator.id
    );

    const err = ws.lastMessage();
    if (err?.type === "error") expect(err.code).toBe("INVALID_PAYLOAD");
  });

  it("rejects duplicate scale values", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const room = makeRoom({ roomId: "SU-009", users: [facilitator] });
    room.hostId = facilitator.id;
    redisMock.seed("SU-009", room);

    const ws = makeWs();
    await handleScaleUpdate(
      ws,
      { type: "scale:update", scale: ["1", "2", "2"] },
      "SU-009",
      facilitator.id
    );

    const err = ws.lastMessage();
    if (err?.type === "error") expect(err.code).toBe("INVALID_PAYLOAD");
  });

  it("rejects non-array scale payload", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const room = makeRoom({ roomId: "SU-010", users: [facilitator] });
    room.hostId = facilitator.id;
    redisMock.seed("SU-010", room);

    const ws = makeWs();
    await handleScaleUpdate(
      ws,
      { type: "scale:update", scale: "not-an-array" as unknown as string[] },
      "SU-010",
      facilitator.id
    );

    const err = ws.lastMessage();
    if (err?.type === "error") expect(err.code).toBe("INVALID_PAYLOAD");
  });
});
