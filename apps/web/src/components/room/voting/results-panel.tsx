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

  const participants = users.filter((u) => u.role === "participant");
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

    const classes: string[] = [];
    if (isMode) classes.push("ring-2 ring-indigo-500");
    if (isHighest) classes.push("bg-rose-50 border-rose-300");
    else if (isLowest) classes.push("bg-sky-50 border-sky-300");
    else if (!isMode) classes.push("bg-white border-zinc-200");
    return classes.join(" ");
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {voterEntries.length > 0 && (
        <div className="flex flex-col items-center gap-3 w-full">
          <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Votes</p>
          <div className="flex flex-wrap gap-4 justify-center">
            {voterEntries.map(([userId, value], index) => {
              const user = participants.find((u) => u.id === userId);
              return (
                <div key={userId} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-14 h-20 rounded-lg border-2 flex items-center justify-center text-lg font-bold shadow-sm ${getHighlightClasses(value)} ${revealed ? "animate-card-flip" : ""}`}
                    style={revealed ? { animationDelay: `${index * 60}ms` } : undefined}
                  >
                    {value}
                  </div>
                  <span className="text-xs text-zinc-500 max-w-[3.5rem] truncate text-center">
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
          className="flex items-center gap-4 text-sm text-zinc-600 bg-zinc-50 rounded-lg px-5 py-3 border border-zinc-200"
        >
          <dl className="flex items-center gap-1">
            <dt className="text-zinc-400">Mean</dt>
            <dd className="font-semibold text-zinc-800">{stats.mean.toFixed(1)}</dd>
          </dl>
          <span className="text-zinc-300">|</span>
          <dl className="flex items-center gap-1">
            <dt className="text-zinc-400">Mode</dt>
            <dd className="font-semibold text-zinc-800">{stats.mode.join(", ")}</dd>
          </dl>
          <span className="text-zinc-300">|</span>
          <dl className="flex items-center gap-1">
            <dt className="text-zinc-400">Min</dt>
            <dd className="font-semibold text-zinc-800">{stats.min}</dd>
          </dl>
          <span className="text-zinc-300">|</span>
          <dl className="flex items-center gap-1">
            <dt className="text-zinc-400">Max</dt>
            <dd className="font-semibold text-zinc-800">{stats.max}</dd>
          </dl>
        </div>
      )}

      {nonVoterNames.length > 0 && (
        <p className="text-sm text-zinc-400 italic">Did not vote: {nonVoterNames.join(", ")}</p>
      )}
    </div>
  );
}
