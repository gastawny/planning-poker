import { getRoom } from "@/services/redis";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomSegment(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}

export function generateUserId(): string {
  return crypto.randomUUID();
}

export async function generateRoomId(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const id = `${randomSegment(3)}-${randomSegment(3)}`;
    const existing = await getRoom(id);
    if (!existing) return id;
  }
  throw new Error("Failed to generate unique room ID after 10 attempts");
}
