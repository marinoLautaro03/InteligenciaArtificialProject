import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { createAuthenticator } from "./auth/auth.js";
import { env } from "./env.js";

const app = createApp({
  authenticator: createAuthenticator(),
});

serve({
  fetch: app.fetch,
  port: env.PORT,
});

console.log(`Backend listening on http://localhost:${env.PORT}`);
