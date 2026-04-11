# Planning Poker

Real-time planning poker estimation tool built with Elysia, TanStack Start, and Redis.

## Stack

- **Backend**: Elysia + Bun + ioredis + WebSockets
- **Frontend**: TanStack Start + React + Tailwind CSS + TanStack Router
- **Shared**: TypeScript (strict), Biome (lint/format)
- **Infrastructure**: Docker, Docker Compose, Redis, GitHub Actions

## Local Setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.1
- [Docker](https://www.docker.com) + Docker Compose

### Install dependencies

```bash
bun install
```

### Start Redis

```bash
docker compose -f docker-compose.dev.yml up -d
```

### Configure environment

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

### Start development servers

```bash
# Server (port 3001)
cd apps/server && bun dev

# Frontend (port 3000) — in a separate terminal
cd apps/web && bun dev
```

### Lint & type-check

```bash
bun run lint         # Biome CI check
bun run typecheck    # tsc --noEmit across all packages
```
