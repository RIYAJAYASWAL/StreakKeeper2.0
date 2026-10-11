# StreakKeeper Backend

StreakKeeper is a production-ready, habit tracking backend engineered with Next.js App Router, PostgreSQL (Neon Serverless), and Prisma ORM.

## Architecture

- **Domain Layer (`src/server/domain/**`)**: Pure, immutable business logic (streaks, freezes, XP curves, behavioral triggers) with zero database/network IO. 100% unit-tested.
- **Service Layer (`src/server/services/**`)**: Database orchestration, idempotent mutations, Prisma transactions, AI provider integration, and cron task execution.
- **Security & Lib (`src/server/lib/**`)**:
  - `rate-limit.ts`: Per-route in-memory rate limiting with 429 backoff headers.
  - `logger.ts`: Centralized structured logging with recursive secret and token redaction.
  - `api.ts`: Route wrapping, session derivation (`withAuth`), and cron authentication (`withCronAuth`).
  - `prisma.ts`: Singleton client connection.
- **Route Handlers (`app/api/**`)**: Next.js App Router endpoints validated with Zod schemas.

---

## Getting Started & Setup

### 1. Prerequisites
- Node.js (v18.17+ or v20+)
- PostgreSQL (Neon Serverless or local instance)

### 2. Environment Configuration
Create a `.env` file in the root directory based on `.env.example`:

```bash
# Neon Pooled connection (used by Next.js application runtime)
DATABASE_URL="postgresql://user:password@ep-cool-pooler.region.aws.neon.tech/streakkeeper?sslmode=require"

# Neon Direct connection (used by Prisma CLI for migrations)
DIRECT_URL="postgresql://user:password@ep-cool.region.aws.neon.tech/streakkeeper?sslmode=require"

# Authentication secret (minimum 32 characters)
AUTH_SECRET="your-32-char-min-super-secret-key"

# Secured Cron Bearer Secret
CRON_SECRET="your-cron-secret-token"

# AI Provider API Key
AI_API_KEY="sk-your-ai-api-key"

# Node Environment
NODE_ENV="development"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup & Seeding
```bash
# Apply Prisma migrations
npm run db:migrate

# Seed initial test data (users, habits, streaks, check-ins, journals)
npm run db:seed
```

### 5. Running the Application
```bash
# Start Next.js development server
npm run dev

# Run TypeScript type-checking
npm run typecheck

# Run test suite
npm run test
```

---

## Hardening & Security Features

1. **Security Headers**:
   Enforced via `middleware.ts` and `next.config.js`:
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

2. **Per-Route Rate Limiting**:
   - `AUTH` (`/api/auth/register`, `/api/auth/login`): 10 requests / 15 minutes per IP.
   - `CHECKINS` (`POST /api/habits/:id/checkins`): 60 requests / minute per user.
   - `FREEZES` (`POST /api/habits/:id/freeze`): 30 requests / minute per user.
   - `AI_INSIGHTS` (`POST /api/ai/insights`): 10 requests / minute per user + 3 generations/day cap.
   - Returns HTTP `429 Too Many Requests` (`RATE_LIMIT_EXCEEDED`).

3. **Consistent Error Logging Without Secrets**:
   `src/server/lib/logger.ts` redacts sensitive fields before emitting logs:
   - Passwords and `passwordHash`
   - Bearer authorization tokens
   - API keys and secrets (`CRON_SECRET`, `AUTH_SECRET`, `AI_API_KEY`)
   - PostgreSQL connection strings with embedded passwords

4. **Health Check**:
   - `GET /api/health`: Validates server and database connectivity (`SELECT 1`).

---

## Scheduled Cron Jobs

Both cron endpoints are secured with header `Authorization: Bearer <CRON_SECRET>`.

### 1. Hourly Rollover
Processes all users whose local time just passed midnight (`hour === 0`). Unfilled scheduled days from yesterday are marked as `MISSED` and streaks are recomputed. Processed in cursor batches and 100% idempotent.

```bash
curl -X POST http://localhost:3000/api/cron/rollover \
  -H "Authorization: Bearer your-cron-secret-token" \
  -H "Content-Type: application/json"
```

### 2. Monthly Freeze Reset
On the 1st of each month in each user's local timezone, resets streak freeze allowance to `freezesRemaining = 3`. Processed in cursor batches and idempotent.

```bash
curl -X POST http://localhost:3000/api/cron/freeze-reset \
  -H "Authorization: Bearer your-cron-secret-token" \
  -H "Content-Type: application/json"
```

---

## API Reference
For full endpoint documentation, parameters, request bodies, and error formats, see [docs/api.md](docs/api.md).
