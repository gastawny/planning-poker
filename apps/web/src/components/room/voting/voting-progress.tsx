import type { RoomUser } from "@planning-poker/types";

interface VotingProgressProps {
  users: RoomUser[];
}

export function VotingProgress({ users }: VotingProgressProps) {
  const participants = users.filter((u) => u.role === "participant");
  const voted = participants.filter((u) => u.hasVoted).length;
  const total = participants.length;
  const pct = total > 0 ? (voted / total) * 100 : 0;

  return (
    <div className="w-full flex flex-col gap-2">
      <p className="text-sm text-zinc-600 text-center">
        <span className="font-semibold text-zinc-900">{voted}</span> out of{" "}
        <span className="font-semibold text-zinc-900">{total}</span> participants have voted
      </p>
      <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
