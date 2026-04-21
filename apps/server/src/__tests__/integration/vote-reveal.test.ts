import { beforeEach, describe, expect, it } from "bun:test";
import { handleVoteReveal } from "@/handlers/vote-reveal";
import { addConnection } from "@/lib/connections";
import { makeRoom, makeUser } from "../helpers/make-room";
import { makeWs } from "../helpers/make-ws";
import { redisMock } from "../helpers/redis-mock";

beforeEach(() => redisMock.reset());

describe("handleVoteReveal", () => {
  it("reveals votes with stats when all participants voted", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const p1 = makeUser({ role: "participant", hasVoted: true });
    const p2 = makeUser({ role: "participant", hasVoted: true });
    const room = makeRoom({
      roomId: "VR-001",
      phase: "voting",
      users: [facilitator, p1, p2],
      votes: { [p1.id]: "3", [p2.id]: "5" },
    });
    room.hostId = facilitator.id;
    redisMock.seed("VR-001", room);

    const observerWs = makeWs();
    addConnection("VR-001", facilitator.id, observerWs);

    const ws = makeWs();
    await handleVoteReveal(ws, "VR-001", facilitator.id);

    const revealed = observerWs.messages().find((m) => m.type === "vote:revealed");
    expect(revealed).toBeDefined();
    if (revealed?.type === "vote:revealed") {
      expect(revealed.votes[p1.id]).toBe("3");
      expect(revealed.votes[p2.id]).toBe("5");
      expect(revealed.stats).not.toBeNull();
      expect(revealed.stats?.mean).toBe(4);
      expect(revealed.nonVoters).toHaveLength(0);
    }

    const saved = redisMock.store.get("room:VR-001");
    expect(saved?.phase).toBe("revealed");
  });

  it("reveals with null stats when there are zero votes", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const p1 = makeUser({ role: "participant", hasVoted: false });
    const room = makeRoom({
      roomId: "VR-002",
      phase: "voting",
      users: [facilitator, p1],
      votes: {},
    });
    room.hostId = facilitator.id;
    redisMock.seed("VR-002", room);

    const observerWs = makeWs();
    addConnection("VR-002", facilitator.id, observerWs);

    const ws = makeWs();
    await handleVoteReveal(ws, "VR-002", facilitator.id);

    const revealed = observerWs.messages().find((m) => m.type === "vote:revealed");
    expect(revealed?.type).toBe("vote:revealed");
    if (revealed?.type === "vote:revealed") {
      expect(revealed.stats).toBeNull();
      expect(revealed.nonVoters).toContain(p1.id);
    }
  });

  it("lists partial non-voters correctly", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const p1 = makeUser({ role: "participant", hasVoted: true });
    const p2 = makeUser({ role: "participant", hasVoted: false });
    const room = makeRoom({
      roomId: "VR-003",
      phase: "voting",
      users: [facilitator, p1, p2],
      votes: { [p1.id]: "8" },
    });
    room.hostId = facilitator.id;
    redisMock.seed("VR-003", room);

    const ws = makeWs();
    addConnection("VR-003", facilitator.id, ws);

    const caller = makeWs();
    await handleVoteReveal(caller, "VR-003", facilitator.id);

    const revealed = ws.messages().find((m) => m.type === "vote:revealed");
    if (revealed?.type === "vote:revealed") {
      expect(revealed.nonVoters).toEqual([p2.id]);
    }
  });

  it("returns null stats when all votes are special cards", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const p1 = makeUser({ role: "participant", hasVoted: true });
    const room = makeRoom({
      roomId: "VR-004",
      phase: "voting",
      users: [facilitator, p1],
      votes: { [p1.id]: "?" },
    });
    room.hostId = facilitator.id;
    redisMock.seed("VR-004", room);

    const observerWs = makeWs();
    addConnection("VR-004", facilitator.id, observerWs);

    const ws = makeWs();
    await handleVoteReveal(ws, "VR-004", facilitator.id);

    const revealed = observerWs.messages().find((m) => m.type === "vote:revealed");
    if (revealed?.type === "vote:revealed") {
      expect(revealed.stats).toBeNull();
    }
  });

  it("rejects non-facilitator with PERMISSION_DENIED", async () => {
    const participant = makeUser({ role: "participant" });
    const room = makeRoom({ roomId: "VR-005", phase: "voting", users: [participant] });
    redisMock.seed("VR-005", room);

    const ws = makeWs();
    await handleVoteReveal(ws, "VR-005", participant.id);

    const err = ws.lastMessage();
    if (err?.type === "error") expect(err.code).toBe("PERMISSION_DENIED");
  });

  it("rejects reveal when phase is waiting", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const room = makeRoom({ roomId: "VR-006", phase: "waiting", users: [facilitator] });
    room.hostId = facilitator.id;
    redisMock.seed("VR-006", room);

    const ws = makeWs();
    await handleVoteReveal(ws, "VR-006", facilitator.id);

    const err = ws.lastMessage();
    if (err?.type === "error") expect(err.code).toBe("INVALID_PHASE");
  });

  it("returns ROOM_NOT_FOUND when room does not exist", async () => {
    const ws = makeWs();
    await handleVoteReveal(ws, "MISSING", "any-user");

    const err = ws.lastMessage();
    if (err?.type === "error") expect(err.code).toBe("ROOM_NOT_FOUND");
  });
});
