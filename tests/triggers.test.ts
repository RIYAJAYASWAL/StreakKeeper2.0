import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckInStatus, FreezeReasonTag, FrequencyType, HabitCategory } from '@prisma/client';
import {
  computeTriggerAnalytics,
  computeHeatmap,
  rangeStartFor,
  heatmapRange,
  isLateNightCheckIn,
  type TriggerHabit,
  type AnalyticsCheckIn,
  type AnalyticsFreezeUse,
} from '@/server/domain/triggers';
import { formatYmd, parseYmd, addUtcDays } from '@/server/domain/streak';
import {
  triggersQuerySchema,
  heatmapQuerySchema,
  getTriggerAnalytics,
  getHeatmapAnalytics,
} from '@/server/services/triggers';
import { prisma } from '@/server/lib/prisma';
import { GET as triggersRouteHandler } from '@app/api/analytics/triggers/route';
import { GET as heatmapRouteHandler } from '@app/api/analytics/heatmap/route';

vi.mock('@/server/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    habit: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    checkIn: {
      findMany: vi.fn(),
    },
    freezeUse: {
      findMany: vi.fn(),
    },
  },
}));

function makeHabit(partial: Partial<TriggerHabit> = {}): TriggerHabit {
  return {
    id: partial.id ?? 'habit-1',
    frequencyType: partial.frequencyType ?? FrequencyType.DAILY,
    daysOfWeek: partial.daysOfWeek ?? [],
    intervalDays: partial.intervalDays ?? null,
    startDate: partial.startDate ?? parseYmd('2026-10-01'),
    targetPerPeriod: partial.targetPerPeriod ?? null,
  };
}

