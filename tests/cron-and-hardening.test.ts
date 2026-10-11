import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/server/lib/prisma';
import { env } from '@/server/lib/env';
import { HabitCategory, FrequencyType, CheckInStatus } from '@prisma/client';
import { GET as rolloverGetHandler, POST as rolloverHandler } from '@app/api/cron/rollover/route';
import { getUserProfile } from '@/server/services/auth.service';
import { GET as healthHandler } from '@app/api/health/route';
import { sanitizeLogData } from '@/server/lib/logger';
import { InMemoryRateLimiter, assertRateLimit } from '@/server/lib/rate-limit';
import { addUtcDays, parseYmd, toDateOnly } from '@/server/domain/streak';

describe('Cron Endpoints, Hardening & Security', () => {
  let testUserId: string;
  let testHabitId: string;

  beforeAll(async () => {
    // Create dedicated user for cron rollover testing
    const testUser = await prisma.user.create({
      data: {
        email: `cron-test-${Date.now()}@example.com`,
        name: 'Cron Test User',
        timezone: 'UTC',
        freezesRemaining: 1,
      },
    });
    testUserId = testUser.id;

    // Create a habit starting 3 days ago
    const today = toDateOnly(new Date());
    const startDate = addUtcDays(today, -3);

    const habit = await prisma.habit.create({
      data: {
        userId: testUserId,
        name: 'Test Morning Routine',
        category: HabitCategory.HEALTH,
        frequencyType: FrequencyType.DAILY,
        startDate,
        streak: {
          create: {
            current: 2,
            longest: 2,
          },
        },
      },
    });
    testHabitId = habit.id;

    // Check-in for 2 days ago (completed)
    const twoDaysAgo = addUtcDays(today, -2);
    await prisma.checkIn.create({
      data: {
        userId: testUserId,
        habitId: testHabitId,
        localDate: twoDaysAgo,
        status: CheckInStatus.COMPLETED,
      },
    });

    // Yesterday is left unfilled!
  });

  afterAll(async () => {
    // Cleanup test user
    if (testUserId) {
      await prisma.checkIn.deleteMany({ where: { userId: testUserId } });
      await prisma.streak.deleteMany({ where: { habitId: testHabitId } });
      await prisma.habit.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  describe('Secured Cron Authentication', () => {
    it('rejects GET /api/cron/rollover without authorization header', async () => {
      const req = new Request('http://localhost/api/cron/rollover', {
        method: 'GET',
      });
      const res = await rolloverGetHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects GET /api/cron/rollover with incorrect cron secret', async () => {
      const req = new Request('http://localhost/api/cron/rollover', {
        method: 'GET',
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      });
      const res = await rolloverGetHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects POST /api/cron/rollover without authorization header', async () => {
      const req = new Request('http://localhost/api/cron/rollover', {
        method: 'POST',
      });
      const res = await rolloverHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects POST /api/cron/rollover with incorrect cron secret', async () => {
      const req = new Request('http://localhost/api/cron/rollover', {
        method: 'POST',
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      });
      const res = await rolloverHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/cron/rollover: Marking MISSED and Streak Recomputation', () => {
    it('marks unfilled yesterday as MISSED, recomputes streaks, and is strictly idempotent on second run', async () => {
      const today = toDateOnly(new Date());
      const yesterday = addUtcDays(today, -1);

      // Verify yesterday currently has no check-in
      const beforeCheckIn = await prisma.checkIn.findUnique({
        where: {
          habitId_localDate: {
            habitId: testHabitId,
            localDate: yesterday,
          },
        },
      });
      expect(beforeCheckIn).toBeNull();

      // Run rollover 1st time
      const req1 = new Request('http://localhost/api/cron/rollover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${env.CRON_SECRET}`,
        },
        body: JSON.stringify({
          userId: testUserId,
          forceAllTimezones: true,
        }),
      });

      const res1 = await rolloverHandler(req1);
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      expect(json1.data.processedUsers).toBe(1);
      expect(json1.data.updatedHabits).toBe(1);
      expect(json1.data.missedCheckInsCreated).toBe(1);

      // Verify check-in is now created as MISSED
      const checkInAfter1 = await prisma.checkIn.findUnique({
        where: {
          habitId_localDate: {
            habitId: testHabitId,
            localDate: yesterday,
          },
        },
      });
      expect(checkInAfter1).toBeDefined();
      expect(checkInAfter1!.status).toBe(CheckInStatus.MISSED);

      // Verify streak recomputed: current is now 0 because yesterday was missed
      const streakAfter1 = await prisma.streak.findUnique({
        where: { habitId: testHabitId },
      });
      expect(streakAfter1!.current).toBe(0);

      // RUN ROLLOVER A 2ND TIME (Idempotency check)
      const req2 = new Request('http://localhost/api/cron/rollover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${env.CRON_SECRET}`,
        },
        body: JSON.stringify({
          userId: testUserId,
          forceAllTimezones: true,
        }),
      });

      const res2 = await rolloverHandler(req2);
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.data.processedUsers).toBe(1);
      expect(json2.data.updatedHabits).toBe(1);
      // No duplicate check-ins created!
      expect(json2.data.missedCheckInsCreated).toBe(0);

      // Count check-ins for yesterday: strictly 1
      const countCheckIns = await prisma.checkIn.count({
        where: {
          habitId: testHabitId,
          localDate: yesterday,
        },
      });
      expect(countCheckIns).toBe(1);

      // Streak remains identical
      const streakAfter2 = await prisma.streak.findUnique({
        where: { habitId: testHabitId },
      });
      expect(streakAfter2!.current).toBe(0);
      expect(streakAfter2!.longest).toBe(streakAfter1!.longest);
    });
  });

  describe('Lazy Freeze Reset via getUserProfile (/api/me)', () => {
    it('lazily resets freezes to 3 when next month arrives and is idempotent', async () => {
      // Set user's last reset date to last month and freezesRemaining = 1
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      await prisma.user.update({
        where: { id: testUserId },
        data: {
          freezesRemaining: 1,
          freezesResetAt: lastMonth,
        },
      });

      // 1st access via getUserProfile
      const profile1 = await getUserProfile(testUserId);
      expect(profile1.freezesRemaining).toBe(3);

      const userAfter1 = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { freezesRemaining: true },
      });
      expect(userAfter1!.freezesRemaining).toBe(3);

      // 2nd access (idempotent)
      const profile2 = await getUserProfile(testUserId);
      expect(profile2.freezesRemaining).toBe(3);
    });
  });

  describe('GET /api/health', () => {
    it('returns 200 with status ok and database connected', async () => {
      const res = await healthHandler();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('ok');
      expect(json.data.database.status).toBe('connected');
      expect(typeof json.data.uptime).toBe('number');
    });
  });

  describe('Hardening: Secret Redaction & Rate Limiting', () => {
    it('redacts passwords, tokens, secrets, and database credentials in logs', () => {
      const sensitivePayload = {
        password: 'my-super-secret-password',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz',
        token: 'eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        apiKey: 'sk-1234567890abcdef',
        cronSecret: 'cron-secret-123',
        authSecret: 'auth-secret-123',
        databaseUrl: 'postgresql://dbuser:supersecretpass@ep-cool-pooler.neon.tech/streakkeeper?sslmode=require',
        authHeader: 'Bearer my_jwt_access_token_12345',
        safeField: 'This is safe to log',
      };

      const sanitized = sanitizeLogData(sensitivePayload) as Record<string, unknown>;

      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.passwordHash).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.cronSecret).toBe('[REDACTED]');
      expect(sanitized.authSecret).toBe('[REDACTED]');
      expect(sanitized.databaseUrl).toBe('postgresql://dbuser:***@ep-cool-pooler.neon.tech/streakkeeper?sslmode=require');
      expect(sanitized.authHeader).toBe('Bearer [REDACTED]');
      expect(sanitized.safeField).toBe('This is safe to log');
    });

    it('enforces rate limits and throws TooManyRequestsError (429)', async () => {
      const limiter = new InMemoryRateLimiter();
      const testKey = 'test-key-limit';

      // First 2 requests pass (limit 2)
      await assertRateLimit(testKey, 2, 60000, limiter);
      await assertRateLimit(testKey, 2, 60000, limiter);

      // 3rd request throws
      await expect(assertRateLimit(testKey, 2, 60000, limiter)).rejects.toThrow(
        /Rate limit exceeded/
      );
    });
  });
});
