import type { ClientEvent, RoundPhase } from "@planning-poker/types";
import { Button } from "~/components/ui/button";

interface FacilitatorPanelProps {
  phase: RoundPhase;
  taskName: string;
  send: (event: ClientEvent) => void;
}

export function FacilitatorPanel({ phase, taskName, send }: FacilitatorPanelProps) {
  if (phase === "waiting") {
    return (
      <div className="flex justify-center">
        <Button
          variant="primary"
          size="lg"
          onClick={() => send({ type: "round:start", taskName: taskName || undefined })}
        >
          Start voting
        </Button>
      </div>
    );
  }

  if (phase === "voting") {
    return (
      <div className="flex justify-center gap-3">
        <Button variant="primary" onClick={() => send({ type: "vote:reveal" })}>
          Reveal cards
        </Button>
        <Button variant="destructive" onClick={() => send({ type: "round:reset" })}>
          Cancel round
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <Button
        variant="primary"
        size="lg"
        onClick={() => send({ type: "round:start", taskName: taskName || undefined })}
      >
        New round
      </Button>
    </div>
  );
}
