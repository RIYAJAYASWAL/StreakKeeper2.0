import { zonedTimeToUtc } from 'date-fns-tz';
import { addUtcDays, diffUtcDays, formatYmd, getMissedDays, toDateOnly, toLocalDate, type StreakCheckIn, type StreakHabit } from '@/server/domain/streak';

export const MONTHLY_FREEZE_ALLOWANCE = 3;
export const FREEZE_LOOKBACK_DAYS = 3;

export type FreezeDenialReason =
  | 'NO_FREEZES_LEFT'
  | 'ALREADY_FROZEN'
  | 'TOO_OLD'
  | 'NOT_IN_WINDOW'
  | 'NOT_SCHEDULED'
  | 'NOT_UNFILLED';

export interface CanFreezeInput {
  missedLocalDate: Date;
  today: Date;
  freezesRemaining: number;
  alreadyFrozen: boolean;
  isScheduled?: boolean;
  isUnfilled?: boolean;
}

export interface CanFreezeResult {
  allowed: boolean;
  reason?: FreezeDenialReason;
}

export interface FreezeUserState {
  freezesRemaining: number;
  freezesResetAt: Date;
  timezone: string;
}

export interface FreezeResetResult {
  freezesRemaining: number;
  freezesResetAt: Date;
  didReset: boolean;
}

/**
 * Local midnight of the first day of the month containing `instantUtc`, as a UTC Date.
 */
export function startOfLocalMonth(instantUtc: Date, timezone: string): Date {
  const local = toLocalDate(instantUtc, timezone);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  return zonedTimeToUtc(`${y}-${m}-01T00:00:00`, timezone);
}

export function startOfNextLocalMonth(instantUtc: Date, timezone: string): Date {
  const local = toLocalDate(instantUtc, timezone);
  let year = local.getUTCFullYear();
  let month = local.getUTCMonth() + 2;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  const m = String(month).padStart(2, '0');
  return zonedTimeToUtc(`${year}-${m}-01T00:00:00`, timezone);
}

export function nextFreezeResetDate(freezesResetAt: Date, timezone: string): Date {
  return startOfNextLocalMonth(freezesResetAt, timezone);
}

/**
 * If `now` is on or after the next monthly reset, restore the freeze allowance to 3.
 * Does not stack unused months. Cron will also call this; status/freeze apply it lazily.
 */
export function resetFreezesIfDue(user: FreezeUserState, now: Date): FreezeResetResult {
  const nextReset = nextFreezeResetDate(user.freezesResetAt, user.timezone);
  if (now.getTime() >= nextReset.getTime()) {
    return {
      freezesRemaining: MONTHLY_FREEZE_ALLOWANCE,
      freezesResetAt: startOfLocalMonth(now, user.timezone),
      didReset: true,
    };
  }
  return {
    freezesRemaining: user.freezesRemaining,
    freezesResetAt: user.freezesResetAt,
    didReset: false,
  };
}

function freezeWindowAge(missedLocalDate: Date, today: Date): number {
  return diffUtcDays(toDateOnly(today), toDateOnly(missedLocalDate));
}

/**
 * Restore a missed day with a freeze only when:
 * - the day is scheduled
 * - the day is unfilled (no COMPLETED/FROZEN check-in)
 * - it falls within the last 3 local days (yesterday through 3 days ago; not today)
 * - freezesRemaining > 0
 * - the day is not already frozen
 */
export function canFreeze(input: CanFreezeInput): CanFreezeResult {
  const isScheduled = input.isScheduled ?? true;
  const isUnfilled = input.isUnfilled ?? !input.alreadyFrozen;

  if (input.alreadyFrozen) {
    return { allowed: false, reason: 'ALREADY_FROZEN' };
  }
  if (!isUnfilled) {
    return { allowed: false, reason: 'NOT_UNFILLED' };
  }
  if (!isScheduled) {
    return { allowed: false, reason: 'NOT_SCHEDULED' };
  }
  if (input.freezesRemaining <= 0) {
    return { allowed: false, reason: 'NO_FREEZES_LEFT' };
  }

  const age = freezeWindowAge(input.missedLocalDate, input.today);
  if (age > FREEZE_LOOKBACK_DAYS) {
    return { allowed: false, reason: 'TOO_OLD' };
  }
  if (age < 1) {
    return { allowed: false, reason: 'NOT_IN_WINDOW' };
  }

  return { allowed: true };
}

export function getRestorableDays(
  habit: StreakHabit,
  checkIns: StreakCheckIn[],
  today: Date,
  freezesRemaining: number
): Date[] {
  return getMissedDays(habit, checkIns, today).filter((day) => {
    const result = canFreeze({
      missedLocalDate: day,
      today,
      freezesRemaining,
      alreadyFrozen: false,
      isScheduled: true,
      isUnfilled: true,
    });
    return result.allowed;
  });
}

export function restorableWindowStart(today: Date): Date {
  return addUtcDays(toDateOnly(today), -FREEZE_LOOKBACK_DAYS);
}

export function formatRestorableYmd(dates: Date[]): string[] {
  return dates.map(formatYmd);
}
