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
    <div className="flex flex-col items-center gap-4">
      <div className={isDisabled ? "pointer-events-none opacity-50" : ""}>
        <div className="flex flex-wrap gap-3 justify-center">
          {allCards.map((value) => {
            const isSelected = selectedVote === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleCardClick(value)}
                className={`w-14 h-20 rounded-lg border-2 flex items-center justify-center text-lg font-bold transition-all duration-150 select-none ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-500 text-indigo-700"
                    : "border-zinc-200 bg-white hover:border-indigo-400 hover:shadow-md cursor-pointer text-zinc-800"
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>

      {selectedVote !== null && (
        <Button variant="ghost" size="sm" onClick={handleRetract}>
          Retract vote
        </Button>
      )}
    </div>
  );
}
