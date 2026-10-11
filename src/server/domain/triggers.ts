import { CheckInStatus, FreezeReasonTag } from '@prisma/client';
import { formatInTimeZone } from 'date-fns-tz';
import {
  addUtcDays,
  eachDayInclusive,
  endOfISOWeek,
  formatYmd,
  isScheduledDay,
  startOfISOWeek,
  toDateOnly,
  type StreakHabit,
} from '@/server/domain/streak';

export type HeatmapStatus = 'COMPLETED' | 'FROZEN' | 'MISSED' | 'NONE';

export interface TriggerPoint {
  key: string;
  label: string;
  percentage: number;
  count: number;
}

export interface WeeklyCompletion {
  weekStart: string;
  scheduled: number;
  completed: number;
  rate: number;
}

export interface HeatmapDay {
  date: string;
  status: HeatmapStatus;
  freezeReason?: string;
  freezeNote?: string;
  note?: string;
}

export interface AnalyticsCheckIn {
  habitId: string;
  localDate: Date;
  status: CheckInStatus;
  createdAt: Date;
  note?: string | null;
}

export interface AnalyticsFreezeUse {
  habitId: string;
  localDate: Date;
  reasonTag: FreezeReasonTag;
  note?: string | null;
}

export interface TriggerHabit extends StreakHabit {
  id: string;
}

const REASON_LABELS: Record<FreezeReasonTag, string> = {
  SICK: 'Sick',
  TRAVEL: 'Travel',
  WORK: 'Work',
  POOR_SLEEP: 'Poor sleep',
  FORGOT: 'Forgot',
  STRESS: 'Stress',
  OTHER: 'Other',
};

const DOW_LABELS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

const STATUS_PRIORITY: Record<HeatmapStatus, number> = {
  COMPLETED: 3,
  FROZEN: 2,
  MISSED: 1,
  NONE: 0,
};

export function rangeStartFor(today: Date, range: '7d' | '30d' | '90d'): Date {
  const days = range === '90d' ? 90 : range === '7d' ? 7 : 30;
  return addUtcDays(toDateOnly(today), -(days - 1));
}

export function heatmapRange(today: Date, weeks: number): { from: Date; to: Date } {
  const currentWeekStart = startOfISOWeek(today);
  const from = addUtcDays(currentWeekStart, -7 * (weeks - 1));
  const to = endOfISOWeek(today);
  return { from, to };
}

export function isLateNightCheckIn(createdAt: Date, timezone: string): boolean {
  const hour = Number(formatInTimeZone(createdAt, timezone, 'HH'));
  return hour >= 23;
}

type DayKind = 'COMPLETED' | 'FROZEN' | 'MISSED' | 'OPEN';

function classifyScheduledDay(
  day: Date,
  today: Date,
  checkIn: AnalyticsCheckIn | undefined
): DayKind {
  if (checkIn?.status === CheckInStatus.COMPLETED) return 'COMPLETED';
  if (checkIn?.status === CheckInStatus.FROZEN) return 'FROZEN';
  if (checkIn?.status === CheckInStatus.MISSED) return 'MISSED';
  if (day.getTime() < toDateOnly(today).getTime()) return 'MISSED';
  return 'OPEN';
}

function indexByHabitDate<T extends { habitId: string; localDate: Date }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    map.set(`${row.habitId}:${formatYmd(row.localDate)}`, row);
  }
  return map;
}

function roundPercent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

function sortTriggers(points: TriggerPoint[]): TriggerPoint[] {
  return [...points].sort((a, b) => {
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    if (b.count !== a.count) return b.count - a.count;
    return a.key.localeCompare(b.key);
  });
}

