import { beforeEach, describe, expect, it } from "bun:test";
import { handleChangeRole } from "@/handlers/change-role";
import { handleVoteReveal } from "@/handlers/vote-reveal";
import { addConnection } from "@/lib/connections";
import { makeRoom, makeUser } from "../helpers/make-room";
import { makeWs } from "../helpers/make-ws";
import { redisMock } from "../helpers/redis-mock";

beforeEach(() => redisMock.reset());

describe("voting edge cases", () => {
  it("emits vote:all_voted when last non-voter switches to spectator", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const p1 = makeUser({ role: "participant", hasVoted: true });
    const p2 = makeUser({ role: "participant", hasVoted: false });
    const room = makeRoom({
      roomId: "EC-001",
      phase: "voting",
      users: [facilitator, p1, p2],
      votes: { [p1.id]: "5" },
    });
    room.hostId = facilitator.id;
    redisMock.seed("EC-001", room);

    const facilitatorWs = makeWs();
    addConnection("EC-001", facilitator.id, facilitatorWs);

    const ws = makeWs();
    await handleChangeRole(
      ws,
      { type: "user:change_role", targetUserId: p2.id, newRole: "spectator" },
      "EC-001",
      p2.id
    );

    const allVoted = facilitatorWs.messages().find((m) => m.type === "vote:all_voted");
    expect(allVoted).toBeDefined();
  });

  it("does not emit vote:all_voted when spectator joins as participant during voting", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const p1 = makeUser({ role: "participant", hasVoted: true });
    const spectator = makeUser({ role: "spectator" });
    const room = makeRoom({
      roomId: "EC-002",
      phase: "voting",
      users: [facilitator, p1, spectator],
      votes: { [p1.id]: "8" },
    });
    room.hostId = facilitator.id;
    redisMock.seed("EC-002", room);

    const facilitatorWs = makeWs();
    addConnection("EC-002", facilitator.id, facilitatorWs);

    const ws = makeWs();
    await handleChangeRole(
      ws,
      { type: "user:change_role", targetUserId: spectator.id, newRole: "participant" },
      "EC-002",
      spectator.id
    );

    const allVoted = facilitatorWs.messages().find((m) => m.type === "vote:all_voted");
    expect(allVoted).toBeUndefined();

    const saved = redisMock.store.get("room:EC-002");
    const newParticipant = saved?.users.find((u) => u.id === spectator.id);
    expect(newParticipant?.hasVoted).toBe(false);
  });

  it("returns valid response with null stats when vote:reveal is called with zero votes", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const p1 = makeUser({ role: "participant", hasVoted: false });
    const p2 = makeUser({ role: "participant", hasVoted: false });
    const room = makeRoom({
      roomId: "EC-003",
      phase: "voting",
      users: [facilitator, p1, p2],
      votes: {},
    });
    room.hostId = facilitator.id;
    redisMock.seed("EC-003", room);

    const observerWs = makeWs();
    addConnection("EC-003", facilitator.id, observerWs);

    const ws = makeWs();
    await handleVoteReveal(ws, "EC-003", facilitator.id);

    const revealed = observerWs.messages().find((m) => m.type === "vote:revealed");
    expect(revealed).toBeDefined();

    if (revealed?.type !== "vote:revealed") throw new Error("Expected vote:revealed event");

    expect(revealed.votes).toEqual({});
    expect(revealed.stats).toBeNull();
    expect(revealed.nonVoters.sort()).toEqual([p1.id, p2.id].sort());

    const saved = redisMock.store.get("room:EC-003");
    expect(saved?.phase).toBe("revealed");
  });
});
