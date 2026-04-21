import type { ClientEvent, ServerEvent } from "@planning-poker/types";
import { useCallback, useEffect, useRef } from "react";
import { env } from "~/env";
import { useRoomStore } from "~/store/room-store";

const MAX_RECONNECT_ATTEMPTS = 5;

function wsUrl(roomId: string): string {
  const base = env.apiUrl.replace(/^http/, "ws");
  return `${base}/rooms/${roomId}/ws`;
}

function dispatchServerEvent(event: ServerEvent): void {
  const store = useRoomStore.getState();

  switch (event.type) {
    case "room:joined":
      store.handleRoomJoined(event.state, event.userId);
      break;
    case "room:state":
      store.handleRoomState(event.state);
      break;
    case "user:joined":
      store.handleUserJoined(event.user);
      break;
    case "user:left":
      store.handleUserLeft(event.userId, event.kicked);
      break;
    case "user:role_changed":
      store.handleUserRoleChanged(event.userId, event.newRole);
      break;
    case "vote:progress":
      store.handleVoteProgress(event.userId, event.votesCount, event.participantsCount);
      break;
    case "vote:revealed":
      store.handleVoteRevealed(event.votes, event.stats, event.nonVoters);
      break;
    case "round:started":
      store.handleRoundStarted(event.taskName);
      break;
    case "round:reset":
      store.handleRoundReset();
      break;
    case "scale:updated":
      store.handleScaleUpdated(event.scale, event.specialCards, event.votesCleared);
      break;
    case "vote:all_voted":
    case "error":
      break;
  }
}

export function useRoomSocket(roomId: string) {
  const setConnectionStatus = useRoomStore((s) => s.setConnectionStatus);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    const ws = new WebSocket(wsUrl(roomId));
    wsRef.current = ws;

    if (reconnectAttemptRef.current === 0) {
      setConnectionStatus("connecting");
    } else {
      setConnectionStatus("reconnecting");
    }

    ws.onopen = () => {
      if (unmountedRef.current) {
        ws.close();
        return;
      }
      reconnectAttemptRef.current = 0;
      setConnectionStatus("connected");
    };

    ws.onmessage = (ev) => {
      let parsed: ServerEvent;
      try {
        parsed = JSON.parse(ev.data as string) as ServerEvent;
      } catch {
        return;
      }
      dispatchServerEvent(parsed);
    };

    ws.onclose = (ev) => {
      if (unmountedRef.current) return;

      const isNormal = ev.code === 1000 || ev.code === 1001;
      const isServerError = ev.code >= 4000;

      if (isNormal || isServerError) {
        setConnectionStatus("disconnected");
        return;
      }

      const attempt = reconnectAttemptRef.current;
      if (attempt >= MAX_RECONNECT_ATTEMPTS) {
        setConnectionStatus("error");
        return;
      }

      reconnectAttemptRef.current += 1;
      const delay = 2 ** attempt * 1000;
      setConnectionStatus("reconnecting");
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      if (unmountedRef.current) return;
      if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setConnectionStatus("error");
      }
    };
  }, [roomId, setConnectionStatus]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "component unmounted");
        wsRef.current = null;
      }
      setConnectionStatus("disconnected");
    };
  }, [connect, setConnectionStatus]);

  const send = useCallback((event: ClientEvent) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }, []);

  const connectionStatus = useRoomStore((s) => s.connectionStatus);

  return { send, connectionStatus };
}
