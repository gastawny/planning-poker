import type { ClientEvent, RoundPhase, UserRole } from "@planning-poker/types";
import { Button } from "~/components/ui/button";

interface CardDeckProps {
  scale: string[];
  specialCards: string[];
  phase: RoundPhase;
  myRole: UserRole;
  selectedVote: string | null;
  send: (event: ClientEvent) => void;
  setSelectedVote: (value: string | null) => void;
}

export function CardDeck({
  scale,
  specialCards,
  phase,
  myRole,
  selectedVote,
  send,
  setSelectedVote,
}: CardDeckProps) {
  const isDisabled = phase !== "voting" || myRole === "spectator";
  const allCards = [...scale, ...specialCards];

  function handleCardClick(value: string) {
    if (selectedVote !== null) {
      send({ type: "vote:retract" });
    }
    send({ type: "vote:submit", value });
    setSelectedVote(value);
  }

  function handleRetract() {
    send({ type: "vote:retract" });
    setSelectedVote(null);
  }

  return (
    <div className="flex flex-col items-center gap-4" data-testid="card-deck">
      <div className={isDisabled ? "pointer-events-none opacity-50" : ""}>
        <div className="flex flex-wrap gap-3 justify-center">
          {allCards.map((value) => {
            const isSelected = selectedVote === value;
            return (
              <button
                key={value}
                type="button"
                data-testid={`card-${value}`}
                onClick={() => handleCardClick(value)}
                className={`relative w-14 h-20 rounded-lg border-2 flex items-center justify-center text-lg font-bold transition-all duration-200 select-none card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected
                    ? "border-[oklch(0.78_0.14_85)] bg-white glow-gold"
                    : "border-border bg-[oklch(0.97_0.01_255)] hover:border-[oklch(0.78_0.14_85_/_60%)] cursor-pointer"
                }`}
                style={{ color: isSelected ? 'oklch(0.09 0.015 255)' : 'oklch(0.15 0.02 255)' }}
              >
                {/* Top-left corner value */}
                <span className="absolute top-1 left-1.5 text-[0.55rem] font-bold leading-none opacity-70">
                  {value}
                </span>
                {/* Center value */}
                <span className="text-lg font-bold">{value}</span>
                {/* Bottom-right corner value (rotated) */}
                <span className="absolute bottom-1 right-1.5 text-[0.55rem] font-bold leading-none opacity-70 rotate-180">
                  {value}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleRetract}
        className={selectedVote === null ? "invisible" : ""}
      >
        Retract vote
      </Button>
    </div>
  );
}
