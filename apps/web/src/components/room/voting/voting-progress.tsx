import type { RoomUser } from "@planning-poker/types";

interface VotingProgressProps {
  users: RoomUser[];
}

export function VotingProgress({ users }: VotingProgressProps) {
  const participants = users.filter((u) => u.role === "participant" && u.online !== false);
  const voted = participants.filter((u) => u.hasVoted).length;
  const total = participants.length;
  const pct = total > 0 ? (voted / total) * 100 : 0;

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Votes cast</span>
        <span className="tabular-nums">
          <span className="text-foreground font-semibold">{voted}</span>
          <span className="text-muted-foreground"> / {total}</span>
        </span>
      </div>
      <div className="h-1.5 bg-[oklch(1_0_0_/_8%)] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[oklch(0.65_0.12_85)] to-[oklch(0.78_0.14_85)] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
