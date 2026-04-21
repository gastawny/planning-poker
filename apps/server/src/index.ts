import { app } from "@/app";
import { env } from "@/env";

app.listen(env.port);

console.log(`Server running at http://${app.server?.hostname}:${app.server?.port}`);
