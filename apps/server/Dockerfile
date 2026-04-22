FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/types/package.json ./packages/types/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY apps/e2e/package.json ./apps/e2e/

RUN bun install --frozen-lockfile

COPY packages/types/ ./packages/types/
COPY apps/server/ ./apps/server/

FROM oven/bun:1.2-alpine
WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/server ./apps/server

WORKDIR /app/apps/server
EXPOSE 3001
CMD ["bun", "src/index.ts"]
