import { describe, it, expect } from 'vitest';
import { CheckInStatus, FrequencyType } from '@prisma/client';
import {
  toLocalDate,
  isScheduledDay,
  computeStreak,
  getMissedDays,
  parseYmd,
  formatYmd,
  type StreakHabit,
  type StreakCheckIn,
} from '@/server/domain/streak';

function habit(partial: Partial<StreakHabit> & Pick<StreakHabit, 'frequencyType'>): StreakHabit {
  return {
    daysOfWeek: [],
    intervalDays: null,
    startDate: parseYmd('2026-10-01'),
    targetPerPeriod: null,
    ...partial,
  };
}

function checkIn(ymd: string, status: CheckInStatus = CheckInStatus.COMPLETED): StreakCheckIn {
  return { localDate: parseYmd(ymd), status };
}

describe('toLocalDate', () => {
  it('maps the same UTC instant to different calendar days in Asia/Kolkata vs America/Los_Angeles', () => {
    const instant = new Date('2026-10-09T18:30:00.000Z');

    const kolkata = toLocalDate(instant, 'Asia/Kolkata');
    const la = toLocalDate(instant, 'America/Los_Angeles');

    expect(formatYmd(kolkata)).toBe('2026-10-10');
    expect(formatYmd(la)).toBe('2026-10-09');
  });

  it('places a pre-midnight LA instant on the previous calendar day while Kolkata is already next day', () => {
    const instant = new Date('2026-10-09T06:30:00.000Z');

    expect(formatYmd(toLocalDate(instant, 'America/Los_Angeles'))).toBe('2026-10-08');
    expect(formatYmd(toLocalDate(instant, 'Asia/Kolkata'))).toBe('2026-10-09');
  });

  it('keeps spring-forward DST instants on the correct local calendar day in America/Los_Angeles', () => {
    // 2026-03-08: clocks skip 02:00 → 03:00. PST (UTC-8) then PDT (UTC-7).
    const beforeSpringForward = new Date('2026-03-08T09:30:00.000Z'); // 01:30 PST
    const afterSpringForward = new Date('2026-03-08T10:30:00.000Z'); // 03:30 PDT
    const stillPreviousEvening = new Date('2026-03-08T07:30:00.000Z'); // 23:30 PST on Mar 7

    expect(formatYmd(toLocalDate(beforeSpringForward, 'America/Los_Angeles'))).toBe('2026-03-08');
    expect(formatYmd(toLocalDate(afterSpringForward, 'America/Los_Angeles'))).toBe('2026-03-08');
    expect(formatYmd(toLocalDate(stillPreviousEvening, 'America/Los_Angeles'))).toBe('2026-03-07');
    expect(formatYmd(toLocalDate(stillPreviousEvening, 'Asia/Kolkata'))).toBe('2026-03-08');
  });

  it('keeps fall-back DST instants on the correct local calendar day in America/Los_Angeles', () => {
    // 2026-11-01: clocks repeat 01:00. PDT then PST.
    const firstOneThirty = new Date('2026-11-01T08:30:00.000Z'); // 01:30 PDT
    const secondOneThirty = new Date('2026-11-01T09:30:00.000Z'); // 01:30 PST
    const afterFallBack = new Date('2026-11-01T10:30:00.000Z'); // 02:30 PST

    expect(formatYmd(toLocalDate(firstOneThirty, 'America/Los_Angeles'))).toBe('2026-11-01');
    expect(formatYmd(toLocalDate(secondOneThirty, 'America/Los_Angeles'))).toBe('2026-11-01');
    expect(formatYmd(toLocalDate(afterFallBack, 'America/Los_Angeles'))).toBe('2026-11-01');
  });
});

