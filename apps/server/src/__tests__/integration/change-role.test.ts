import { beforeEach, describe, expect, it } from "bun:test";
import { handleChangeRole } from "@/handlers/change-role";
import { addConnection } from "@/lib/connections";
import { makeRoom, makeUser } from "../helpers/make-room";
import { makeWs } from "../helpers/make-ws";
import { redisMock } from "../helpers/redis-mock";

beforeEach(() => redisMock.reset());

describe("handleChangeRole", () => {
  it("allows a participant to switch themselves to spectator", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const participant = makeUser({ role: "participant", hasVoted: false });
    const room = makeRoom({
      roomId: "CR-001",
      phase: "waiting",
      users: [facilitator, participant],
    });
    room.hostId = facilitator.id;
    redisMock.seed("CR-001", room);

    const observerWs = makeWs();
    addConnection("CR-001", facilitator.id, observerWs);

    const ws = makeWs();
    await handleChangeRole(
      ws,
      { type: "user:change_role", targetUserId: participant.id, newRole: "spectator" },
      "CR-001",
      participant.id
    );

    const changed = observerWs.messages().find((m) => m.type === "user:role_changed");
    expect(changed).toBeDefined();
    if (changed?.type === "user:role_changed") {
      expect(changed.userId).toBe(participant.id);
      expect(changed.newRole).toBe("spectator");
    }

    const saved = redisMock.store.get("room:CR-001");
    const updatedUser = saved?.users.find((u) => u.id === participant.id);
    expect(updatedUser?.role).toBe("spectator");
  });

  it("clears vote when participant becomes spectator", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const participant = makeUser({ role: "participant", hasVoted: true });
    const room = makeRoom({
      roomId: "CR-002",
      phase: "voting",
      users: [facilitator, participant],
      votes: { [participant.id]: "5" },
    });
    room.hostId = facilitator.id;
    redisMock.seed("CR-002", room);

    const ws = makeWs();
    await handleChangeRole(
      ws,
      { type: "user:change_role", targetUserId: participant.id, newRole: "spectator" },
      "CR-002",
      participant.id
    );

    const saved = redisMock.store.get("room:CR-002");
    expect(saved?.votes[participant.id]).toBeUndefined();
    expect(saved?.users.find((u) => u.id === participant.id)?.hasVoted).toBe(false);
  });

  it("sets hasVoted=false when spectator joins as participant during voting", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const spectator = makeUser({ role: "spectator" });
    const room = makeRoom({
      roomId: "CR-003",
      phase: "voting",
      users: [facilitator, spectator],
    });
    room.hostId = facilitator.id;
    redisMock.seed("CR-003", room);

    const ws = makeWs();
    await handleChangeRole(
      ws,
      { type: "user:change_role", targetUserId: spectator.id, newRole: "participant" },
      "CR-003",
      spectator.id
    );

    const saved = redisMock.store.get("room:CR-003");
    const updatedUser = saved?.users.find((u) => u.id === spectator.id);
    expect(updatedUser?.role).toBe("participant");
    expect(updatedUser?.hasVoted).toBe(false);
  });

  it("allows facilitator to change another user's role", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const participant = makeUser({ role: "participant" });
    const room = makeRoom({
      roomId: "CR-004",
      users: [facilitator, participant],
    });
    room.hostId = facilitator.id;
    redisMock.seed("CR-004", room);

    const ws = makeWs();
    await handleChangeRole(
      ws,
      { type: "user:change_role", targetUserId: participant.id, newRole: "spectator" },
      "CR-004",
      facilitator.id
    );

    const saved = redisMock.store.get("room:CR-004");
    expect(saved?.users.find((u) => u.id === participant.id)?.role).toBe("spectator");
  });

  it("rejects non-facilitator changing another user's role", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const p1 = makeUser({ role: "participant" });
    const p2 = makeUser({ role: "participant" });
    const room = makeRoom({ roomId: "CR-005", users: [facilitator, p1, p2] });
    room.hostId = facilitator.id;
    redisMock.seed("CR-005", room);

    const ws = makeWs();
    await handleChangeRole(
      ws,
      { type: "user:change_role", targetUserId: p2.id, newRole: "spectator" },
      "CR-005",
      p1.id
    );

    const err = ws.lastMessage();
    if (err?.type === "error") expect(err.code).toBe("PERMISSION_DENIED");
  });

  it("rejects changing the facilitator's role", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const participant = makeUser({ role: "participant" });
    const room = makeRoom({ roomId: "CR-006", users: [facilitator, participant] });
    room.hostId = facilitator.id;
    redisMock.seed("CR-006", room);

    const ws = makeWs();
    await handleChangeRole(
      ws,
      { type: "user:change_role", targetUserId: facilitator.id, newRole: "spectator" },
      "CR-006",
      facilitator.id
    );

    const err = ws.lastMessage();
    if (err?.type === "error") expect(err.code).toBe("PERMISSION_DENIED");
  });

  it("emits vote:all_voted when last non-voter switches to spectator", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const p1 = makeUser({ role: "participant", hasVoted: true });
    const p2 = makeUser({ role: "participant", hasVoted: false });
    const room = makeRoom({
      roomId: "CR-007",
      phase: "voting",
      users: [facilitator, p1, p2],
      votes: { [p1.id]: "5" },
    });
    room.hostId = facilitator.id;
    redisMock.seed("CR-007", room);

    const observerWs = makeWs();
    addConnection("CR-007", facilitator.id, observerWs);

    const ws = makeWs();
    await handleChangeRole(
      ws,
      { type: "user:change_role", targetUserId: p2.id, newRole: "spectator" },
      "CR-007",
      p2.id
    );

    const allVoted = observerWs.messages().find((m) => m.type === "vote:all_voted");
    expect(allVoted).toBeDefined();
  });

  it("rejects missing targetUserId", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const room = makeRoom({ roomId: "CR-008", users: [facilitator] });
    room.hostId = facilitator.id;
    redisMock.seed("CR-008", room);

    const ws = makeWs();
    await handleChangeRole(
      ws,
      { type: "user:change_role", targetUserId: "", newRole: "spectator" },
      "CR-008",
      facilitator.id
    );

    const err = ws.lastMessage();
    if (err?.type === "error") expect(err.code).toBe("INVALID_PAYLOAD");
  });

  it("rejects invalid newRole", async () => {
    const facilitator = makeUser({ role: "facilitator" });
    const participant = makeUser({ role: "participant" });
    const room = makeRoom({ roomId: "CR-009", users: [facilitator, participant] });
    room.hostId = facilitator.id;
    redisMock.seed("CR-009", room);

    const ws = makeWs();
    await handleChangeRole(
      ws,
      {
        type: "user:change_role",
        targetUserId: participant.id,
        newRole: "facilitator" as "participant",
      },
      "CR-009",
      facilitator.id
    );

    const err = ws.lastMessage();
    if (err?.type === "error") expect(err.code).toBe("INVALID_PAYLOAD");
  });
});
