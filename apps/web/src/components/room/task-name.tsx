import type { RoundPhase } from "@planning-poker/types";

interface TaskNameProps {
  taskName: string | null;
  phase: RoundPhase;
  isFacilitator: boolean;
  value: string;
  onChange: (value: string) => void;
}

export function TaskName({ taskName, phase, isFacilitator, value, onChange }: TaskNameProps) {
  const canEdit = isFacilitator && (phase === "waiting" || phase === "revealed");

  if (canEdit) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Task name (optional)"
        maxLength={100}
        aria-label="Task name"
        className="text-sm text-zinc-600 bg-transparent border-b border-dashed border-zinc-300 focus:border-indigo-500 focus:outline-none placeholder:text-zinc-400 min-w-0 w-48"
      />
    );
  }

  if (!taskName) return null;

  return (
    <span className="text-sm text-zinc-600 truncate max-w-xs" title={taskName}>
      {taskName}
    </span>
  );
}
