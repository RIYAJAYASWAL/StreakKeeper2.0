# StreakKeeper API Reference

Welcome to the StreakKeeper REST API documentation.

## Authentication & Headers

### User Requests
Most endpoints require authentication. Provide a valid NextAuth session cookie or a Bearer token:
```http
Authorization: Bearer <session-token-or-user-id>
```

### Cron Endpoints
Secured cron tasks require the `CRON_SECRET` bearer token:
```http
Authorization: Bearer <CRON_SECRET>
```

### Response Formats
- **Success (2xx)**:
  ```json
  {
    "data": { ... }
  }
  ```
- **Error (4xx/5xx)**:
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "Human readable explanation"
    }
  }
  ```

---

## 1. System & Health

### `GET /api/health`
Checks service and database status.
- **Auth**: None (Public)
- **Response `200`**:
  ```json
  {
    "data": {
      "status": "ok",
      "uptime": 123.45,
      "timestamp": "2026-10-09T18:00:00.000Z",
      "database": {
        "status": "connected",
        "latencyMs": 12
      }
    }
  }
  ```

---

## 2. Authentication

### `POST /api/auth/register`
Creates a new user account with hashed password and local timezone.
- **Auth**: None
- **Rate Limit**: 10 requests per 15 minutes per IP
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123!",
    "timezone": "America/New_York"
  }
  ```
- **Response `201`**:
  ```json
  {
    "data": {
      "user": {
        "id": "cuid...",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "timezone": "America/New_York",
        "xp": 0,
        "level": 1,
        "freezesRemaining": 3
      }
    }
  }
  ```

### `POST /api/auth/login`
Authenticates credentials and returns user details.
- **Auth**: None
- **Rate Limit**: 10 requests per 15 minutes per IP
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Response `200`**:
  ```json
  {
    "data": {
      "user": {
        "id": "cuid...",
        "email": "jane@example.com",
        "name": "Jane Doe"
      }
    }
  }
  ```

### `GET /api/auth/[...nextauth]` & `POST /api/auth/[...nextauth]`
NextAuth authentication route handlers (OAuth / session management).

---

## 3. User Profile

### `GET /api/me`
Retrieves authenticated user profile.
- **Auth**: Bearer User

### `PATCH /api/me`
Updates user name or IANA timezone.
- **Auth**: Bearer User
- **Request Body**:
  ```json
  {
    "name": "Jane New Name",
    "timezone": "Europe/London"
  }
  ```

---

## 4. Habits & Check-ins

### `POST /api/habits`
Creates a new habit with automatic initial streak (`0/0`).
- **Auth**: Bearer User
- **Request Body**:
  ```json
  {
    "name": "Morning Run",
    "category": "FITNESS",
    "frequencyType": "DAILY",
    "startDate": "2026-10-01"
  }
  ```
  *(For `CUSTOM`, specify `daysOfWeek: [1, 3, 5]` or `intervalDays: 2`. For `WEEKLY`, specify `targetPerPeriod: 3`).*

### `GET /api/habits`
Returns all non-archived habits of the user, ordered by creation date, including current and longest streaks.
- **Auth**: Bearer User

### `GET /api/habits/:id`
Retrieves habit details.
- **Auth**: Bearer User (Owner only)

### `PATCH /api/habits/:id`
Updates habit attributes.
- **Auth**: Bearer User (Owner only)

### `DELETE /api/habits/:id`
Soft-deletes habit by setting `archivedAt = now()`.
- **Auth**: Bearer User (Owner only)

### `POST /api/habits/:id/checkins`
Records a check-in for today in the user's local timezone.
- **Auth**: Bearer User
- **Awards XP**: +10 XP (+15 XP milestone bonus on 7, 14, 21, ... day streaks).
- **Request Body** *(Optional)*:
  ```json
  {
    "note": "Completed 5km run"
  }
  ```
- **Response `201`**:
  ```json
  {
    "data": {
      "checkIn": {
        "id": "cuid...",
        "localDate": "2026-10-09",
        "status": "COMPLETED"
      },
      "streak": {
        "current": 5,
        "longest": 7
      }
    }
  }
  ```

### `GET /api/habits/:id/checkins?from=YYYY-MM-DD&to=YYYY-MM-DD`
Lists check-ins for a habit within a date range.
- **Auth**: Bearer User

---

## 5. Streak Freezes

### `POST /api/habits/:id/freeze`
Retroactively restores an unfilled missed day within the 3-day lookback window.
- **Auth**: Bearer User
- **Request Body**:
  ```json
  {
    "localDate": "2026-10-08",
    "reasonTag": "SICK",
    "note": "Had fever and couldn't run"
  }
  ```
- **Response `201`**:
  ```json
  {
    "data": {
      "freezeUse": { "id": "cuid...", "reasonTag": "SICK" },
      "freezesRemaining": 2,
      "streak": { "current": 4, "longest": 7 }
    }
  }
  ```

### `GET /api/freezes/status`
Returns user freeze allowance, restorable missed days across all habits, and next monthly reset date.
- **Auth**: Bearer User

---

## 6. Journals

### `POST /api/journals`
Creates a personal or public journal reflection.
- **Auth**: Bearer User
- **Request Body**:
  ```json
  {
    "title": "Reflecting on week 1",
    "body": "Learned consistent cadence beats burst effort.",
    "habitId": "cuid...",
    "visibility": "PUBLIC"
  }
  ```

