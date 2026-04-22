import type { RoomUser, VoteStats } from "@planning-poker/types";
import { useEffect, useState } from "react";

interface ResultsPanelProps {
  users: RoomUser[];
  votes: Record<string, string>;
  stats: VoteStats | null;
  nonVoters: string[];
}

export function ResultsPanel({ users, votes, stats, nonVoters }: ResultsPanelProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const voterEntries = Object.entries(votes);

  const nonVoterNames = nonVoters
    .map((id) => users.find((u) => u.id === id)?.name)
    .filter(Boolean) as string[];

  function getHighlightClasses(value: string) {
    const num = Number(value);
    const isNumeric = Number.isFinite(num);
    const isMode = stats?.mode.includes(value) ?? false;
    const isMin = isNumeric && stats !== null && num === stats.min;
    const isMax = isNumeric && stats !== null && num === stats.max;
    const isHighest = isMax && !isMin;
    const isLowest = isMin && !isMax;

    const classes: string[] = ["bg-[oklch(0.97_0.01_255)] border-[oklch(0.7_0.01_255)]"];
    if (isMode) classes.push("ring-2 ring-[oklch(0.78_0.14_85)] ring-offset-1 ring-offset-[oklch(0.14_0.015_255)]");
    if (isHighest) classes.push("border-[oklch(0.65_0.2_25_/_60%)]");
    else if (isLowest) classes.push("border-[oklch(0.65_0.15_200_/_60%)]");
    return classes.join(" ");
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {voterEntries.length > 0 && (
        <div className="flex flex-col items-center gap-3 w-full">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Votes</p>
          <div className="flex flex-wrap gap-4 justify-center">
            {voterEntries.map(([userId, value], index) => {
              const user = users.find((u) => u.id === userId);
              return (
                <div key={userId} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-14 h-20 rounded-lg border-2 flex items-center justify-center text-lg font-bold shadow-sm ${getHighlightClasses(value)} ${revealed ? "animate-card-flip" : ""}`}
                    style={revealed ? { animationDelay: `${index * 60}ms`, color: 'oklch(0.15 0.02 255)' } : { color: 'oklch(0.15 0.02 255)' }}
                  >
                    {value}
                  </div>
                  <span className="text-xs text-muted-foreground max-w-[3.5rem] truncate text-center">
                    {user?.name ?? "Unknown"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats !== null && (
        <div
          data-testid="stats-panel"
          className="flex items-center gap-6 text-sm"
        >
          {[
            { label: 'Mean', value: stats.mean.toFixed(1) },
            { label: 'Mode', value: stats.mode.join(', ') },
            { label: 'Min', value: String(stats.min) },
            { label: 'Max', value: String(stats.max) },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              <span className="text-xl font-bold text-[oklch(0.78_0.14_85)]">{stat.value}</span>
            </div>
          ))}
        </div>
      )}

      {nonVoterNames.length > 0 && (
        <p className="text-sm text-muted-foreground italic">Did not vote: {nonVoterNames.join(", ")}</p>
      )}
    </div>
  );
}
