import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SettingsIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { JoinModal } from "~/components/room/join-modal";
import { ScaleConfigModal } from "~/components/room/scale-config-modal";
import { TaskName } from "~/components/room/task-name";
import { UserList } from "~/components/room/user-list";
import { VotingArea } from "~/components/room/voting/voting-area";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { env } from "~/env";
import { useRoomSocket } from "~/hooks/use-room-socket";
import type { ConnectionStatus } from "~/store/room-store";
import { useRoomStore } from "~/store/room-store";

export const Route = createFileRoute("/room/$roomId")({
  component: RoomPage,
});

const statusLabel: Record<ConnectionStatus, string> = {
  connecting: "Connecting…",
  connected: "Connected",
  reconnecting: "Reconnecting…",
  disconnected: "Disconnected",
  error: "Connection failed",
};

const statusVariant: Record<ConnectionStatus, "default" | "success" | "warning" | "destructive"> = {
  connecting: "default",
  connected: "success",
  reconnecting: "warning",
  disconnected: "default",
  error: "destructive",
};

function RoomPage() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const { send, connectionStatus } = useRoomSocket(roomId);

  const roomState = useRoomStore((s) => s.roomState);
  const myUserId = useRoomStore((s) => s.userId);
  const setOnAllVoted = useRoomStore((s) => s.setOnAllVoted);
  const setOnScaleUpdated = useRoomStore((s) => s.setOnScaleUpdated);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [taskNameInput, setTaskNameInput] = useState("");
  const joinSentRef = useRef(false);

  const myUser = roomState?.users.find((u) => u.id === myUserId) ?? null;
  const isFacilitator = myUser?.role === "facilitator";

  useEffect(() => {
    if (taskNameInput === "" && roomState?.taskName) {
      setTaskNameInput(roomState.taskName);
    }
  }, [roomState?.taskName, taskNameInput]);

  useEffect(() => {
    if (connectionStatus === "error") {
      navigate({ to: "/" });
      toast.error("Could not connect to room. It may no longer exist.");
    }
  }, [connectionStatus, navigate]);

  useEffect(() => {
    setOnAllVoted(() => toast.info("Everyone has voted!"));
    return () => setOnAllVoted(null);
  }, [setOnAllVoted]);

  useEffect(() => {
    setOnScaleUpdated((votesCleared) => {
      if (votesCleared) toast.info("Scale changed — votes have been cleared.");
    });
    return () => setOnScaleUpdated(null);
  }, [setOnScaleUpdated]);

  const doJoin = useCallback(
    (name: string, role: "participant" | "spectator") => {
      const hostId = sessionStorage.getItem("hostId") ?? undefined;
      send({ type: "room:join", name, role, hostId });
    },
    [send]
  );

  useEffect(() => {
    if (connectionStatus !== "connected") return;
    if (roomState) return;
    if (joinSentRef.current) return;

    const name = sessionStorage.getItem("userName");
    const storedRole = sessionStorage.getItem("userRole");
    const role: "participant" | "spectator" =
      storedRole === "spectator" ? "spectator" : "participant";

    if (name) {
      joinSentRef.current = true;
      doJoin(name, role);
    } else {
      setShowJoinModal(true);
    }
  }, [connectionStatus, roomState, doJoin]);

  useEffect(() => {
    if (connectionStatus === "connected" && !roomState) {
      joinSentRef.current = false;
    }
  }, [connectionStatus, roomState]);

  function handleModalJoin(name: string, role: "participant" | "spectator") {
    sessionStorage.setItem("userName", name);
    sessionStorage.setItem("userRole", role);
    joinSentRef.current = true;
    setShowJoinModal(false);
    doJoin(name, role);
  }

  function handleCopyInvite() {
    const url = `${env.appUrl}/room/${roomId}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Invite link copied!"));
  }

  function handleChangeRole(targetUserId: string, newRole: "participant" | "spectator") {
    if (targetUserId === myUserId) {
      const currentUser = roomState?.users.find((u) => u.id === myUserId);
      if (currentUser) {
        useRoomStore.getState().handleUserRoleChanged(targetUserId, newRole);
      }
    }
    send({ type: "user:change_role", targetUserId, newRole });
  }

  function handleKick(targetUserId: string) {
    send({ type: "room:kick", targetUserId });
  }

  const isLoading =
    connectionStatus === "connecting" ||
    connectionStatus === "reconnecting" ||
    (connectionStatus === "connected" && !roomState);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showJoinModal && <JoinModal onJoin={handleModalJoin} />}
      {showScaleModal && roomState && (
        <ScaleConfigModal
          phase={roomState.phase}
          currentScale={roomState.scale}
          currentSpecialCards={roomState.specialCards}
          send={send}
          onClose={() => setShowScaleModal(false)}
        />
      )}

      <header className="bg-card border-b border-border px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-base font-semibold text-foreground flex-shrink-0">
            Room <span className="font-mono text-primary">{roomId}</span>
          </h1>
          {roomState && (
            <>
              <Badge variant="default" className="flex-shrink-0 capitalize">
                {roomState.phase}
              </Badge>
              <TaskName
                taskName={roomState.taskName}
                phase={roomState.phase}
                isFacilitator={isFacilitator}
                value={taskNameInput}
                onChange={setTaskNameInput}
              />
            </>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {isFacilitator && roomState && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowScaleModal(true)}
                    aria-label="Configure scale"
                  />
                }
              >
                <SettingsIcon className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Configure scale</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger
              render={<Button variant="ghost" size="sm" onClick={handleCopyInvite} />}
            >
              Copy invite link
            </TooltipTrigger>
            <TooltipContent>Copy room link to clipboard</TooltipContent>
          </Tooltip>
          {(connectionStatus === "connecting" || connectionStatus === "reconnecting") && (
            <Spinner className="size-4 text-muted-foreground" />
          )}
          <Badge variant={statusVariant[connectionStatus]}>{statusLabel[connectionStatus]}</Badge>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 flex-shrink-0 bg-card border-r border-border overflow-y-auto p-4">
          {roomState && myUserId ? (
            <UserList
              users={roomState.users}
              hostId={roomState.hostId}
              myUserId={myUserId}
              phase={roomState.phase}
              isFacilitator={isFacilitator}
              onChangeRole={handleChangeRole}
              onKick={handleKick}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center mt-8">Loading members…</p>
          )}
        </aside>

        <main className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Spinner className="size-8" />
              <p className="text-sm">Joining room…</p>
            </div>
          ) : roomState && myUser ? (
            <VotingArea
              roomState={roomState}
              myUser={myUser}
              isFacilitator={isFacilitator}
              taskName={taskNameInput}
              send={send}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
