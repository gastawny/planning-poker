export const env = {
  port: Number(process.env.PORT ?? 3001),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  roomTtlSeconds: Number(process.env.ROOM_TTL_SECONDS ?? 86400),
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:3000",
} satisfies Record<string, string | number>;
