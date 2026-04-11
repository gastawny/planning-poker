import type { RoomState, VoteStats } from "@planning-poker/types";

export function checkAllVoted(room: RoomState): boolean {
  const participants = room.users.filter((u) => u.role === "participant");
  if (participants.length === 0) return false;
  return participants.every((u) => u.hasVoted);
}

export function computeVoteStats(votes: Record<string, string>): VoteStats | null {
  const numericValues = Object.values(votes)
    .map(Number)
    .filter((v) => Number.isFinite(v));

  if (numericValues.length === 0) return null;

  const mean =
    Math.round((numericValues.reduce((a, b) => a + b, 0) / numericValues.length) * 10) / 10;
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);

  const frequency = new Map<number, number>();
  for (const v of numericValues) {
    frequency.set(v, (frequency.get(v) ?? 0) + 1);
  }
  const maxFreq = Math.max(...frequency.values());
  const mode = [...frequency.entries()]
    .filter(([, count]) => count === maxFreq)
    .map(([v]) => String(v));

  return { mean, mode, min, max };
}
