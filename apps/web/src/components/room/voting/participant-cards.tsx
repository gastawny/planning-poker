import type { RoomUser } from "@planning-poker/types";

interface ParticipantCardsProps {
  users: RoomUser[];
  myUserId: string;
}

export function ParticipantCards({ users, myUserId }: ParticipantCardsProps) {
  const others = users.filter((u) => u.role === "participant" && u.id !== myUserId);

  if (others.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium">
        Other participants
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        {others.map((user) => (
          <div key={user.id} className="flex flex-col items-center gap-1.5">
            {user.hasVoted ? (
              <div className="w-12 h-16 rounded-lg bg-zinc-700 shadow-sm" />
            ) : (
              <div className="w-12 h-16 rounded-lg border-2 border-dashed border-zinc-300" />
            )}
            <span className="text-xs text-zinc-500 max-w-[3rem] truncate text-center">
              {user.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
