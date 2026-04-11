import { env } from "@/env";
import type { RoomState } from "@planning-poker/types";
import Redis from "ioredis";

const redis = new Redis(env.redisUrl);

let isReady = false;

redis.on("ready", () => {
  isReady = true;
});

redis.on("error", (err: Error) => {
  console.error("Redis error:", err.message);
  if (!isReady) {
    process.exit(1);
  }
});

export async function getRoom(roomId: string): Promise<RoomState | null> {
  const data = await redis.get(`room:${roomId}`);
  if (!data) return null;
  return JSON.parse(data) as RoomState;
}

export async function saveRoom(roomId: string, state: RoomState): Promise<void> {
  await redis.set(`room:${roomId}`, JSON.stringify(state), "EX", env.roomTtlSeconds);
}

export async function deleteRoom(roomId: string): Promise<void> {
  await redis.del(`room:${roomId}`);
}
