import { describe, it, expect } from 'vitest';
import { CheckInStatus, FrequencyType } from '@prisma/client';
import { parseYmd } from '@/server/domain/streak';
import {
  canFreeze,
  getRestorableDays,
  resetFreezesIfDue,
  nextFreezeResetDate,
  MONTHLY_FREEZE_ALLOWANCE,
} from '@/server/domain/freeze';

const today = parseYmd('2026-10-09');

describe('canFreeze', () => {
  it('allows a scheduled unfilled day within the last 3 local days', () => {
    expect(
      canFreeze({
        missedLocalDate: parseYmd('2026-10-08'),
        today,
        freezesRemaining: 2,
        alreadyFrozen: false,
        isScheduled: true,
      }).allowed
    ).toBe(true);
    expect(
      canFreeze({
        missedLocalDate: parseYmd('2026-10-07'),
        today,
        freezesRemaining: 1,
        alreadyFrozen: false,
      }).allowed
    ).toBe(true);
    expect(
      canFreeze({
        missedLocalDate: parseYmd('2026-10-06'),
        today,
        freezesRemaining: 3,
        alreadyFrozen: false,
      }).allowed
    ).toBe(true);
  });

  it('rejects when no freezes are left', () => {
    const result = canFreeze({
      missedLocalDate: parseYmd('2026-10-08'),
      today,
      freezesRemaining: 0,
      alreadyFrozen: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('NO_FREEZES_LEFT');
  });

  it('rejects a double-freeze on an already frozen day', () => {
    const result = canFreeze({
      missedLocalDate: parseYmd('2026-10-08'),
      today,
      freezesRemaining: 3,
      alreadyFrozen: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ALREADY_FROZEN');
  });

  it('rejects a day older than 3 local days', () => {
    const result = canFreeze({
      missedLocalDate: parseYmd('2026-10-05'),
      today,
      freezesRemaining: 3,
      alreadyFrozen: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('TOO_OLD');
  });

  it('rejects today and future dates (not yet a missed day in the window)', () => {
    expect(
      canFreeze({
        missedLocalDate: today,
        today,
        freezesRemaining: 3,
        alreadyFrozen: false,
      }).reason
    ).toBe('NOT_IN_WINDOW');
    expect(
      canFreeze({
        missedLocalDate: parseYmd('2026-10-10'),
        today,
        freezesRemaining: 3,
        alreadyFrozen: false,
      }).reason
    ).toBe('NOT_IN_WINDOW');
  });

  it('rejects an unscheduled day', () => {
    const result = canFreeze({
      missedLocalDate: parseYmd('2026-10-08'),
      today,
      freezesRemaining: 3,
      alreadyFrozen: false,
      isScheduled: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('NOT_SCHEDULED');
  });

  it('rejects a filled (completed) day', () => {
    const result = canFreeze({
      missedLocalDate: parseYmd('2026-10-08'),
      today,
      freezesRemaining: 3,
      alreadyFrozen: false,
      isUnfilled: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('NOT_UNFILLED');
  });
});

describe('resetFreezesIfDue', () => {
  const user = {
    freezesRemaining: 1,
    freezesResetAt: new Date('2026-10-09T12:00:00.000Z'),
    timezone: 'UTC',
  };

  it('does not reset before the next month starts', () => {
    const result = resetFreezesIfDue(user, new Date('2026-10-31T23:59:59.000Z'));
    expect(result.didReset).toBe(false);
    expect(result.freezesRemaining).toBe(1);
    expect(result.freezesResetAt).toEqual(user.freezesResetAt);
  });

  it('resets to 3 freezes on the first instant of the next month', () => {
    const now = new Date('2026-11-01T00:00:00.000Z');
    const result = resetFreezesIfDue(user, now);
    expect(result.didReset).toBe(true);
    expect(result.freezesRemaining).toBe(MONTHLY_FREEZE_ALLOWANCE);
    expect(result.freezesResetAt.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it('does not stack unused months — skipped months still restore only 3', () => {
    const result = resetFreezesIfDue(user, new Date('2027-01-15T08:00:00.000Z'));
    expect(result.didReset).toBe(true);
    expect(result.freezesRemaining).toBe(3);
  });

  it('computes next reset as the start of the following local month', () => {
    expect(nextFreezeResetDate(new Date('2026-10-09T12:00:00.000Z'), 'UTC').toISOString()).toBe(
      '2026-11-01T00:00:00.000Z'
    );
  });

  it('uses the user timezone for month boundaries', () => {
    const kolkataUser = {
      freezesRemaining: 0,
      // 2026-10-31 20:00 UTC is already Nov 1 01:30 in Asia/Kolkata
      freezesResetAt: new Date('2026-10-01T00:00:00.000Z'),
      timezone: 'Asia/Kolkata',
    };
    const stillOctoberInKolkata = resetFreezesIfDue(
      kolkataUser,
      new Date('2026-10-31T18:00:00.000Z')
    );
    expect(stillOctoberInKolkata.didReset).toBe(false);

    const novemberInKolkata = resetFreezesIfDue(kolkataUser, new Date('2026-10-31T18:31:00.000Z'));
    expect(novemberInKolkata.didReset).toBe(true);
    expect(novemberInKolkata.freezesRemaining).toBe(3);
  });
});

describe('canFreeze + weekly schedule flag', () => {
  it('does not freeze a CUSTOM off-day even if it is recent', () => {
    expect(FrequencyType.CUSTOM).toBe('CUSTOM');
    const result = canFreeze({
      missedLocalDate: parseYmd('2026-10-08'),
      today,
      freezesRemaining: 3,
      alreadyFrozen: false,
      isScheduled: false,
    });
    expect(result.allowed).toBe(false);
  });
});

describe('getRestorableDays', () => {
  const daily = {
    frequencyType: FrequencyType.DAILY,
    daysOfWeek: [] as number[],
    intervalDays: null,
    startDate: parseYmd('2026-10-01'),
    targetPerPeriod: null,
  };

  it('returns unfilled scheduled days inside the 3-day window only', () => {
    const days = getRestorableDays(daily, [ { localDate: parseYmd('2026-10-07'), status: CheckInStatus.COMPLETED } ], today, 2).map(
      (d) => d.toISOString().slice(0, 10)
    );
    expect(days).toEqual(['2026-10-06', '2026-10-08']);
  });

  it('returns nothing when no freezes remain', () => {
    expect(getRestorableDays(daily, [], today, 0)).toEqual([]);
  });
});
