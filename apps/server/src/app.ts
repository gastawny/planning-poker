import { env } from "@/env";
import { handleChangeRole } from "@/handlers/change-role";
import { handleKick } from "@/handlers/kick";
import { handleDisconnect } from "@/handlers/on-disconnect";
import { handleRoomJoin } from "@/handlers/room-join";
import { handleRoundReset } from "@/handlers/round-reset";
import { handleRoundStart } from "@/handlers/round-start";
import { handleScaleReset } from "@/handlers/scale-reset";
import { handleScaleUpdate } from "@/handlers/scale-update";
import { handleVoteRetract } from "@/handlers/vote-retract";
import { handleVoteReveal } from "@/handlers/vote-reveal";
import { handleVoteSubmit } from "@/handlers/vote-submit";
import { generateRoomId, generateUserId } from "@/lib/ids";
import { DEFAULT_SCALE, DEFAULT_SPECIAL_CARDS } from "@/lib/scales";
import { getRoom, saveRoom } from "@/services/redis";
import { cors } from "@elysiajs/cors";
import type { ClientEvent, RoomState } from "@planning-poker/types";
import { Elysia, t } from "elysia";

const JOIN_TIMEOUT_MS = 10_000;

type ConnectionState = {
  roomId: string;
  userId: string | null;
  joined: boolean;
  joinTimeout: ReturnType<typeof setTimeout> | null;
};

const pendingConnections = new Map<string, ConnectionState>();

export const app = new Elysia()
  .use(cors({ origin: env.publicAppUrl, credentials: true }))
  .get("/health", () => ({ ok: true }))
  .post(
    "/rooms",
    async ({ body }) => {
      const { name } = body;
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
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2, maxLength: 30 }),
      }),
    }
  )
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
        return;
      }

      if (state.joined && state.userId) {
        switch (event.type) {
          case "user:change_role":
            await handleChangeRole(ws, event, state.roomId, state.userId);
            break;
          case "room:kick":
            await handleKick(ws, event, state.roomId, state.userId);
            break;
          case "round:start":
            await handleRoundStart(ws, event, state.roomId, state.userId);
            break;
          case "vote:submit":
            await handleVoteSubmit(ws, event, state.roomId, state.userId);
            break;
          case "vote:retract":
            await handleVoteRetract(ws, event, state.roomId, state.userId);
            break;
          case "vote:reveal":
            await handleVoteReveal(ws, state.roomId, state.userId);
            break;
          case "round:reset":
            await handleRoundReset(ws, state.roomId, state.userId);
            break;
          case "scale:update":
            await handleScaleUpdate(ws, event, state.roomId, state.userId);
            break;
          case "scale:reset":
            await handleScaleReset(ws, state.roomId, state.userId);
            break;
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
  });
