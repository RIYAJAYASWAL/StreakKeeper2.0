import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as rolloverGetHandler, POST as rolloverPostHandler } from '@/app/api/cron/rollover/route';
import { runDailyRollover, processUserRollover, recomputeUserStreaks } from '@/server/services/cron';
import { getUserProfile } from '@/server/services/auth.service';
import { getHabits } from '@/server/services/habits';
import { toLocalDate, parseYmd, addUtcDays, formatYmd } from '@/server/domain/streak';
import { resetFreezesIfDue } from '@/server/domain/freeze';
import { env } from '@/server/lib/env';
import { CheckInStatus, FrequencyType } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';

// Mock prisma for isolated unit tests
vi.mock('@/server/lib/prisma', () => {
  const store = {
    users: new Map<string, any>(),
    habits: new Map<string, any>(),
    checkIns: new Map<string, any>(),
    streaks: new Map<string, any>(),
    verificationTokens: new Map<string, any>(),
  };

  return {
    prisma: {
      user: {
        findUnique: vi.fn(async ({ where }: any) => store.users.get(where.id) ?? null),
        findMany: vi.fn(async () => Array.from(store.users.values())),
        update: vi.fn(async ({ where, data }: any) => {
          const u = store.users.get(where.id);
          if (u) Object.assign(u, data);
          return u;
        }),
        updateMany: vi.fn(async ({ where, data }: any) => {
          const u = store.users.get(where.id);
          if (u) {
            Object.assign(u, data);
            return { count: 1 };
          }
          return { count: 0 };
        }),
      },
      habit: {
        findMany: vi.fn(async ({ where }: any) => {
          return Array.from(store.habits.values()).filter(
            (h) => h.userId === where.userId && (where.archivedAt === null ? h.archivedAt === null : true)
          );
        }),
      },
      checkIn: {
        findUnique: vi.fn(async ({ where }: any) => {
          const key = `${where.habitId_localDate.habitId}_${formatYmd(where.habitId_localDate.localDate)}`;
          return store.checkIns.get(key) ?? null;
        }),
        findMany: vi.fn(async ({ where }: any) => {
          return Array.from(store.checkIns.values()).filter((c) => {
            if (c.habitId !== where.habitId) return false;
            if (where.localDate?.gte && c.localDate.getTime() < where.localDate.gte.getTime()) return false;
            if (where.localDate?.lte && c.localDate.getTime() > where.localDate.lte.getTime()) return false;
            return true;
          });
        }),
        create: vi.fn(async ({ data }: any) => {
          const key = `${data.habitId}_${formatYmd(data.localDate)}`;
          if (store.checkIns.has(key)) {
            const err: any = new Error('Unique constraint violation');
            err.code = 'P2002';
            throw err;
          }
          const item = { id: `ci_${Date.now()}_${Math.random()}`, ...data };
          store.checkIns.set(key, item);
          return item;
        }),
      },
      streak: {
        upsert: vi.fn(async ({ where, create, update }: any) => {
          const existing = store.streaks.get(where.habitId);
          const data = existing ? { ...existing, ...update } : { id: `str_${Date.now()}`, ...create };
          store.streaks.set(where.habitId, data);
          return data;
        }),
      },
      verificationToken: {
        findFirst: vi.fn(async () => null),
        deleteMany: vi.fn(async () => ({ count: 0 })),
        create: vi.fn(async ({ data }: any) => data),
      },
      $transaction: vi.fn(async (callback: any) => {
        return callback(prisma);
      }),
      _testStore: store,
    },
  };
});

