# StreakKeeper


**Better habits. A kinder you.**

StreakKeeper is a full-stack habit tracker for daily, weekly and custom habits. When you miss a day you don't have to lose your streak: spend a limited **freeze**, add a short note about what happened, and keep going. Every day is calculated in **your own time zone**, so travel and late nights never unfairly break a streak.

## Features

- **Flexible habits:** daily, weekly (X times per week) or custom (chosen weekdays or every N days).
- **Streak freezes:** restore a missed day with a freeze and a note. Freezes are limited (3 per month by default).
- **Per-user time zones:** each user's "day" starts and ends at midnight in their own IANA time zone.
- **Trigger points:** the dashboard shows what tends to cause misses (late nights, stress, weekends, travel) and where to focus.
- **AI insights:** an AI reads your notes and patterns and suggests small, kind improvements.
- **Groups:** connect with friends and with people who share similar habits.
- **Journals:** read and write journals about habits and progress. Entries can be public or private. Reading at least one journal a day is part of the routine (configurable).
- **Levels and leaderboard:** earn XP, level up and compare streaks on a global leaderboard.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router), TypeScript (strict) |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Styling | Tailwind CSS |
| Auth | Auth.js (email + password, Google) |
| Validation | Zod |
| Dates | date-fns, date-fns-tz |
| Charts | Recharts |
| Data fetching | TanStack Query |
| Testing | Vitest |

## Getting started

### Prerequisites

- Node.js 20 or newer
- A PostgreSQL database (a free [Neon](https://neon.tech) project works well)

### Install

```bash
git clone <your-repo-url>
cd streakkeeper
npm install
cp .env.example .env
```

### Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string (host contains `-pooler`), with `?sslmode=require`. Used by the app. |
| `DIRECT_URL` | Neon **direct** connection string, with `?sslmode=require`. Used by Prisma migrations. |
| `AUTH_SECRET` | Random secret for Auth.js. Generate with `npx auth secret`. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth credentials (optional). |
| `CRON_SECRET` | Bearer token that protects the `/api/cron/*` endpoints. |
| `AI_PROVIDER` / `AI_MODEL` / `AI_API_KEY` | Provider, model and key for AI insights. |
| `REQUIRE_DAILY_JOURNAL_READ` | `true` or `false`. When on, a check-in counts only after reading a journal that day. |

Never commit `.env`. Use a separate Neon branch for development so you can test safely.

### Set up the database

```bash
npm run db:migrate   # apply migrations
npm run db:seed      # add sample users, habits, check-ins and journals
```

### Run

```bash
npm run dev
```

Open http://localhost:3000.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run test` | Run Vitest |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed the database |

## Project structure

```
src/
  app/
    (auth)/            login, register
    (app)/             home, habits, analytics, groups, journals, leaderboard, settings
    api/               route handlers
  components/ui/       shared design-system components
  lib/                 API client, helpers
  server/
    domain/            pure logic (streaks, freezes, XP) with unit tests
    services/          business logic that uses the database
    lib/               prisma client, env validation, API helpers
prisma/
  schema.prisma
  seed.ts
```

## How the main rules work

**Time zones.** Dates are stored in UTC. Every user-facing "day" is computed from `User.timezone`, never from the server clock. The client never sends the date for a check-in; the server works it out.

**Streaks.** A completed day and a frozen day both keep a streak alive. A missed scheduled day breaks it. Today is not counted as missed until it ends. Weekly habits count a week as done when the target number of completions is reached.

**Freezes.** A freeze can restore a scheduled, unfilled day from the last 3 local days. It needs a note (1 to 500 characters), uses one of the user's freezes and updates the streak in a single database transaction. Freezes reset monthly in the user's local time.

**XP and levels.** Check-ins and journal reads earn XP, with milestone bonuses. Awards are idempotent, so the same action cannot be rewarded twice. Frozen days earn no XP.

**Leaderboard.** Ranked by current streak, then longest streak, then XP, for all users or only friends.

## API overview

All responses use `{ data }` on success or `{ error: { code, message } }` on failure.

| Area | Endpoints |
| --- | --- |
| Auth and profile | `POST /api/auth/register`, `GET/PATCH /api/me` |
| Habits | `GET/POST /api/habits`, `GET/PATCH/DELETE /api/habits/:id` |
| Check-ins | `POST/GET /api/habits/:id/checkins` |
| Freezes | `POST /api/habits/:id/freeze`, `GET /api/freezes/status` |
| Analytics | `GET /api/analytics/triggers`, `GET /api/analytics/heatmap` |
| AI | `GET/POST /api/ai/insights` |
| Journals | `GET/POST /api/journals`, `GET /api/journals/feed`, `GET /api/journals/mine`, `POST /api/journals/:id/read`, `GET /api/journals/read-status` |
| Groups and people | `GET/POST /api/groups`, `GET /api/groups/discover`, `POST /api/groups/:id/join`, `GET /api/people/similar`, `/api/friends/*` |
| Leaderboard | `GET /api/leaderboard` |
| Cron (secured) | `POST /api/cron/rollover`, `POST /api/cron/freeze-reset` |

## Scheduled jobs

Neon does not run jobs for you. Use Vercel Cron or a GitHub Action to call these with `Authorization: Bearer <CRON_SECRET>`:

- `POST /api/cron/rollover` every hour: marks unfilled days as missed for users whose local midnight just passed. Safe to run twice.
- `POST /api/cron/freeze-reset` every hour: resets freezes on the 1st of each month in each user's local time.

## Testing

```bash
npm run test
```

The streak, freeze and XP logic lives in `src/server/domain` as pure functions, so it is tested without a database. The tests cover daylight saving changes, users in different time zones, weekly rollovers and custom schedules.

## Roadmap

- Journal likes and comments
- Notifications and reminders
- Profile photos and journal images
- Dashboard summary endpoint
- Mobile app

## Contributing

1. Create a branch from `main`.
2. Run `npm run typecheck`, `npm run lint` and `npm run test` before opening a pull request.
3. Keep business rules in `src/server/domain` and add tests for any change to them.

## License

Add your license here (for example MIT).
