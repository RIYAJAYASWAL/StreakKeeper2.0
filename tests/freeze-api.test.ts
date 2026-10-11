import { describe, it, expect, beforeAll } from 'vitest';
import { CheckInStatus, FreezeReasonTag, HabitCategory, FrequencyType } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';
import { POST as freezeHandler } from '@app/api/habits/[id]/freeze/route';
import { GET as freezeStatusHandler } from '@app/api/freezes/status/route';
import { applyHabitFreeze } from '@/server/services/freezes';
import { addUtcDays, formatYmd, toLocalDate } from '@/server/domain/streak';

function freezeRequest(userId: string, habitId: string, body: object) {
  return freezeHandler(
    new Request(`http://localhost/api/habits/${habitId}/freeze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${userId}`,
      },
      body: JSON.stringify(body),
    }),
    { params: { id: habitId } }
  );
}

async function createFreezeUser(opts: { freezesRemaining: number; timezone?: string }) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return prisma.user.create({
    data: {
      email: `freeze_${suffix}@example.com`,
      name: 'Freeze Tester',
      timezone: opts.timezone ?? 'UTC',
      freezesRemaining: opts.freezesRemaining,
      freezesResetAt: new Date(),
    },
  });
}

async function createDailyHabit(userId: string, startDate: Date, name: string) {
  return prisma.habit.create({
    data: {
      userId,
      name,
      category: HabitCategory.HEALTH,
      frequencyType: FrequencyType.DAILY,
      startDate,
      streak: { create: { current: 0, longest: 0 } },
    },
  });
}

describe('POST /api/habits/:id/freeze and GET /api/freezes/status', () => {
  const now = new Date();
  let today: Date;
  let yesterday: Date;
  let tooOld: Date;

  beforeAll(() => {
    today = toLocalDate(now, 'UTC');
    yesterday = addUtcDays(today, -1);
    tooOld = addUtcDays(today, -4);
  });

  it('rejects when no freezes are left', async () => {
    const user = await createFreezeUser({ freezesRemaining: 0 });
    const habit = await createDailyHabit(user.id, addUtcDays(today, -10), 'No Freezes Habit');

    const res = await freezeRequest(user.id, habit.id, {
      localDate: formatYmd(yesterday),
      reasonTag: FreezeReasonTag.SICK,
      note: 'Tried to restore without allowance',
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('NO_FREEZES_LEFT');
  });

  it('rejects a double-freeze on the same local date', async () => {
    const user = await createFreezeUser({ freezesRemaining: 3 });
    const habit = await createDailyHabit(user.id, addUtcDays(today, -10), 'Double Freeze Habit');

    const body = {
      localDate: formatYmd(yesterday),
      reasonTag: FreezeReasonTag.TRAVEL,
      note: 'Airport delay, restoring yesterday',
    };

    const first = await freezeRequest(user.id, habit.id, body);
    expect(first.status).toBe(201);
    const firstJson = await first.json();
    expect(firstJson.data.freezesRemaining).toBe(2);
    expect(firstJson.data.streak).toBeDefined();

    const second = await freezeRequest(user.id, habit.id, body);
    expect(second.status).toBe(409);
    const secondJson = await second.json();
    expect(secondJson.error.code).toBe('ALREADY_FROZEN');

    const remaining = await prisma.user.findUnique({
      where: { id: user.id },
      select: { freezesRemaining: true },
    });
    expect(remaining?.freezesRemaining).toBe(2);
  });

  it('rejects a too-old missed day', async () => {
    const user = await createFreezeUser({ freezesRemaining: 3 });
    const habit = await createDailyHabit(user.id, addUtcDays(today, -10), 'Too Old Habit');

    const res = await freezeRequest(user.id, habit.id, {
      localDate: formatYmd(tooOld),
      reasonTag: FreezeReasonTag.FORGOT,
      note: 'This miss is outside the restore window',
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('TOO_OLD');
  });

  it('returns restorable days per habit on GET /api/freezes/status after lazy reset', async () => {
    const user = await createFreezeUser({ freezesRemaining: 0 });
    await prisma.user.update({
      where: { id: user.id },
      data: { freezesResetAt: addUtcDays(today, -40) },
    });
    const habit = await createDailyHabit(user.id, addUtcDays(today, -10), 'Status Habit');

    const res = await freezeStatusHandler(
      new Request('http://localhost/api/freezes/status', {
        headers: { authorization: `Bearer ${user.id}` },
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.freezesRemaining).toBe(3);
    expect(json.data.nextResetDate).toBeDefined();
    const match = json.data.habits.find((h: { habitId: string }) => h.habitId === habit.id);
    expect(match.restorableDays).toContain(formatYmd(yesterday));
    expect(match.restorableDays).not.toContain(formatYmd(tooOld));
    expect(match.restorableDays).not.toContain(formatYmd(today));
  });

  it('uses a conditional update so concurrent freezes cannot go negative', async () => {
    const user = await createFreezeUser({ freezesRemaining: 1 });
    const start = addUtcDays(today, -10);
    const habitA = await createDailyHabit(user.id, start, 'Concurrent A');
    const habitB = await createDailyHabit(user.id, start, 'Concurrent B');

    const payload = {
      localDate: formatYmd(yesterday),
      reasonTag: FreezeReasonTag.STRESS,
      note: 'Racing two restore requests against one freeze',
    };

    const results = await Promise.allSettled([
      applyHabitFreeze(user.id, habitA.id, payload, now),
      applyHabitFreeze(user.id, habitB.id, payload, now),
    ]);

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);

    const remaining = await prisma.user.findUnique({
      where: { id: user.id },
      select: { freezesRemaining: true },
    });
    expect(remaining?.freezesRemaining).toBe(0);
    expect(remaining?.freezesRemaining).toBeGreaterThanOrEqual(0);

    const frozen = await prisma.checkIn.count({
      where: {
        userId: user.id,
        status: CheckInStatus.FROZEN,
        localDate: yesterday,
      },
    });
    expect(frozen).toBe(1);
  });
});
