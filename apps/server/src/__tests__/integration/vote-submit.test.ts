import { beforeEach, describe, expect, it } from "bun:test";
import { handleVoteSubmit } from "@/handlers/vote-submit";
import { addConnection } from "@/lib/connections";
import { makeRoom, makeUser } from "../helpers/make-room";
import { makeWs } from "../helpers/make-ws";
import { redisMock } from "../helpers/redis-mock";

beforeEach(() => redisMock.reset());

function setupVotingRoom(roomId: string) {
  const participant = makeUser({ role: "participant", hasVoted: false });
  const facilitator = makeUser({ role: "facilitator" });
  const room = makeRoom({
    roomId,
    phase: "voting",
    users: [facilitator, participant],
  });
  room.hostId = facilitator.id;
  redisMock.seed(roomId, room);
  return { room, participantId: participant.id, facilitatorId: facilitator.id };
}

describe("handleVoteSubmit", () => {
  it("stores vote and broadcasts progress", async () => {
    const { participantId } = setupVotingRoom("VS-001");
    const ws = makeWs();
    const spectatorWs = makeWs();
    addConnection("VS-001", participantId, spectatorWs);

    await handleVoteSubmit(ws, { type: "vote:submit", value: "5" }, "VS-001", participantId);

    const saved = await redisMock.store.get("room:VS-001");
    expect(saved?.votes[participantId]).toBe("5");

    const progress = spectatorWs.messages().find((m) => m.type === "vote:progress");
    expect(progress).toBeDefined();
    if (progress?.type === "vote:progress") {
      expect(progress.votesCount).toBe(1);
      expect(progress.participantsCount).toBe(1);
    }
  });

  it("broadcasts vote:all_voted when all participants have voted", async () => {
    const p1 = makeUser({ role: "participant", hasVoted: false });
    const p2 = makeUser({ role: "participant", hasVoted: true });
    const facilitator = makeUser({ role: "facilitator" });
    const room = makeRoom({
      roomId: "VS-002",
      phase: "voting",
      users: [facilitator, p1, p2],
      votes: { [p2.id]: "3" },
    });
    room.hostId = facilitator.id;
    redisMock.seed("VS-002", room);

    const observerWs = makeWs();
    addConnection("VS-002", facilitator.id, observerWs);

    const ws = makeWs();
    await handleVoteSubmit(ws, { type: "vote:submit", value: "5" }, "VS-002", p1.id);

    const allVoted = observerWs.messages().find((m) => m.type === "vote:all_voted");
    expect(allVoted).toBeDefined();
  });

  it("rejects spectator vote with PERMISSION_DENIED", async () => {
    const spectator = makeUser({ role: "spectator" });
    const room = makeRoom({ roomId: "VS-003", phase: "voting", users: [spectator] });
    redisMock.seed("VS-003", room);

    const ws = makeWs();
    await handleVoteSubmit(ws, { type: "vote:submit", value: "5" }, "VS-003", spectator.id);

    const err = ws.lastMessage();
    expect(err?.type).toBe("error");
    if (err?.type === "error") expect(err.code).toBe("PERMISSION_DENIED");
  });

  it("rejects facilitator vote with PERMISSION_DENIED", async () => {
    const { facilitatorId } = setupVotingRoom("VS-004");
    const ws = makeWs();
    await handleVoteSubmit(ws, { type: "vote:submit", value: "5" }, "VS-004", facilitatorId);

    const err = ws.lastMessage();
    expect(err?.type).toBe("error");
    if (err?.type === "error") expect(err.code).toBe("PERMISSION_DENIED");
  });

  it("rejects value not in scale", async () => {
    const { participantId } = setupVotingRoom("VS-005");
    const ws = makeWs();
    await handleVoteSubmit(ws, { type: "vote:submit", value: "999" }, "VS-005", participantId);

    const err = ws.lastMessage();
    if (err?.type === "error") expect(err.code).toBe("INVALID_PAYLOAD");
  });

  it("accepts special card as a valid vote", async () => {
    const { participantId } = setupVotingRoom("VS-006");
    const ws = makeWs();
    await handleVoteSubmit(ws, { type: "vote:submit", value: "?" }, "VS-006", participantId);

    const saved = redisMock.store.get("room:VS-006");
    expect(saved?.votes[participantId]).toBe("?");
  });

  it("rejects vote when phase is waiting", async () => {
    const participant = makeUser({ role: "participant" });
    const room = makeRoom({ roomId: "VS-007", phase: "waiting", users: [participant] });
    redisMock.seed("VS-007", room);

    const ws = makeWs();
    await handleVoteSubmit(ws, { type: "vote:submit", value: "5" }, "VS-007", participant.id);

    const err = ws.lastMessage();
    if (err?.type === "error") expect(err.code).toBe("INVALID_PHASE");
  });

  it("rejects vote when phase is revealed", async () => {
    const participant = makeUser({ role: "participant" });
    const room = makeRoom({ roomId: "VS-008", phase: "revealed", users: [participant] });
    redisMock.seed("VS-008", room);

    const ws = makeWs();
    await handleVoteSubmit(ws, { type: "vote:submit", value: "5" }, "VS-008", participant.id);

    const err = ws.lastMessage();
    if (err?.type === "error") expect(err.code).toBe("INVALID_PHASE");
  });

  it("returns ROOM_NOT_FOUND when room does not exist", async () => {
    const ws = makeWs();
    await handleVoteSubmit(ws, { type: "vote:submit", value: "5" }, "MISSING", "any-user");

    const err = ws.lastMessage();
    if (err?.type === "error") expect(err.code).toBe("ROOM_NOT_FOUND");
  });
});