export function computeTriggerAnalytics(input: {
  habits: TriggerHabit[];
  checkIns: AnalyticsCheckIn[];
  freezeUses: AnalyticsFreezeUse[];
  timezone: string;
  today: Date;
  from: Date;
}): {
  triggers: TriggerPoint[];
  completionRate: number;
  weekly: WeeklyCompletion[];
} {
  const today = toDateOnly(input.today);
  const from = toDateOnly(input.from);
  const checkInByKey = indexByHabitDate(input.checkIns);
  const freezeByKey = indexByHabitDate(input.freezeUses);

  const reasonCounts = new Map<FreezeReasonTag, number>();
  const dowCounts = new Map<number, number>();
  let lateNight = 0;
  let triggerDays = 0;
  let scheduled = 0;
  let completed = 0;

  const weeklyMap = new Map<string, { scheduled: number; completed: number }>();
  for (let weekStart = startOfISOWeek(from); weekStart.getTime() <= startOfISOWeek(today).getTime(); weekStart = addUtcDays(weekStart, 7)) {
    weeklyMap.set(formatYmd(weekStart), { scheduled: 0, completed: 0 });
  }

  for (const habit of input.habits) {
    for (const day of eachDayInclusive(from, today)) {
      if (!isScheduledDay(habit, day)) continue;

      scheduled += 1;
      const weekKey = formatYmd(startOfISOWeek(day));
      const week = weeklyMap.get(weekKey) ?? { scheduled: 0, completed: 0 };
      week.scheduled += 1;

      const key = `${habit.id}:${formatYmd(day)}`;
      const checkIn = checkInByKey.get(key);
      const kind = classifyScheduledDay(day, today, checkIn);

      if (kind === 'COMPLETED') {
        completed += 1;
        week.completed += 1;
      } else if (kind === 'FROZEN' || kind === 'MISSED') {
        triggerDays += 1;
        const dow = day.getUTCDay();
        dowCounts.set(dow, (dowCounts.get(dow) ?? 0) + 1);

        const freeze = freezeByKey.get(key);
        if (freeze) {
          reasonCounts.set(freeze.reasonTag, (reasonCounts.get(freeze.reasonTag) ?? 0) + 1);
        }
        if (checkIn && isLateNightCheckIn(checkIn.createdAt, input.timezone)) {
          lateNight += 1;
        }
      }

      weeklyMap.set(weekKey, week);
    }
  }

  const triggers: TriggerPoint[] = [];
  for (const [tag, count] of reasonCounts) {
    triggers.push({
      key: `reason:${tag}`,
      label: REASON_LABELS[tag],
      count,
      percentage: roundPercent(count, triggerDays),
    });
  }
  for (const [dow, count] of dowCounts) {
    triggers.push({
      key: `dow:${dow}`,
      label: DOW_LABELS[dow],
      count,
      percentage: roundPercent(count, triggerDays),
    });
  }
  if (lateNight > 0) {
    triggers.push({
      key: 'late_night',
      label: 'Late night (after 23:00)',
      count: lateNight,
      percentage: roundPercent(lateNight, triggerDays),
    });
  }

  const weekly: WeeklyCompletion[] = [...weeklyMap.entries()].map(([weekStart, stats]) => ({
    weekStart,
    scheduled: stats.scheduled,
    completed: stats.completed,
    rate: roundPercent(stats.completed, stats.scheduled),
  }));

  return {
    triggers: sortTriggers(triggers),
    completionRate: roundPercent(completed, scheduled),
    weekly,
  };
}

export function computeHeatmap(input: {
  habits: TriggerHabit[];
  checkIns: AnalyticsCheckIn[];
  freezeUses?: AnalyticsFreezeUse[];
  today: Date;
  weeks: number;
}): { from: string; to: string; days: HeatmapDay[] } {
  const today = toDateOnly(input.today);
  const { from, to } = heatmapRange(today, input.weeks);
  const checkInByKey = indexByHabitDate(input.checkIns);
  const freezeByKey = input.freezeUses ? indexByHabitDate(input.freezeUses) : new Map<string, AnalyticsFreezeUse>();

  const days: HeatmapDay[] = eachDayInclusive(from, to).map((day) => {
    let status: HeatmapStatus = 'NONE';
    let freezeReason: string | undefined;
    let freezeNote: string | undefined;
    let note: string | undefined;

    for (const habit of input.habits) {
      const key = `${habit.id}:${formatYmd(day)}`;
      const checkIn = checkInByKey.get(key);
      const freezeUse = freezeByKey.get(key);

      let dayStatus: HeatmapStatus = 'NONE';
      if (checkIn) {
        dayStatus = checkIn.status;
        if (checkIn.note) {
          note = checkIn.note;
        }
      } else if (isScheduledDay(habit, day) && day.getTime() < today.getTime()) {
        dayStatus = 'MISSED';
      }

      if (STATUS_PRIORITY[dayStatus] > STATUS_PRIORITY[status]) {
        status = dayStatus;
      }

      if (dayStatus === 'FROZEN') {
        if (freezeUse) {
          freezeReason = REASON_LABELS[freezeUse.reasonTag] || 'Streak Freeze';
          freezeNote = freezeUse.note || checkIn?.note || undefined;
        } else {
          freezeReason = 'Streak Freeze';
          freezeNote = checkIn?.note || undefined;
        }
      }
    }

    const dayObj: HeatmapDay = { date: formatYmd(day), status };
    if (freezeReason) dayObj.freezeReason = freezeReason;
    if (freezeNote) dayObj.freezeNote = freezeNote;
    if (note) dayObj.note = note;

    return dayObj;
  });

  return { from: formatYmd(from), to: formatYmd(to), days };
}
