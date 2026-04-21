import type { RoomUser } from "@planning-poker/types";
import { Progress } from "~/components/ui/progress";

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
      <p className="text-sm text-muted-foreground text-center">
        <span className="font-semibold text-foreground">{voted}</span> out of{" "}
        <span className="font-semibold text-foreground">{total}</span> participants have voted
      </p>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
