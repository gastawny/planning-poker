import { env } from "@/env";
import { Elysia } from "elysia";

const app = new Elysia()
  .get("/health", () => ({ ok: true }))
  .ws("/ws", {
    open(ws) {
      console.log("WebSocket connected:", ws.id);
    },
    message(_ws, _message) {
      // Room logic implemented in M2
    },
    close(ws) {
      console.log("WebSocket disconnected:", ws.id);
    },
  })
  .listen(env.port);

console.log(`Server running at http://${app.server?.hostname}:${app.server?.port}`);
