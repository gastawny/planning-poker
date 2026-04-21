import { mock } from "bun:test";
import type { RoomState } from "@planning-poker/types";

const store = new Map<string, RoomState>();

export const redisMock = {
  store,
  reset() {
    store.clear();
  },
  seed(roomId: string, state: RoomState) {
    store.set(`room:${roomId}`, structuredClone(state));
  },
};

mock.module("@/services/redis", () => ({
  getRoom: async (id: string): Promise<RoomState | null> => {
    const entry = store.get(`room:${id}`);
    return entry ? structuredClone(entry) : null;
  },
  saveRoom: async (id: string, state: RoomState): Promise<void> => {
    store.set(`room:${id}`, structuredClone(state));
  },
  deleteRoom: async (id: string): Promise<void> => {
    store.delete(`room:${id}`);
  },
}));
