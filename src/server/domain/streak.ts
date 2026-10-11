import { formatInTimeZone } from 'date-fns-tz';
import { CheckInStatus, FrequencyType } from '@prisma/client';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface StreakHabit {
  frequencyType: FrequencyType;
  daysOfWeek: number[];
  intervalDays: number | null;
  startDate: Date;
  targetPerPeriod: number | null;
}

export interface StreakCheckIn {
  localDate: Date;
  status: CheckInStatus;
}

export interface StreakResult {
  current: number;
  longest: number;
}

/**
 * Calendar day at UTC midnight corresponding to `date`'s UTC Y-M-D.
 */
export function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function formatYmd(date: Date): string {
  const d = toDateOnly(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(toDateOnly(date).getTime() + days * MS_PER_DAY);
}

export function diffUtcDays(later: Date, earlier: Date): number {
  return Math.round((toDateOnly(later).getTime() - toDateOnly(earlier).getTime()) / MS_PER_DAY);
}

/**
 * Returns the user's local calendar day (UTC midnight Date) for a UTC instant.
 * Never reads the system clock; `instantUtc` is always provided by the caller.
 */
export function toLocalDate(instantUtc: Date, timezone: string): Date {
  const ymd = formatInTimeZone(instantUtc, timezone, 'yyyy-MM-dd');
  return parseYmd(ymd);
}

/**
 * Returns the calendar day string (YYYY-MM-DD) for a given UTC Date in the user's IANA timezone.
 */
export function getUserDayString(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
}

/**
 * Pure calculation to check if two dates are consecutive calendar days in the user's timezone.
 */
export function isConsecutiveDay(previousDate: Date, currentDate: Date, timezone: string): boolean {
  const prev = toLocalDate(previousDate, timezone);
  const curr = toLocalDate(currentDate, timezone);
  return diffUtcDays(curr, prev) === 1;
}

export function startOfISOWeek(date: Date): Date {
  const d = toDateOnly(date);
  const utcDay = d.getUTCDay(); // 0 = Sunday
  const daysSinceMonday = utcDay === 0 ? 6 : utcDay - 1;
  return addUtcDays(d, -daysSinceMonday);
}

export function endOfISOWeek(date: Date): Date {
  return addUtcDays(startOfISOWeek(date), 6);
}

export function eachDayInclusive(from: Date, to: Date): Date[] {
  const start = toDateOnly(from);
  const end = toDateOnly(to);
  if (end.getTime() < start.getTime()) return [];
  const days: Date[] = [];
  for (let d = start; d.getTime() <= end.getTime(); d = addUtcDays(d, 1)) {
    days.push(d);
  }
  return days;
}

function statusByDate(checkIns: StreakCheckIn[]): Map<string, CheckInStatus> {
  const rank: Record<CheckInStatus, number> = {
    [CheckInStatus.MISSED]: 0,
    [CheckInStatus.FROZEN]: 1,
    [CheckInStatus.COMPLETED]: 2,
  };
  const map = new Map<string, CheckInStatus>();
  for (const checkIn of checkIns) {
    const key = formatYmd(checkIn.localDate);
    const existing = map.get(key);
    if (!existing || rank[checkIn.status] > rank[existing]) {
      map.set(key, checkIn.status);
    }
  }
  return map;
}

function isSuccessStatus(status: CheckInStatus | undefined): boolean {
  return status === CheckInStatus.COMPLETED || status === CheckInStatus.FROZEN;
}

/**
 * Whether `localDate` is a scheduled occurrence of the habit.
 * DAILY: every day on/after startDate.
 * CUSTOM: weekday in daysOfWeek, or every intervalDays from startDate.
 * WEEKLY: every day on/after startDate (progress is evaluated per ISO week).
 */
export function isScheduledDay(habit: StreakHabit, localDate: Date): boolean {
  const day = toDateOnly(localDate);
  const start = toDateOnly(habit.startDate);
  if (day.getTime() < start.getTime()) {
    return false;
  }

  switch (habit.frequencyType) {
    case FrequencyType.DAILY:
      return true;
    case FrequencyType.WEEKLY:
      return true;
    case FrequencyType.CUSTOM: {
      const daysOfWeek = habit.daysOfWeek ?? [];
      if (daysOfWeek.length > 0) {
        return daysOfWeek.includes(day.getUTCDay());
      }
      const interval = habit.intervalDays;
      if (typeof interval === 'number' && interval >= 1) {
        const delta = diffUtcDays(day, start);
        return delta % interval === 0;
      }
      return false;
    }
    default:
      return false;
  }
}

function weekSuccessCount(statuses: Map<string, CheckInStatus>, weekStart: Date, startDate: Date, today: Date): number {
  const weekEnd = endOfISOWeek(weekStart);
  const from = toDateOnly(startDate).getTime() > weekStart.getTime() ? toDateOnly(startDate) : weekStart;
  const to = toDateOnly(today).getTime() < weekEnd.getTime() ? toDateOnly(today) : weekEnd;
  let count = 0;
  for (const day of eachDayInclusive(from, to)) {
    if (isSuccessStatus(statuses.get(formatYmd(day)))) {
      count += 1;
    }
  }
  return count;
}

function weekMeetsTarget(habit: StreakHabit, statuses: Map<string, CheckInStatus>, weekStart: Date, today: Date): boolean {
  const target = habit.targetPerPeriod ?? 1;
  return weekSuccessCount(statuses, weekStart, toDateOnly(habit.startDate), today) >= target;
}

/**
 * Consecutive successful scheduled units ending at `today`.
 * COMPLETED and FROZEN continue a streak. MISSED or an unfilled past scheduled day breaks it.
 * An unfilled today does not break the streak.
 * WEEKLY: an ISO week counts when COMPLETED+FROZEN >= targetPerPeriod; the current week is not
 * penalised until it has ended (after Sunday).
 */
export function computeStreak(habit: StreakHabit, checkIns: StreakCheckIn[], today: Date): StreakResult {
  const todayDate = toDateOnly(today);
  const start = toDateOnly(habit.startDate);
  if (todayDate.getTime() < start.getTime()) {
    return { current: 0, longest: 0 };
  }

  const statuses = statusByDate(checkIns);

  if (habit.frequencyType === FrequencyType.WEEKLY) {
    let current = 0;
    let longest = 0;
    let run = 0;
    const lastWeekStart = startOfISOWeek(todayDate);

    for (let weekStart = startOfISOWeek(start); weekStart.getTime() <= lastWeekStart.getTime(); weekStart = addUtcDays(weekStart, 7)) {
      const isCurrentWeek = weekStart.getTime() === lastWeekStart.getTime();
      const success = weekMeetsTarget(habit, statuses, weekStart, todayDate);
      if (success) {
        run += 1;
        if (run > longest) longest = run;
      } else if (isCurrentWeek) {
        break;
      } else {
        run = 0;
      }
    }

    current = run;
    return { current, longest };
  }

  let current = 0;
  let longest = 0;
  let run = 0;
  const todayKey = formatYmd(todayDate);

  for (const day of eachDayInclusive(start, todayDate)) {
    if (!isScheduledDay(habit, day)) {
      continue;
    }
    const key = formatYmd(day);
    const status = statuses.get(key);
    const isToday = key === todayKey;

    if (isSuccessStatus(status)) {
      run += 1;
      if (run > longest) longest = run;
    } else if (isToday && status === undefined) {
      break;
    } else {
      run = 0;
    }
  }

  current = run;
  return { current, longest };
}

/**
 * Scheduled past days with no COMPLETED/FROZEN check-in.
 * Today is never returned. WEEKLY only flags days in fully elapsed ISO weeks that missed the target.
 */
export function getMissedDays(habit: StreakHabit, checkIns: StreakCheckIn[], today: Date): Date[] {
  const todayDate = toDateOnly(today);
  const start = toDateOnly(habit.startDate);
  const yesterday = addUtcDays(todayDate, -1);
  if (yesterday.getTime() < start.getTime()) {
    return [];
  }

  const statuses = statusByDate(checkIns);

  if (habit.frequencyType === FrequencyType.WEEKLY) {
    const missed: Date[] = [];
    const lastElapsedWeekStart = addUtcDays(startOfISOWeek(todayDate), -7);

    for (let weekStart = startOfISOWeek(start); weekStart.getTime() <= lastElapsedWeekStart.getTime(); weekStart = addUtcDays(weekStart, 7)) {
      if (weekMeetsTarget(habit, statuses, weekStart, todayDate)) {
        continue;
      }
      const weekEnd = endOfISOWeek(weekStart);
      const from = start.getTime() > weekStart.getTime() ? start : weekStart;
      const to = yesterday.getTime() < weekEnd.getTime() ? yesterday : weekEnd;
      for (const day of eachDayInclusive(from, to)) {
        if (!isSuccessStatus(statuses.get(formatYmd(day)))) {
          missed.push(day);
        }
      }
    }
    return missed;
  }

  const missed: Date[] = [];
  for (const day of eachDayInclusive(start, yesterday)) {
    if (!isScheduledDay(habit, day)) continue;
    if (!isSuccessStatus(statuses.get(formatYmd(day)))) {
      missed.push(day);
    }
  }
  return missed;
}

export function lastCountedDate(habit: StreakHabit, checkIns: StreakCheckIn[], today: Date): Date | null {
  const todayDate = toDateOnly(today);
  const start = toDateOnly(habit.startDate);
  const statuses = statusByDate(checkIns);

  if (habit.frequencyType === FrequencyType.WEEKLY) {
    for (let weekStart = startOfISOWeek(todayDate); weekStart.getTime() >= startOfISOWeek(start).getTime(); weekStart = addUtcDays(weekStart, -7)) {
      if (weekMeetsTarget(habit, statuses, weekStart, todayDate)) {
        const weekEnd = endOfISOWeek(weekStart);
        const to = todayDate.getTime() < weekEnd.getTime() ? todayDate : weekEnd;
        for (let day = to; day.getTime() >= weekStart.getTime(); day = addUtcDays(day, -1)) {
          if (isSuccessStatus(statuses.get(formatYmd(day)))) {
            return day;
          }
        }
        return to;
      }
      const isCurrentWeek = weekStart.getTime() === startOfISOWeek(todayDate).getTime();
      if (!isCurrentWeek) {
        break;
      }
    }
    return null;
  }

  for (let day = todayDate; day.getTime() >= start.getTime(); day = addUtcDays(day, -1)) {
    if (!isScheduledDay(habit, day)) continue;
    const status = statuses.get(formatYmd(day));
    if (isSuccessStatus(status)) {
      return day;
    }
    if (formatYmd(day) === formatYmd(todayDate) && status === undefined) {
      continue;
    }
    break;
  }
  return null;
}
