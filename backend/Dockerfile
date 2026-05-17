FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /app

# ---- dependencies ----
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend ./backend

RUN pnpm install --frozen-lockfile

# ---- build ----
FROM deps AS build

RUN pnpm --filter backend build

# ---- production ----
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@10.12.4 --activate

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/node_modules ./backend/node_modules

EXPOSE 3001

USER node

CMD ["node", "backend/dist/index.js"]