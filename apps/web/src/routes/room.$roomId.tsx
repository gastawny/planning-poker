import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { JoinModal } from "~/components/room/join-modal";
import { TaskName } from "~/components/room/task-name";
import { UserList } from "~/components/room/user-list";
import { Badge } from "~/components/ui/badge";
import { Spinner } from "~/components/ui/spinner";
import { useToast } from "~/components/ui/toast";
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
  const { addToast } = useToast();
  const { send, connectionStatus } = useRoomSocket(roomId);

  const roomState = useRoomStore((s) => s.roomState);
  const myUserId = useRoomStore((s) => s.userId);

  const [showJoinModal, setShowJoinModal] = useState(false);
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
      addToast("error", "Could not connect to room. It may no longer exist.");
    }
  }, [connectionStatus, navigate, addToast]);

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
    navigator.clipboard.writeText(url).then(() => addToast("success", "Invite link copied!"));
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
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {showJoinModal && <JoinModal onJoin={handleModalJoin} />}

      <header className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-base font-semibold text-zinc-900 flex-shrink-0">
            Room <span className="font-mono text-indigo-600">{roomId}</span>
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
          <button
            type="button"
            onClick={handleCopyInvite}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          >
            Copy invite link
          </button>
          {(connectionStatus === "connecting" || connectionStatus === "reconnecting") && (
            <Spinner size="sm" className="text-zinc-500" />
          )}
          <Badge variant={statusVariant[connectionStatus]}>{statusLabel[connectionStatus]}</Badge>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 flex-shrink-0 bg-white border-r border-zinc-200 overflow-y-auto p-4">
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
            <p className="text-sm text-zinc-400 text-center mt-8">Loading members…</p>
          )}
        </aside>

        <main className="flex-1 flex items-center justify-center p-6">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-zinc-400">
              <Spinner size="lg" />
              <p className="text-sm">Joining room…</p>
            </div>
          ) : (
            <div className="text-center text-zinc-300">
              <p className="text-4xl mb-2">🂠</p>
              <p className="text-sm">Voting area — coming in M8</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
