import { describe, expect, it } from "bun:test";
import { checkAllVoted, computeVoteStats } from "@/lib/voting";
import { makeRoom, makeUser } from "../helpers/make-room";

describe("checkAllVoted", () => {
  it("returns true when all participants have voted", () => {
    const room = makeRoom({
      users: [
        makeUser({ role: "facilitator", hasVoted: false }),
        makeUser({ role: "participant", hasVoted: true }),
        makeUser({ role: "participant", hasVoted: true }),
      ],
    });
    expect(checkAllVoted(room)).toBe(true);
  });

  it("returns false when no participants have voted", () => {
    const room = makeRoom({
      users: [
        makeUser({ role: "facilitator", hasVoted: false }),
        makeUser({ role: "participant", hasVoted: false }),
        makeUser({ role: "participant", hasVoted: false }),
      ],
    });
    expect(checkAllVoted(room)).toBe(false);
  });

  it("ignores spectators — returns true if the only participant voted", () => {
    const room = makeRoom({
      users: [
        makeUser({ role: "facilitator", hasVoted: false }),
        makeUser({ role: "participant", hasVoted: true }),
        makeUser({ role: "spectator", hasVoted: false }),
        makeUser({ role: "spectator", hasVoted: false }),
      ],
    });
    expect(checkAllVoted(room)).toBe(true);
  });

  it("returns false when no participants exist at all", () => {
    const room = makeRoom({
      users: [
        makeUser({ role: "facilitator", hasVoted: false }),
        makeUser({ role: "spectator", hasVoted: false }),
      ],
    });
    expect(checkAllVoted(room)).toBe(false);
  });

  it("returns false when room is empty", () => {
    const room = makeRoom({ users: [] });
    expect(checkAllVoted(room)).toBe(false);
  });

  it("returns false when 1 of 2 participants has voted", () => {
    const room = makeRoom({
      users: [
        makeUser({ role: "participant", hasVoted: true }),
        makeUser({ role: "participant", hasVoted: false }),
      ],
    });
    expect(checkAllVoted(room)).toBe(false);
  });
});

describe("computeVoteStats", () => {
  it("returns correct stats for identical votes", () => {
    const stats = computeVoteStats({ a: "5", b: "5", c: "5" });
    expect(stats).toEqual({ mean: 5, mode: ["5"], min: 5, max: 5 });
  });

  it("returns correct stats for varied votes", () => {
    const stats = computeVoteStats({ a: "1", b: "3", c: "5" });
    expect(stats).toEqual({ mean: 3, mode: ["1", "3", "5"], min: 1, max: 5 });
  });

  it("returns null for only special card votes", () => {
    expect(computeVoteStats({ a: "?", b: "∞" })).toBeNull();
  });

  it("returns null for empty votes object", () => {
    expect(computeVoteStats({})).toBeNull();
  });

  it("returns correct stats for a single vote", () => {
    const stats = computeVoteStats({ a: "8" });
    expect(stats).toEqual({ mean: 8, mode: ["8"], min: 8, max: 8 });
  });

  it("returns multiple modes for multi-modal distribution", () => {
    const stats = computeVoteStats({ a: "3", b: "3", c: "5", d: "5" });
    expect(stats?.mean).toBe(4);
    expect(stats?.mode.sort()).toEqual(["3", "5"]);
    expect(stats?.min).toBe(3);
    expect(stats?.max).toBe(5);
  });

  it("rounds mean to one decimal place", () => {
    const stats = computeVoteStats({ a: "1", b: "2", c: "2" });
    expect(stats?.mean).toBe(1.7);
  });

  it("ignores special cards when computing numeric stats", () => {
    const stats = computeVoteStats({ a: "3", b: "?", c: "5" });
    expect(stats?.mean).toBe(4);
    expect(stats?.min).toBe(3);
    expect(stats?.max).toBe(5);
  });
});