describe('isScheduledDay', () => {
  it('marks every day on/after startDate as scheduled for DAILY habits', () => {
    const daily = habit({ frequencyType: FrequencyType.DAILY, startDate: parseYmd('2026-10-05') });
    expect(isScheduledDay(daily, parseYmd('2026-10-04'))).toBe(false);
    expect(isScheduledDay(daily, parseYmd('2026-10-05'))).toBe(true);
    expect(isScheduledDay(daily, parseYmd('2026-10-11'))).toBe(true);
  });

  it('matches CUSTOM daysOfWeek (JS 0=Sunday … 6=Saturday)', () => {
    const custom = habit({
      frequencyType: FrequencyType.CUSTOM,
      daysOfWeek: [1, 3, 5],
      startDate: parseYmd('2026-10-05'), // Monday
    });
    expect(isScheduledDay(custom, parseYmd('2026-10-05'))).toBe(true); // Mon
    expect(isScheduledDay(custom, parseYmd('2026-10-06'))).toBe(false); // Tue
    expect(isScheduledDay(custom, parseYmd('2026-10-07'))).toBe(true); // Wed
    expect(isScheduledDay(custom, parseYmd('2026-10-09'))).toBe(true); // Fri
    expect(isScheduledDay(custom, parseYmd('2026-10-11'))).toBe(false); // Sun
  });

  it('matches CUSTOM intervalDays counted from startDate', () => {
    const custom = habit({
      frequencyType: FrequencyType.CUSTOM,
      intervalDays: 3,
      startDate: parseYmd('2026-10-01'),
    });
    expect(isScheduledDay(custom, parseYmd('2026-10-01'))).toBe(true);
    expect(isScheduledDay(custom, parseYmd('2026-10-02'))).toBe(false);
    expect(isScheduledDay(custom, parseYmd('2026-10-04'))).toBe(true);
    expect(isScheduledDay(custom, parseYmd('2026-10-07'))).toBe(true);
    expect(isScheduledDay(custom, parseYmd('2026-10-08'))).toBe(false);
  });

  it('treats every day on/after startDate as a WEEKLY check-in day (evaluation is per ISO week)', () => {
    const weekly = habit({
      frequencyType: FrequencyType.WEEKLY,
      targetPerPeriod: 3,
      startDate: parseYmd('2026-10-07'),
    });
    expect(isScheduledDay(weekly, parseYmd('2026-10-06'))).toBe(false);
    expect(isScheduledDay(weekly, parseYmd('2026-10-07'))).toBe(true);
    expect(isScheduledDay(weekly, parseYmd('2026-10-11'))).toBe(true);
  });
});

describe('computeStreak', () => {
  it('does not break a DAILY streak when today is still unfilled', () => {
    const daily = habit({ frequencyType: FrequencyType.DAILY, startDate: parseYmd('2026-10-01') });
    const checkIns = ['2026-10-01', '2026-10-02', '2026-10-03'].map((d) => checkIn(d));
    expect(computeStreak(daily, checkIns, parseYmd('2026-10-04'))).toEqual({ current: 3, longest: 3 });
  });

  it('breaks on MISSED or an unfilled past scheduled day', () => {
    const daily = habit({ frequencyType: FrequencyType.DAILY, startDate: parseYmd('2026-10-01') });
    const withMissed = [
      checkIn('2026-10-01'),
      checkIn('2026-10-02', CheckInStatus.MISSED),
      checkIn('2026-10-03'),
    ];
    expect(computeStreak(daily, withMissed, parseYmd('2026-10-03'))).toEqual({ current: 1, longest: 1 });

    const withGap = [checkIn('2026-10-01'), checkIn('2026-10-03')];
    expect(computeStreak(daily, withGap, parseYmd('2026-10-03'))).toEqual({ current: 1, longest: 1 });
  });

  it('lets a frozen day in the middle continue the streak', () => {
    const daily = habit({ frequencyType: FrequencyType.DAILY, startDate: parseYmd('2026-10-01') });
    const checkIns = [
      checkIn('2026-10-01'),
      checkIn('2026-10-02', CheckInStatus.FROZEN),
      checkIn('2026-10-03'),
      checkIn('2026-10-04'),
    ];
    expect(computeStreak(daily, checkIns, parseYmd('2026-10-04'))).toEqual({ current: 4, longest: 4 });
  });

  it('tracks longest separately from current after a break', () => {
    const daily = habit({ frequencyType: FrequencyType.DAILY, startDate: parseYmd('2026-10-01') });
    const checkIns = [
      checkIn('2026-10-01'),
      checkIn('2026-10-02'),
      checkIn('2026-10-03'),
      checkIn('2026-10-04'),
      checkIn('2026-10-05'),
      checkIn('2026-10-06', CheckInStatus.MISSED),
      checkIn('2026-10-07'),
      checkIn('2026-10-08', CheckInStatus.FROZEN),
      checkIn('2026-10-09'),
    ];
    expect(computeStreak(daily, checkIns, parseYmd('2026-10-10'))).toEqual({ current: 3, longest: 5 });
  });

  it('counts CUSTOM interval days only, ignoring days in between', () => {
    const custom = habit({
      frequencyType: FrequencyType.CUSTOM,
      intervalDays: 3,
      startDate: parseYmd('2026-10-01'),
    });
    const checkIns = [checkIn('2026-10-01'), checkIn('2026-10-04'), checkIn('2026-10-07')];
    expect(computeStreak(custom, checkIns, parseYmd('2026-10-08'))).toEqual({ current: 3, longest: 3 });

    const skipped = [checkIn('2026-10-01'), checkIn('2026-10-07')];
    expect(computeStreak(custom, skipped, parseYmd('2026-10-08'))).toEqual({ current: 1, longest: 1 });
  });

  it('counts a WEEKLY week when COMPLETED (and FROZEN) meet targetPerPeriod', () => {
    const weekly = habit({
      frequencyType: FrequencyType.WEEKLY,
      targetPerPeriod: 3,
      startDate: parseYmd('2026-10-05'), // Monday
    });
    const checkIns = [
      checkIn('2026-10-05'),
      checkIn('2026-10-06'),
      checkIn('2026-10-08', CheckInStatus.FROZEN),
    ];
    // Sunday 2026-10-11 is still the current ISO week — already met target, so it counts.
    expect(computeStreak(weekly, checkIns, parseYmd('2026-10-11'))).toEqual({ current: 1, longest: 1 });
  });

  it('does not penalise the current ISO week until it ends (Sunday rollover)', () => {
    const weekly = habit({
      frequencyType: FrequencyType.WEEKLY,
      targetPerPeriod: 3,
      startDate: parseYmd('2026-10-05'),
    });
    const priorWeek = [
      checkIn('2026-10-05'),
      checkIn('2026-10-06'),
      checkIn('2026-10-07'),
    ];
    const currentWeekPartial = [
      ...priorWeek,
      checkIn('2026-10-12'),
      checkIn('2026-10-13'),
    ];

    // Sunday 2026-10-11: current week has met target (Mon–Wed). Streak includes that week.
    expect(computeStreak(weekly, priorWeek, parseYmd('2026-10-11'))).toEqual({ current: 1, longest: 1 });

    // Monday 2026-10-12: previous week has ended and succeeded; new week is incomplete but not penalised.
    expect(computeStreak(weekly, currentWeekPartial, parseYmd('2026-10-12'))).toEqual({
      current: 1,
      longest: 1,
    });

    // Still only 2 completions in the new week on Sunday — week not penalised yet.
    expect(computeStreak(weekly, currentWeekPartial, parseYmd('2026-10-18'))).toEqual({
      current: 1,
      longest: 1,
    });

    // Monday 2026-10-19: previous week ended short of 3 → streak breaks. Longest remains 1.
    expect(computeStreak(weekly, currentWeekPartial, parseYmd('2026-10-19'))).toEqual({
      current: 0,
      longest: 1,
    });
  });

  it('rolls WEEKLY longest vs current across Sunday boundaries', () => {
    const weekly = habit({
      frequencyType: FrequencyType.WEEKLY,
      targetPerPeriod: 2,
      startDate: parseYmd('2026-10-05'),
    });
    const checkIns = [
      // week 1 (Mon 5 – Sun 11)
      checkIn('2026-10-05'),
      checkIn('2026-10-09'),
      // week 2 (Mon 12 – Sun 18)
      checkIn('2026-10-12'),
      checkIn('2026-10-14'),
      // week 3 missed (no check-ins)
      // week 4 (Mon 26 – Sun Nov 1)
      checkIn('2026-10-26'),
      checkIn('2026-10-27'),
    ];

    expect(computeStreak(weekly, checkIns, parseYmd('2026-10-28'))).toEqual({ current: 1, longest: 2 });
  });
});

