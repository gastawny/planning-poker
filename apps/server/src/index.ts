import { env } from "@/env";
import { handleDisconnect } from "@/handlers/on-disconnect";
import { handleRoomJoin } from "@/handlers/room-join";
import { generateRoomId, generateUserId } from "@/lib/ids";
import { getRoom, saveRoom } from "@/services/redis";
import type { ClientEvent, RoomState } from "@planning-poker/types";
import { Elysia } from "elysia";

const DEFAULT_SCALE = ["1", "2", "3", "5", "8", "13", "21"];
const DEFAULT_SPECIAL_CARDS = ["?", "∞"];
const JOIN_TIMEOUT_MS = 10_000;

type ConnectionState = {
  roomId: string;
  userId: string | null;
  joined: boolean;
  joinTimeout: ReturnType<typeof setTimeout> | null;
};

const pendingConnections = new Map<string, ConnectionState>();

const app = new Elysia()
  .get("/health", () => ({ ok: true }))
  .post("/rooms", async ({ body, set }) => {
    const { name } = body as { name?: string };
    if (!name || name.length < 2 || name.length > 30) {
      set.status = 400;
      return { error: "Name must be between 2 and 30 characters" };
    }

    const roomId = await generateRoomId();
    const hostId = generateUserId();

    const state: RoomState = {
      roomId,
      hostId,
      phase: "waiting",
      taskName: null,
      scale: DEFAULT_SCALE,
      specialCards: DEFAULT_SPECIAL_CARDS,
      votes: {},
      users: [],
    };

    await saveRoom(roomId, state);

    return {
      roomId,
      hostId,
      inviteUrl: `${env.publicAppUrl}/room/${roomId}`,
    };
  })
  .get("/rooms/:roomId", async ({ params }) => {
    const room = await getRoom(params.roomId);
    if (!room) return { exists: false };
    return { exists: true, phase: room.phase, userCount: room.users.length };
  })
  .ws("/rooms/:roomId/ws", {
    open(ws) {
      const roomId = ws.data.params.roomId;

      const joinTimeout = setTimeout(() => {
        ws.close(4000, "Join timeout");
        pendingConnections.delete(ws.id);
      }, JOIN_TIMEOUT_MS);

      pendingConnections.set(ws.id, {
        roomId,
        userId: null,
        joined: false,
        joinTimeout,
      });

      getRoom(roomId).then((room) => {
        if (!room) {
          const state = pendingConnections.get(ws.id);
          if (state?.joinTimeout) clearTimeout(state.joinTimeout);
          pendingConnections.delete(ws.id);
          ws.close(4004, "Room not found");
        }
      });
    },

    async message(ws, raw) {
      const state = pendingConnections.get(ws.id);
      if (!state) return;

      let parsed: unknown;
      try {
        parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        return;
      }

      if (!parsed || typeof parsed !== "object" || !("type" in parsed)) return;

      const event = parsed as ClientEvent;

      if (!state.joined && event.type === "room:join") {
        if (state.joinTimeout) clearTimeout(state.joinTimeout);
        state.joinTimeout = null;

        const userId = await handleRoomJoin(ws, event, state.roomId);
        if (userId) {
          state.userId = userId;
          state.joined = true;
        } else {
          pendingConnections.delete(ws.id);
        }
      }
    },

    close(ws) {
      const state = pendingConnections.get(ws.id);
      if (!state) return;

      if (state.joinTimeout) clearTimeout(state.joinTimeout);
      pendingConnections.delete(ws.id);

      if (state.joined && state.userId) {
        handleDisconnect(state.roomId, state.userId);
      }
    },
  })
  .listen(env.port);

console.log(`Server running at http://${app.server?.hostname}:${app.server?.port}`);