### `GET /api/journals/mine`
Lists all journals authored by the logged-in user.
- **Auth**: Bearer User

### `GET /api/journals/feed?cursor=...&limit=20`
Paginated discovery feed of public journals matching the user's habit categories (excludes own journals).
- **Auth**: Bearer User

### `GET /api/journals/:id`
Retrieves a single journal (public for anyone, private author only).
- **Auth**: Bearer User

### `PATCH /api/journals/:id` & `DELETE /api/journals/:id`
Updates or deletes a journal entry (Author only).
- **Auth**: Bearer User

### `POST /api/journals/:id/read`
Records a daily reading of a public journal.
- **Auth**: Bearer User
- **Awards XP**: +5 XP (idempotent per user/day).

### `GET /api/journals/read-status`
Returns `{ readToday: boolean }` based on user's local date.
- **Auth**: Bearer User

---

## 7. Friends & Social Discovery

### `POST /api/friends/request`
Sends a friend request to another user.
- **Auth**: Bearer User
- **Request Body**: `{ "targetUserId": "cuid..." }`

### `POST /api/friends/:id/accept`
Accepts a pending friend request.
- **Auth**: Bearer User

### `GET /api/friends`
Lists accepted friends and incoming pending requests.
- **Auth**: Bearer User

### `GET /api/people/similar`
Discovers users with overlapping habit categories ranked by Jaccard similarity.
- **Auth**: Bearer User

---

## 8. Groups

### `POST /api/groups`
Creates a community habit or friendship group.
- **Auth**: Bearer User
- **Request Body**:
  ```json
  {
    "name": "Early Morning Runners",
    "type": "HABIT",
    "category": "FITNESS",
    "description": "Daily 6am cardio accountability"
  }
  ```

### `GET /api/groups`
Lists groups the user has joined or created.
- **Auth**: Bearer User

### `GET /api/groups/discover`
Discovers public groups matching user habit categories ranked by category overlap.
- **Auth**: Bearer User

### `POST /api/groups/:id/join` & `POST /api/groups/:id/leave`
Join or leave a group (group owners cannot leave without transferring ownership).
- **Auth**: Bearer User

### `GET /api/groups/:id/members`
Lists all members in the group with their roles (`OWNER`, `MEMBER`).
- **Auth**: Bearer User

---

## 9. Gamification & Leaderboard

### `GET /api/leaderboard?scope=global|friends&period=all|month&limit=20&cursor=...`
Returns ranked leaderboard powered by SQL window functions (`DENSE_RANK()`).
- **Auth**: Bearer User
- **Sorting**: Best current streak DESC, longest streak DESC, XP DESC.
- **Response `200`**:
  ```json
  {
    "data": {
      "leaderboard": [
        {
          "rank": 1,
          "userId": "cuid...",
          "name": "Jordan Lee",
          "currentStreak": 12,
          "longestStreak": 21,
          "xp": 850,
          "level": 5
        }
      ],
      "myRank": 1,
      "nextCursor": null
    }
  }
  ```

---

## 10. Analytics & Heatmap

### `GET /api/analytics/triggers?habitId=...&range=30d|90d`
Computes non-AI behavioral triggers (freeze reason tags, day-of-week clusters, late-night check-ins).
- **Auth**: Bearer User

### `GET /api/analytics/heatmap?weeks=14`
Returns 14-week daily grid status (`COMPLETED`, `FROZEN`, `MISSED`, `NONE`) in user's local timezone.
- **Auth**: Bearer User

---

## 11. AI Insights

### `POST /api/ai/insights`
Generates personalized, non-medical habit suggestions using AI provider.
- **Auth**: Bearer User
- **Limits**: Max 3 generations per day; 24h cache if input data unchanged; 10s timeout.

### `GET /api/ai/insights`
Fetches the latest generated AI insight.
- **Auth**: Bearer User

---

## 12. Scheduled Cron Endpoints

Secured via header `Authorization: Bearer CRON_SECRET`.

### `POST /api/cron/rollover`
Hourly job. For each user whose local time just passed midnight (`hour === 0`), marks yesterday's unfilled scheduled days as `MISSED` and recomputes streaks.
- **Auth**: Bearer `CRON_SECRET`
- **Optional Request Body**:
  ```json
  {
    "now": "2026-10-10T00:05:00Z",
    "userId": "cuid...",
    "forceAllTimezones": false,
    "batchSize": 50
  }
  ```
- **Response `200`**:
  ```json
  {
    "data": {
      "processedUsers": 142,
      "updatedHabits": 284,
      "missedCheckInsCreated": 18
    }
  }
  ```

### `POST /api/cron/freeze-reset`
Monthly job. On the 1st of each month in user's local timezone, resets `freezesRemaining = 3` and updates `freezesResetAt`.
- **Auth**: Bearer `CRON_SECRET`
- **Optional Request Body**:
  ```json
  {
    "now": "2026-11-01T00:00:00Z",
    "userId": "cuid...",
    "forceAllDays": false,
    "batchSize": 50
  }
  ```
- **Response `200`**:
  ```json
  {
    "data": {
      "processedUsers": 500,
      "resetUsers": 412
    }
  }
  ```
