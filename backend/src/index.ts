import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { env } from "./env.js";

const app = createApp();

serve({
  fetch: app.fetch,
  port: env.PORT,
});

console.log(`Backend listening on http://localhost:${env.PORT}`);
