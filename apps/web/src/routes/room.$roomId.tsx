import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Badge } from "~/components/ui/badge";
import { Spinner } from "~/components/ui/spinner";
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

  useEffect(() => {
    if (connectionStatus === "disconnected") return;
    if (connectionStatus !== "error") return;
    navigate({ to: "/" });
  }, [connectionStatus, navigate]);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-zinc-900">
          Room <span className="font-mono text-indigo-600">{roomId}</span>
        </h1>
        <div className="flex items-center gap-2">
          {(connectionStatus === "connecting" || connectionStatus === "reconnecting") && (
            <Spinner size="sm" className="text-zinc-500" />
          )}
          <Badge variant={statusVariant[connectionStatus]}>{statusLabel[connectionStatus]}</Badge>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        {!roomState ? (
          <div className="flex flex-col items-center gap-3 text-zinc-400">
            <Spinner size="lg" />
            <p className="text-sm">Joining room…</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-2xl font-bold text-zinc-800 capitalize">{roomState.phase}</p>
            {roomState.taskName && <p className="mt-1 text-zinc-500">{roomState.taskName}</p>}
          </div>
        )}
      </main>
    </div>
  );
}
