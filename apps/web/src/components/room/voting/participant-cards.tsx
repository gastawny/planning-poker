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
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
        Other participants
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        {others.map((user) => (
          <div key={user.id} className="flex flex-col items-center gap-1.5">
            {user.hasVoted ? (
              <div
                className="w-12 h-16 rounded-lg shadow-lg border border-[oklch(1_0_0_/_15%)] relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, oklch(0.22 0.06 255) 0%, oklch(0.16 0.04 255) 100%)',
                }}
              >
                {/* Diamond pattern on card back */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, oklch(0.78 0.14 85) 0, oklch(0.78 0.14 85) 1px, transparent 0, transparent 50%)',
                    backgroundSize: '6px 6px',
                  }}
                />
                {/* Center symbol */}
                <div className="absolute inset-0 flex items-center justify-center text-[oklch(0.78_0.14_85)] text-opacity-60 text-lg">
                  ♦
                </div>
              </div>
            ) : (
              <div className="w-12 h-16 rounded-lg border-2 border-dashed border-[oklch(1_0_0_/_12%)]" />
            )}
            <span className="text-xs text-muted-foreground max-w-[3rem] truncate text-center">
              {user.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