describe('Triggers and Heatmap Domain Logic', () => {
  describe('Empty Data Cases', () => {
    const today = parseYmd('2026-10-15');
    const from = rangeStartFor(today, '30d');

    it('returns empty triggers, zero rate, and zero-filled weekly series when user has no habits', () => {
      const result = computeTriggerAnalytics({
        habits: [],
        checkIns: [],
        freezeUses: [],
        timezone: 'UTC',
        today,
        from,
      });

      expect(result.triggers).toEqual([]);
      expect(result.completionRate).toBe(0);
      expect(result.weekly.length).toBeGreaterThan(0);
      for (const w of result.weekly) {
        expect(w.scheduled).toBe(0);
        expect(w.completed).toBe(0);
        expect(w.rate).toBe(0);
      }
    });

    it('returns 100% completion rate and empty triggers when all scheduled days are completed', () => {
      const habit = makeHabit({ startDate: parseYmd('2026-10-10') });
      const checkIns: AnalyticsCheckIn[] = [
        { habitId: habit.id, localDate: parseYmd('2026-10-10'), status: CheckInStatus.COMPLETED, createdAt: new Date() },
        { habitId: habit.id, localDate: parseYmd('2026-10-11'), status: CheckInStatus.COMPLETED, createdAt: new Date() },
        { habitId: habit.id, localDate: parseYmd('2026-10-12'), status: CheckInStatus.COMPLETED, createdAt: new Date() },
        { habitId: habit.id, localDate: parseYmd('2026-10-13'), status: CheckInStatus.COMPLETED, createdAt: new Date() },
        { habitId: habit.id, localDate: parseYmd('2026-10-14'), status: CheckInStatus.COMPLETED, createdAt: new Date() },
        { habitId: habit.id, localDate: parseYmd('2026-10-15'), status: CheckInStatus.COMPLETED, createdAt: new Date() },
      ];

      const result = computeTriggerAnalytics({
        habits: [habit],
        checkIns,
        freezeUses: [],
        timezone: 'UTC',
        today,
        from,
      });

      expect(result.triggers).toEqual([]);
      expect(result.completionRate).toBe(100);
    });

    it('identifies missed days and day-of-week triggers when habits exist but checkIns and freezes are empty', () => {
      const habit = makeHabit({ startDate: parseYmd('2026-10-12') }); // Mon Oct 12
      // Days from Oct 12 to Oct 14 are past scheduled days with 0 checkIns -> 3 missed days (Mon, Tue, Wed)
      // Oct 15 is today -> open day (not missed yet)
      const result = computeTriggerAnalytics({
        habits: [habit],
        checkIns: [],
        freezeUses: [],
        timezone: 'UTC',
        today,
        from,
      });

      expect(result.completionRate).toBe(0);
      expect(result.triggers.length).toBe(3); // Mon, Tue, Wed (dow: 1, 2, 3)
      for (const t of result.triggers) {
        expect(t.key).toMatch(/^dow:[123]$/);
        expect(t.count).toBe(1);
        expect(t.percentage).toBe(33); // 1 / 3 rounded
      }
    });

    it('returns all NONE days across 14 weeks when heatmap has no habits', () => {
      const result = computeHeatmap({
        habits: [],
        checkIns: [],
        today,
        weeks: 14,
      });

      expect(result.days).toHaveLength(14 * 7);
      expect(result.days.every((d) => d.status === 'NONE')).toBe(true);
      expect(result.from).toBeDefined();
      expect(result.to).toBeDefined();
    });

    it('returns all NONE days when habit starts in the future', () => {
      const habit = makeHabit({ startDate: parseYmd('2026-11-01') });
      const result = computeHeatmap({
        habits: [habit],
        checkIns: [],
        today,
        weeks: 14,
      });

      expect(result.days).toHaveLength(14 * 7);
      expect(result.days.every((d) => d.status === 'NONE')).toBe(true);
    });
  });

  describe('Known Fixture Calculation', () => {
    // Reference parameters:
    // User timezone: America/New_York (UTC-4 in October)
    // Habit: Daily habit starting 2026-10-01
    // Today: 2026-10-15 (Thursday)
    // Range: 30d (2026-09-16 through 2026-10-15)
    // Scheduled days: 15 days (Oct 1 to Oct 15)
    const habit = makeHabit({
      id: 'habit-known',
      startDate: parseYmd('2026-10-01'),
      frequencyType: FrequencyType.DAILY,
    });
    const today = parseYmd('2026-10-15');
    const from = rangeStartFor(today, '30d');
    const timezone = 'America/New_York';

    // 15 days fixture breakdown:
    // Oct 1 (Thu): COMPLETED (09:00 NY)
    // Oct 2 (Fri): COMPLETED (10:00 NY)
    // Oct 3 (Sat): FROZEN (SICK, checkIn createdAt 23:30 NY -> late night!)
    // Oct 4 (Sun): MISSED (no checkIn)
    // Oct 5 (Mon): COMPLETED (08:30 NY)
    // Oct 6 (Tue): COMPLETED (12:00 NY)
    // Oct 7 (Wed): FROZEN (TRAVEL, checkIn createdAt 20:00 NY -> daytime)
    // Oct 8 (Thu): COMPLETED (19:00 NY)
    // Oct 9 (Fri): COMPLETED (checkIn createdAt 23:45 NY -> late night, but completed)
    // Oct 10 (Sat): FROZEN (SICK, checkIn createdAt 23:15 NY -> late night!)
    // Oct 11 (Sun): MISSED (no checkIn)
    // Oct 12 (Mon): COMPLETED (07:00 NY)
    // Oct 13 (Tue): COMPLETED (08:00 NY)
    // Oct 14 (Wed): COMPLETED (09:00 NY)
    // Oct 15 (Thu): COMPLETED (10:00 NY)

    const checkIns: AnalyticsCheckIn[] = [
      { habitId: habit.id, localDate: parseYmd('2026-10-01'), status: CheckInStatus.COMPLETED, createdAt: new Date('2026-10-01T13:00:00.000Z') },
      { habitId: habit.id, localDate: parseYmd('2026-10-02'), status: CheckInStatus.COMPLETED, createdAt: new Date('2026-10-02T14:00:00.000Z') },
      { habitId: habit.id, localDate: parseYmd('2026-10-03'), status: CheckInStatus.FROZEN, createdAt: new Date('2026-10-04T03:30:00.000Z') }, // 23:30 NY
      { habitId: habit.id, localDate: parseYmd('2026-10-05'), status: CheckInStatus.COMPLETED, createdAt: new Date('2026-10-05T12:30:00.000Z') },
      { habitId: habit.id, localDate: parseYmd('2026-10-06'), status: CheckInStatus.COMPLETED, createdAt: new Date('2026-10-06T16:00:00.000Z') },
      { habitId: habit.id, localDate: parseYmd('2026-10-07'), status: CheckInStatus.FROZEN, createdAt: new Date('2026-10-08T00:00:00.000Z') }, // 20:00 NY
      { habitId: habit.id, localDate: parseYmd('2026-10-08'), status: CheckInStatus.COMPLETED, createdAt: new Date('2026-10-08T23:00:00.000Z') },
      { habitId: habit.id, localDate: parseYmd('2026-10-09'), status: CheckInStatus.COMPLETED, createdAt: new Date('2026-10-10T03:45:00.000Z') }, // 23:45 NY
      { habitId: habit.id, localDate: parseYmd('2026-10-10'), status: CheckInStatus.FROZEN, createdAt: new Date('2026-10-11T03:15:00.000Z') }, // 23:15 NY
      { habitId: habit.id, localDate: parseYmd('2026-10-12'), status: CheckInStatus.COMPLETED, createdAt: new Date('2026-10-12T11:00:00.000Z') },
      { habitId: habit.id, localDate: parseYmd('2026-10-13'), status: CheckInStatus.COMPLETED, createdAt: new Date('2026-10-13T12:00:00.000Z') },
      { habitId: habit.id, localDate: parseYmd('2026-10-14'), status: CheckInStatus.COMPLETED, createdAt: new Date('2026-10-14T13:00:00.000Z') },
      { habitId: habit.id, localDate: parseYmd('2026-10-15'), status: CheckInStatus.COMPLETED, createdAt: new Date('2026-10-15T14:00:00.000Z') },
    ];

    const freezeUses: AnalyticsFreezeUse[] = [
      { habitId: habit.id, localDate: parseYmd('2026-10-03'), reasonTag: FreezeReasonTag.SICK },
      { habitId: habit.id, localDate: parseYmd('2026-10-07'), reasonTag: FreezeReasonTag.TRAVEL },
      { habitId: habit.id, localDate: parseYmd('2026-10-10'), reasonTag: FreezeReasonTag.SICK },
    ];

    it('computes exact trigger points, percentages, and descending sorting for the known fixture', () => {
      const result = computeTriggerAnalytics({
        habits: [habit],
        checkIns,
        freezeUses,
        timezone,
        today,
        from,
      });

      // Total scheduled: 15
      // Completed: 10
      // Completion rate = round(10/15 * 100) = 67%
      expect(result.completionRate).toBe(67);

      // Trigger days: 5 (Oct 3 Sat, Oct 4 Sun, Oct 7 Wed, Oct 10 Sat, Oct 11 Sun)
      // SICK: 2 / 5 = 40%
      // TRAVEL: 1 / 5 = 20%
      // dow:0 (Sun): 2 / 5 = 40%
      // dow:6 (Sat): 2 / 5 = 40%
      // dow:3 (Wed): 1 / 5 = 20%
      // late_night: 2 / 5 = 40% (Oct 3 and Oct 10)
      // Sorted descending:
      // 40% triggers (count=2): dow:0, dow:6, late_night, reason:SICK (alphabetical tiebreak on key)
      // 20% triggers (count=1): dow:3, reason:TRAVEL
      expect(result.triggers).toEqual([
        { key: 'dow:0', label: 'Sundays', percentage: 40, count: 2 },
        { key: 'dow:6', label: 'Saturdays', percentage: 40, count: 2 },
        { key: 'late_night', label: 'Late night (after 23:00)', percentage: 40, count: 2 },
        { key: 'reason:SICK', label: 'Sick', percentage: 40, count: 2 },
        { key: 'dow:3', label: 'Wednesdays', percentage: 20, count: 1 },
        { key: 'reason:TRAVEL', label: 'Travel', percentage: 20, count: 1 },
      ]);
    });

    it('computes per-week completion series for charts', () => {
      const result = computeTriggerAnalytics({
        habits: [habit],
        checkIns,
        freezeUses,
        timezone,
        today,
        from,
      });

      // From 2026-09-16 to 2026-10-15 covers 5 ISO weeks:
      // 1. 2026-09-14: 0 scheduled, 0 completed, rate 0
      // 2. 2026-09-21: 0 scheduled, 0 completed, rate 0
      // 3. 2026-09-28: Thu Oct 1 - Sun Oct 4 -> 4 scheduled, 2 completed (Oct 1, 2), rate 50
      // 4. 2026-10-05: Mon Oct 5 - Sun Oct 11 -> 7 scheduled, 4 completed (Oct 5, 6, 8, 9), rate 57
      // 5. 2026-10-12: Mon Oct 12 - Thu Oct 15 -> 4 scheduled, 4 completed (Oct 12, 13, 14, 15), rate 100
      expect(result.weekly).toEqual([
        { weekStart: '2026-09-14', scheduled: 0, completed: 0, rate: 0 },
        { weekStart: '2026-09-21', scheduled: 0, completed: 0, rate: 0 },
        { weekStart: '2026-09-28', scheduled: 4, completed: 2, rate: 50 },
        { weekStart: '2026-10-05', scheduled: 7, completed: 4, rate: 57 },
        { weekStart: '2026-10-12', scheduled: 4, completed: 4, rate: 100 },
      ]);
    });

    it('computes per-day heatmap statuses matching the fixture', () => {
      const heatmap = computeHeatmap({
        habits: [habit],
        checkIns,
        today,
        weeks: 14,
      });

      const dayMap = new Map(heatmap.days.map((d) => [d.date, d.status]));

      expect(dayMap.get('2026-10-01')).toBe('COMPLETED');
      expect(dayMap.get('2026-10-02')).toBe('COMPLETED');
      expect(dayMap.get('2026-10-03')).toBe('FROZEN');
      expect(dayMap.get('2026-10-04')).toBe('MISSED');
      expect(dayMap.get('2026-10-05')).toBe('COMPLETED');
      expect(dayMap.get('2026-10-06')).toBe('COMPLETED');
      expect(dayMap.get('2026-10-07')).toBe('FROZEN');
      expect(dayMap.get('2026-10-08')).toBe('COMPLETED');
      expect(dayMap.get('2026-10-09')).toBe('COMPLETED');
      expect(dayMap.get('2026-10-10')).toBe('FROZEN');
      expect(dayMap.get('2026-10-11')).toBe('MISSED');
      expect(dayMap.get('2026-10-12')).toBe('COMPLETED');
      expect(dayMap.get('2026-10-13')).toBe('COMPLETED');
      expect(dayMap.get('2026-10-14')).toBe('COMPLETED');
      expect(dayMap.get('2026-10-15')).toBe('COMPLETED');

      // Future days in current ISO week (Oct 16 Fri, Oct 17 Sat, Oct 18 Sun)
      expect(dayMap.get('2026-10-16')).toBe('NONE');
      expect(dayMap.get('2026-10-17')).toBe('NONE');
      expect(dayMap.get('2026-10-18')).toBe('NONE');

      // Past days before start date
      expect(dayMap.get('2026-09-30')).toBe('NONE');
    });

    it('resolves multi-habit heatmap status priority (COMPLETED > FROZEN > MISSED > NONE)', () => {
      const habitA = makeHabit({ id: 'h-a', startDate: parseYmd('2026-10-01') });
      const habitB = makeHabit({ id: 'h-b', startDate: parseYmd('2026-10-01') });

      const multiCheckIns: AnalyticsCheckIn[] = [
        // Oct 5: A is COMPLETED, B is MISSED (no checkin for B) -> COMPLETED wins
        { habitId: habitA.id, localDate: parseYmd('2026-10-05'), status: CheckInStatus.COMPLETED, createdAt: new Date() },
        // Oct 6: A is FROZEN, B is MISSED -> FROZEN wins
        { habitId: habitA.id, localDate: parseYmd('2026-10-06'), status: CheckInStatus.FROZEN, createdAt: new Date() },
        // Oct 7: both MISSED (no checkin for either) -> MISSED
      ];

      const heatmap = computeHeatmap({
        habits: [habitA, habitB],
        checkIns: multiCheckIns,
        today,
        weeks: 2,
      });

      const dayMap = new Map(heatmap.days.map((d) => [d.date, d.status]));
      expect(dayMap.get('2026-10-05')).toBe('COMPLETED');
      expect(dayMap.get('2026-10-06')).toBe('FROZEN');
      expect(dayMap.get('2026-10-07')).toBe('MISSED');
    });
  });

  describe('Timezone & Date Helpers', () => {
    it('isLateNightCheckIn detects after 23:00 local time correctly', () => {
      // 2026-10-04T03:30:00.000Z in America/New_York (UTC-4) is 2026-10-03 23:30 -> true
      expect(isLateNightCheckIn(new Date('2026-10-04T03:30:00.000Z'), 'America/New_York')).toBe(true);
      // 2026-10-04T02:59:00.000Z in America/New_York is 2026-10-03 22:59 -> false
      expect(isLateNightCheckIn(new Date('2026-10-04T02:59:00.000Z'), 'America/New_York')).toBe(false);

      // Instant 2026-10-09T18:00:00.000Z in Asia/Kolkata (UTC+5:30) is 23:30 -> true
      expect(isLateNightCheckIn(new Date('2026-10-09T18:00:00.000Z'), 'Asia/Kolkata')).toBe(true);
      // Same instant in UTC is 18:00 -> false
      expect(isLateNightCheckIn(new Date('2026-10-09T18:00:00.000Z'), 'UTC')).toBe(false);
    });

    it('rangeStartFor computes exactly 30 and 90 calendar days inclusive of today', () => {
      const today = parseYmd('2026-10-15');
      const start30 = rangeStartFor(today, '30d');
      expect(formatYmd(start30)).toBe('2026-09-16');

      const start90 = rangeStartFor(today, '90d');
      expect(formatYmd(start90)).toBe('2026-07-18');
    });

    it('heatmapRange covers exactly requested weeks aligned to ISO weeks', () => {
      const today = parseYmd('2026-10-15'); // Thu
      const { from, to } = heatmapRange(today, 14);

      // Current week: Mon Oct 12 to Sun Oct 18
      expect(formatYmd(to)).toBe('2026-10-18');
      // 14 weeks = 14 * 7 = 98 days total (inclusive)
      expect(formatYmd(from)).toBe(formatYmd(addUtcDays(to, -97)));
      expect(from.getUTCDay()).toBe(1); // Monday
      expect(to.getUTCDay()).toBe(0); // Sunday
    });
  });

  describe('Query Schemas Validation', () => {
    it('triggersQuerySchema parses valid inputs and defaults range to 30d', () => {
      expect(triggersQuerySchema.parse({})).toEqual({ habitId: undefined, range: '30d' });
      expect(triggersQuerySchema.parse({ range: '90d' })).toEqual({ habitId: undefined, range: '90d' });
      expect(triggersQuerySchema.parse({ habitId: 'h1', range: '30d' })).toEqual({
        habitId: 'h1',
        range: '30d',
      });
      expect(triggersQuerySchema.parse({ habitId: '   ' })).toEqual({
        habitId: undefined,
        range: '30d',
      });
      expect(() => triggersQuerySchema.parse({ range: '60d' })).toThrow();
    });

    it('heatmapQuerySchema parses valid weeks and coerces string or number', () => {
      expect(heatmapQuerySchema.parse({})).toEqual({ habitId: undefined, weeks: 14 });
      expect(heatmapQuerySchema.parse({ weeks: '14' })).toEqual({ habitId: undefined, weeks: 14 });
      expect(heatmapQuerySchema.parse({ weeks: 20 })).toEqual({ habitId: undefined, weeks: 20 });
      expect(heatmapQuerySchema.parse({ habitId: 'h1', weeks: '8' })).toEqual({
        habitId: 'h1',
        weeks: 8,
      });
      expect(() => heatmapQuerySchema.parse({ weeks: '0' })).toThrow();
      expect(() => heatmapQuerySchema.parse({ weeks: '53' })).toThrow();
      expect(() => heatmapQuerySchema.parse({ weeks: 'invalid' })).toThrow();
    });
  });

  describe('Service & API Route Endpoints', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      timezone: 'America/New_York',
      xp: 0,
      level: 1,
      freezesRemaining: 3,
      createdAt: new Date(),
    };

    const mockHabit = {
      id: 'habit-1',
      userId: 'user-1',
      name: 'Daily Meditation',
      category: HabitCategory.MINDFULNESS,
      description: null,
      frequencyType: FrequencyType.DAILY,
      targetPerPeriod: null,
      daysOfWeek: [],
      intervalDays: null,
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      archivedAt: null,
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
      updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    };

    beforeEach(() => {
      vi.clearAllMocks();
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.user.findFirst as any).mockResolvedValue(mockUser);
      (prisma.habit.findMany as any).mockResolvedValue([mockHabit]);
      (prisma.habit.findUnique as any).mockResolvedValue(mockHabit);
      (prisma.checkIn.findMany as any).mockResolvedValue([]);
      (prisma.freezeUse.findMany as any).mockResolvedValue([]);
    });

    it('getTriggerAnalytics integrates service layer and returns domain analytics', async () => {
      const result = await getTriggerAnalytics(mockUser.id, { range: '30d' }, new Date('2026-10-15T12:00:00.000Z'));
      expect(result).toHaveProperty('triggers');
      expect(result).toHaveProperty('completionRate');
      expect(result).toHaveProperty('weekly');
    });

    it('getHeatmapAnalytics integrates service layer and returns heatmap with timezone and weeks', async () => {
      const result = await getHeatmapAnalytics(mockUser.id, { weeks: 14 }, new Date('2026-10-15T12:00:00.000Z'));
      expect(result.timezone).toBe('America/New_York');
      expect(result.weeks).toBe(14);
      expect(result).toHaveProperty('from');
      expect(result).toHaveProperty('to');
      expect(result.days).toHaveLength(14 * 7);
    });

    it('GET /api/analytics/triggers returns 200 with formatted triggers data', async () => {
      const req = new Request('http://localhost/api/analytics/triggers?range=30d', {
        headers: { authorization: `Bearer ${mockUser.id}` },
      });

      const res = await triggersRouteHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveProperty('triggers');
      expect(json.data).toHaveProperty('completionRate');
      expect(json.data).toHaveProperty('weekly');
    });

    it('GET /api/analytics/heatmap returns 200 with formatted heatmap data', async () => {
      const req = new Request('http://localhost/api/analytics/heatmap?weeks=14', {
        headers: { authorization: `Bearer ${mockUser.id}` },
      });

      const res = await heatmapRouteHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveProperty('timezone', 'America/New_York');
      expect(json.data).toHaveProperty('weeks', 14);
      expect(json.data).toHaveProperty('days');
      expect(Array.isArray(json.data.days)).toBe(true);
    });
  });
});
