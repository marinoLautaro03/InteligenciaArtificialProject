FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.12.4 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend ./backend

RUN pnpm install --frozen-lockfile

RUN pnpm --filter backend build
RUN pnpm deploy --legacy --filter backend --prod /prod/backend

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /prod/backend ./

EXPOSE 3001

USER node

CMD ["node", "dist/index.js"]