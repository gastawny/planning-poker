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
        className="text-sm text-muted-foreground bg-transparent border-b border-dashed border-[oklch(1_0_0_/_15%)] focus:border-[oklch(0.78_0.14_85_/_60%)] focus:outline-none placeholder:text-muted-foreground/50 min-w-0 w-48"
      />
    );
  }

  if (!taskName) return null;

  return (
    <span className="text-sm text-muted-foreground truncate max-w-xs" title={taskName}>
      {taskName}
    </span>
  );
}
