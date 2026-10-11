import { describe, it, expect } from 'vitest';
import { getUserDayString, isConsecutiveDay } from '@/server/domain/streak';
import { ok, fail, parseZod, BadRequestError } from '@/server/lib/api';
import { z } from 'zod';

describe('Domain Logic: Timezone & Streak Day Computation', () => {
  it('computes correct calendar day in user timezone regardless of UTC day', () => {
    // 2026-10-09 20:00:00 UTC is 2026-10-10 05:30:00 in Asia/Kolkata (+05:30)
    const utcDate = new Date('2026-10-09T20:00:00Z');

    const dayInUTC = getUserDayString(utcDate, 'UTC');
    const dayInKolkata = getUserDayString(utcDate, 'Asia/Kolkata');

    expect(dayInUTC).toBe('2026-10-09');
    expect(dayInKolkata).toBe('2026-10-10');
  });

  it('determines consecutive days accurately', () => {
    const day1 = new Date('2026-10-09T10:00:00Z');
    const day2 = new Date('2026-10-10T10:00:00Z');
    const day3 = new Date('2026-10-12T10:00:00Z');

    expect(isConsecutiveDay(day1, day2, 'UTC')).toBe(true);
    expect(isConsecutiveDay(day1, day3, 'UTC')).toBe(false);
  });
});

describe('API Helpers', () => {
  it('ok() formats response according to { data } rule', async () => {
    const response = ok({ test: 'success' });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ data: { test: 'success' } });
  });

  it('fail() formats response according to { error: { code, message } } rule', async () => {
    const response = fail('CUSTOM_CODE', 'Custom error message', 400);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toEqual({
      error: {
        code: 'CUSTOM_CODE',
        message: 'Custom error message',
      },
    });
  });

  it('parseZod() validates valid data and throws BadRequestError on invalid data', () => {
    const schema = z.object({ title: z.string().min(3) });

    expect(parseZod(schema, { title: 'Habit' })).toEqual({ title: 'Habit' });
    expect(() => parseZod(schema, { title: 'ab' })).toThrowError(BadRequestError);
  });
});