describe('getMissedDays', () => {
  it('returns scheduled past days without COMPLETED/FROZEN and excludes today', () => {
    const daily = habit({ frequencyType: FrequencyType.DAILY, startDate: parseYmd('2026-10-01') });
    const checkIns = [checkIn('2026-10-01'), checkIn('2026-10-03', CheckInStatus.FROZEN)];
    const missed = getMissedDays(daily, checkIns, parseYmd('2026-10-04')).map(formatYmd);
    expect(missed).toEqual(['2026-10-02']);
  });

  it('includes explicit MISSED status days', () => {
    const daily = habit({ frequencyType: FrequencyType.DAILY, startDate: parseYmd('2026-10-01') });
    const missed = getMissedDays(daily, [checkIn('2026-10-01', CheckInStatus.MISSED)], parseYmd('2026-10-02')).map(
      formatYmd
    );
    expect(missed).toEqual(['2026-10-01']);
  });

  it('only considers CUSTOM interval occurrences', () => {
    const custom = habit({
      frequencyType: FrequencyType.CUSTOM,
      intervalDays: 3,
      startDate: parseYmd('2026-10-01'),
    });
    const missed = getMissedDays(custom, [checkIn('2026-10-01')], parseYmd('2026-10-08')).map(formatYmd);
    expect(missed).toEqual(['2026-10-04', '2026-10-07']);
  });

  it('does not treat unfilled days in the current ISO week as missed until the week ends', () => {
    const weekly = habit({
      frequencyType: FrequencyType.WEEKLY,
      targetPerPeriod: 3,
      startDate: parseYmd('2026-10-05'),
    });
    const checkIns = [checkIn('2026-10-05')];
    expect(getMissedDays(weekly, checkIns, parseYmd('2026-10-11')).map(formatYmd)).toEqual([]);
    expect(getMissedDays(weekly, checkIns, parseYmd('2026-10-12')).map(formatYmd)).toEqual([
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
  });
});