describe('Vercel Cron & Rollover Jobs', () => {
  const store = (prisma as any)._testStore;

  beforeEach(() => {
    store.users.clear();
    store.habits.clear();
    store.checkIns.clear();
    store.streaks.clear();
    store.verificationTokens.clear();
    vi.clearAllMocks();
  });

  describe('Requirement 1: /api/cron/rollover GET Endpoint & Authorization', () => {
    it('rejects GET without Authorization header with 401', async () => {
      const req = new Request('http://localhost/api/cron/rollover', { method: 'GET' });
      const res = await rolloverGetHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects GET with invalid cron secret with 401', async () => {
      const req = new Request('http://localhost/api/cron/rollover', {
        method: 'GET',
        headers: { authorization: 'Bearer invalid-secret' },
      });
      const res = await rolloverGetHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('accepts GET with valid Bearer CRON_SECRET and returns 200', async () => {
      const req = new Request('http://localhost/api/cron/rollover', {
        method: 'GET',
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      });
      const res = await rolloverGetHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(typeof json.data.processedUsers).toBe('number');
    });
  });

  describe('Requirement 2 & 6: Timezone-correct rollover for Asia/Kolkata and America/Los_Angeles', () => {
    it('correctly marks missed days based on user local timezone at 03:00 UTC', async () => {
      // Fixed cron execution instant: 2026-10-11 at 03:00:00 UTC
      // At this instant:
      // - Asia/Kolkata is at 2026-10-11 08:30 AM. Local date is 2026-10-11. Yesterday (2026-10-10) has ended!
      // - America/Los_Angeles is at 2026-10-10 20:00 (8:00 PM). Local date is 2026-10-10. Yesterday is 2026-10-09.
      //   2026-10-10 is STILL ONGOING in LA and has NOT ended!
      const cronNow = new Date('2026-10-11T03:00:00.000Z');

      // 1. Setup User in Asia/Kolkata
      const kolkataUser = {
        id: 'user-kolkata',
        email: 'kolkata@example.com',
        timezone: 'Asia/Kolkata',
      };
      store.users.set(kolkataUser.id, kolkataUser);

      const kolkataHabit = {
        id: 'habit-kolkata',
        userId: kolkataUser.id,
        frequencyType: FrequencyType.DAILY,
        daysOfWeek: [],
        intervalDays: null,
        startDate: parseYmd('2026-10-09'),
        targetPerPeriod: null,
        archivedAt: null,
      };
      store.habits.set(kolkataHabit.id, kolkataHabit);

      // Completed check-in on 2026-10-09 for Kolkata user
      const ciKolkata1 = {
        id: 'ci-k1',
        habitId: kolkataHabit.id,
        userId: kolkataUser.id,
        localDate: parseYmd('2026-10-09'),
        status: CheckInStatus.COMPLETED,
      };
      store.checkIns.set(`${kolkataHabit.id}_2026-10-09`, ciKolkata1);

      // 2. Setup User in America/Los_Angeles
      const laUser = {
        id: 'user-la',
        email: 'la@example.com',
        timezone: 'America/Los_Angeles',
      };
      store.users.set(laUser.id, laUser);

      const laHabit = {
        id: 'habit-la',
        userId: laUser.id,
        frequencyType: FrequencyType.DAILY,
        daysOfWeek: [],
        intervalDays: null,
        startDate: parseYmd('2026-10-09'),
        targetPerPeriod: null,
        archivedAt: null,
      };
      store.habits.set(laHabit.id, laHabit);

      // Completed check-in on 2026-10-09 for LA user
      const ciLa1 = {
        id: 'ci-la1',
        habitId: laHabit.id,
        userId: laUser.id,
        localDate: parseYmd('2026-10-09'),
        status: CheckInStatus.COMPLETED,
      };
      store.checkIns.set(`${laHabit.id}_2026-10-09`, ciLa1);

      // Verify local dates before running rollover
      expect(formatYmd(toLocalDate(cronNow, 'Asia/Kolkata'))).toBe('2026-10-11');
      expect(formatYmd(toLocalDate(cronNow, 'America/Los_Angeles'))).toBe('2026-10-10');

      // Execute rollover
      const result = await runDailyRollover({ now: cronNow });
      expect(result.processedUsers).toBe(2);

      // VERIFY KOLKATA:
      // Yesterday in Kolkata (2026-10-10) has ended and was unfilled -> marked MISSED!
      // Today in Kolkata (2026-10-11) is ongoing -> NOT marked MISSED!
      const kolkataOct10 = store.checkIns.get(`${kolkataHabit.id}_2026-10-10`);
      expect(kolkataOct10).toBeDefined();
      expect(kolkataOct10.status).toBe(CheckInStatus.MISSED);

      const kolkataOct11 = store.checkIns.get(`${kolkataHabit.id}_2026-10-11`);
      expect(kolkataOct11).toBeUndefined(); // Ongoing today must never be marked missed

      // VERIFY LOS ANGELES:
      // In LA at 03:00 UTC, the local time is 8 PM on Oct 10.
      // Oct 10 has NOT ended yet!
      // Oct 09 had a COMPLETED check-in.
      // Therefore, LA gets NO missed check-ins on Oct 10 during the 3 AM UTC run!
      const laOct10 = store.checkIns.get(`${laHabit.id}_2026-10-10`);
      expect(laOct10).toBeUndefined(); // Oct 10 hasn't ended yet in LA!

      // Recomputed streak for Kolkata user is 0 (broken by Oct 10 MISSED)
      const kolkataStreak = store.streaks.get(kolkataHabit.id);
      expect(kolkataStreak).toBeDefined();
      expect(kolkataStreak.current).toBe(0);

      // LA streak is still active (1) because Oct 10 hasn't ended yet!
      const laStreak = store.streaks.get(laHabit.id);
      expect(laStreak).toBeDefined();
      expect(laStreak.current).toBe(1);
    });

    it('is strictly idempotent: running rollover twice yields identical results and zero new missed check-ins', async () => {
      const cronNow = new Date('2026-10-11T03:00:00.000Z');

      const user = {
        id: 'user-idempotent',
        email: 'idem@example.com',
        timezone: 'UTC',
      };
      store.users.set(user.id, user);

      const habit = {
        id: 'habit-idempotent',
        userId: user.id,
        frequencyType: FrequencyType.DAILY,
        daysOfWeek: [],
        intervalDays: null,
        startDate: parseYmd('2026-10-09'),
        targetPerPeriod: null,
        archivedAt: null,
      };
      store.habits.set(habit.id, habit);

      // Run 1st time
      const run1 = await runDailyRollover({ now: cronNow, userId: user.id });
      expect(run1.processedUsers).toBe(1);
      expect(run1.updatedHabits).toBe(1);
      // Oct 9 and Oct 10 ended without check-in -> 2 missed check-ins created
      expect(run1.missedCheckInsCreated).toBe(2);

      const checkInsCountAfterRun1 = store.checkIns.size;
      const streakAfterRun1 = { ...store.streaks.get(habit.id) };

      // Run 2nd time with same time
      const run2 = await runDailyRollover({ now: cronNow, userId: user.id });
      expect(run2.processedUsers).toBe(1);
      expect(run2.updatedHabits).toBe(1);
      // Strictly idempotent: 0 new missed check-ins created!
      expect(run2.missedCheckInsCreated).toBe(0);
      expect(store.checkIns.size).toBe(checkInsCountAfterRun1);

      const streakAfterRun2 = store.streaks.get(habit.id);
      expect(streakAfterRun2.current).toBe(streakAfterRun1.current);
      expect(streakAfterRun2.longest).toBe(streakAfterRun1.longest);
    });
  });

  describe('Requirement 3: Lazy Freeze Reset in getUserProfile (/api/me)', () => {
    it('lazily resets freezes to 3 when next month arrives', async () => {
      // User whose last reset was last month and has 0 freezes left
      const oldResetDate = new Date('2026-09-01T00:00:00Z');
      const testUser = {
        id: 'user-freeze-lazy',
        email: 'freeze@example.com',
        timezone: 'UTC',
        freezesRemaining: 0,
        freezesResetAt: oldResetDate,
        xp: 100,
        level: 2,
        name: 'Freeze User',
        createdAt: oldResetDate,
        updatedAt: oldResetDate,
      };
      store.users.set(testUser.id, testUser);

      // Calling getUserProfile (used by GET /api/me)
      const profile = await getUserProfile(testUser.id);
      expect(profile).toBeDefined();
      // Freezes are lazily reset to 3!
      expect(profile.freezesRemaining).toBe(3);
      expect(profile.freezesResetAt.getTime()).toBeGreaterThan(oldResetDate.getTime());
    });
  });

  describe('Requirement 4: Lazy Streak Recomputation on habits list / dashboard', () => {
    it('recomputes streaks lazily so numbers are never stale when opening habits or dashboard', async () => {
      const user = {
        id: 'user-lazy-streak',
        email: 'lazy@example.com',
        timezone: 'UTC',
      };
      store.users.set(user.id, user);

      const habit = {
        id: 'habit-lazy-streak',
        userId: user.id,
        frequencyType: FrequencyType.DAILY,
        daysOfWeek: [],
        intervalDays: null,
        startDate: parseYmd('2026-10-08'),
        targetPerPeriod: null,
        archivedAt: null,
      };
      store.habits.set(habit.id, habit);

      // Stale streak stored in database says current: 5
      store.streaks.set(habit.id, {
        id: 'str-stale',
        habitId: habit.id,
        current: 5,
        longest: 5,
      });

      // User missed yesterday (unfilled). Calling recomputeUserStreaks:
      await recomputeUserStreaks(user.id, new Date());

      const streak = store.streaks.get(habit.id);
      expect(streak.current).toBe(0); // Correctly updated to 0 because yesterday was missed!
    });
  });
});
