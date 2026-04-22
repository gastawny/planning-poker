FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY apps/e2e/package.json ./apps/e2e/

RUN bun install --frozen-lockfile

COPY packages/types/ ./packages/types/
COPY apps/web/ ./apps/web/

ARG VITE_API_URL=http://localhost:3001
ARG VITE_APP_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_URL=$VITE_APP_URL

WORKDIR /app/apps/web
RUN bun run build

FROM oven/bun:1.2-alpine
WORKDIR /app/apps/web

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages /app/packages
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/apps/web/dist ./dist

EXPOSE 3000
CMD ["bun", "dist/server/server.js"]
