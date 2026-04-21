import { mock } from "bun:test";
import type { ServerEvent } from "@planning-poker/types";

export interface MockWs {
  send: ReturnType<typeof mock>;
  close: ReturnType<typeof mock>;
  messages(): ServerEvent[];
  lastMessage(): ServerEvent | undefined;
  reset(): void;
}

export function makeWs(): MockWs {
  const sent: string[] = [];

  const sendFn = mock((data: string) => {
    sent.push(data);
  });

  const closeFn = mock((_code?: number, _reason?: string) => {});

  return {
    send: sendFn,
    close: closeFn,
    messages() {
      return sent.map((s) => JSON.parse(s) as ServerEvent);
    },
    lastMessage() {
      const last = sent[sent.length - 1];
      return last ? (JSON.parse(last) as ServerEvent) : undefined;
    },
    reset() {
      sent.length = 0;
      sendFn.mockClear();
      closeFn.mockClear();
    },
  };
}
