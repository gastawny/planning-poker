import type { ClientEvent, RoomState, RoomUser } from "@planning-poker/types";
import { useRoomStore } from "~/store/room-store";
import { CardDeck } from "./card-deck";
import { FacilitatorPanel } from "./facilitator-panel";
import { ParticipantCards } from "./participant-cards";
import { ResultsPanel } from "./results-panel";
import { VotingProgress } from "./voting-progress";

interface VotingAreaProps {
  roomState: RoomState;
  myUser: RoomUser;
  isFacilitator: boolean;
  taskName: string;
  send: (event: ClientEvent) => void;
}

export function VotingArea({ roomState, myUser, isFacilitator, taskName, send }: VotingAreaProps) {
  const selectedVote = useRoomStore((s) => s.selectedVote);
  const setSelectedVote = useRoomStore((s) => s.setSelectedVote);
  const stats = useRoomStore((s) => s.stats);
  const nonVoters = useRoomStore((s) => s.nonVoters);

  const { phase, users, scale, specialCards, votes } = roomState;

  return (
    <div className="w-full max-w-3xl flex flex-col items-center gap-8" data-testid="voting-area">
      {isFacilitator && <FacilitatorPanel phase={phase} taskName={taskName} send={send} />}

      {phase === "voting" && (
        <>
          <VotingProgress users={users} />
          {myUser.role === "participant" && (
            <CardDeck
              scale={scale}
              specialCards={specialCards}
              phase={phase}
              myRole={myUser.role}
              selectedVote={selectedVote}
              send={send}
              setSelectedVote={setSelectedVote}
            />
          )}
          <ParticipantCards users={users} myUserId={myUser.id} />
        </>
      )}

      {phase === "revealed" && (
        <ResultsPanel users={users} votes={votes} stats={stats} nonVoters={nonVoters} />
      )}

      {phase === "waiting" && !isFacilitator && (
        <p className="text-sm text-zinc-400">Waiting for the facilitator to start voting…</p>
      )}
    </div>
  );
}
