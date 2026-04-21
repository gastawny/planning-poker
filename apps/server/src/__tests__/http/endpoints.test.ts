import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { app } from "@/app";
import { makeRoom } from "../helpers/make-room";
import { redisMock } from "../helpers/redis-mock";

let baseUrl: string;

beforeAll(async () => {
  app.listen(0);
  await new Promise<void>((resolve) => {
    const check = () => {
      if (app.server) return resolve();
      setTimeout(check, 10);
    };
    check();
  });
  const server = app.server;
  if (!server) throw new Error("Server did not start");
  baseUrl = `http://${server.hostname}:${server.port}`;
});

afterAll(() => {
  app.stop();
});

beforeEach(() => redisMock.reset());

describe("POST /rooms", () => {
  it("creates a room with a valid name", async () => {
    const res = await fetch(`${baseUrl}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.roomId).toBeString();
    expect(body.hostId).toBeString();
    expect(body.inviteUrl).toBeString();
  });

  it("rejects name that is too short (422)", async () => {
    const res = await fetch(`${baseUrl}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "A" }),
    });
    expect(res.status).toBe(422);
  });

  it("rejects name that is too long (422)", async () => {
    const res = await fetch(`${baseUrl}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "A".repeat(31) }),
    });
    expect(res.status).toBe(422);
  });

  it("rejects missing body (422)", async () => {
    const res = await fetch(`${baseUrl}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it("rejects non-string name (422)", async () => {
    const res = await fetch(`${baseUrl}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: 42 }),
    });
    expect(res.status).toBe(422);
  });
});

describe("GET /rooms/:roomId", () => {
  it("returns exists: false for unknown room", async () => {
    const res = await fetch(`${baseUrl}/rooms/UNKNOWN`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.exists).toBe(false);
  });

  it("returns room info for existing room", async () => {
    const room = makeRoom({ roomId: "HTTP-001" });
    redisMock.seed("HTTP-001", room);

    const res = await fetch(`${baseUrl}/rooms/HTTP-001`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.exists).toBe(true);
    expect(body.phase).toBe("waiting");
    expect(typeof body.userCount).toBe("number");
  });
});

describe("GET /health", () => {
  it("returns ok: true", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
  });
});
