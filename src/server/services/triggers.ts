import { z } from 'zod';
import { prisma } from '@/server/lib/prisma';
import { BadRequestError, NotFoundError } from '@/server/lib/api';
import {
  computeHeatmap,
  computeTriggerAnalytics,
  heatmapRange,
  rangeStartFor,
  type AnalyticsCheckIn,
  type AnalyticsFreezeUse,
  type TriggerHabit,
} from '@/server/domain/triggers';
import { toLocalDate } from '@/server/domain/streak';

export const triggersQuerySchema = z.object({
  habitId: z
    .string()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined)),
  range: z.enum(['7d', '30d', '90d']).default('30d'),
});

export const heatmapQuerySchema = z.object({
  habitId: z
    .string()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined)),
  weeks: z
    .union([z.string(), z.number()])
    .optional()
    .default('14')
    .transform((val) => (typeof val === 'number' ? val : Number(val)))
    .refine((n) => Number.isInteger(n) && n >= 1 && n <= 52, {
      message: 'weeks must be an integer between 1 and 52',
    }),
});

export type TriggersQuery = z.infer<typeof triggersQuerySchema>;
export type HeatmapQuery = z.infer<typeof heatmapQuerySchema>;

async function loadUserHabits(userId: string, habitId: string | undefined): Promise<{
  timezone: string;
  habits: TriggerHabit[];
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  if (!user) {
    throw new NotFoundError('User not found', 'NOT_FOUND');
  }

  if (habitId) {
    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== userId) {
      throw new NotFoundError('Habit not found', 'NOT_FOUND');
    }
    return { timezone: user.timezone, habits: [habit] };
  }

  const habits = await prisma.habit.findMany({
    where: { userId, archivedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  return { timezone: user.timezone, habits };
}

async function loadCheckInsAndFreezes(
  userId: string,
  habitIds: string[],
  from: Date,
  to: Date
): Promise<{ checkIns: AnalyticsCheckIn[]; freezeUses: AnalyticsFreezeUse[] }> {
  if (habitIds.length === 0) {
    return { checkIns: [], freezeUses: [] };
  }

  const [checkIns, freezeUses] = await Promise.all([
    prisma.checkIn.findMany({
      where: {
        userId,
        habitId: { in: habitIds },
        localDate: { gte: from, lte: to },
      },
      select: { habitId: true, localDate: true, status: true, createdAt: true, note: true },
    }),
    prisma.freezeUse.findMany({
      where: {
        userId,
        habitId: { in: habitIds },
        localDate: { gte: from, lte: to },
      },
      select: { habitId: true, localDate: true, reasonTag: true, note: true },
    }),
  ]);

  return { checkIns, freezeUses };
}

export async function getTriggerAnalytics(userId: string, query: TriggersQuery, nowUtc: Date) {
  const { timezone, habits } = await loadUserHabits(userId, query.habitId);
  const today = toLocalDate(nowUtc, timezone);
  const from = rangeStartFor(today, query.range);
  const { checkIns, freezeUses } = await loadCheckInsAndFreezes(
    userId,
    habits.map((h) => h.id),
    from,
    today
  );

  return computeTriggerAnalytics({
    habits,
    checkIns,
    freezeUses,
    timezone,
    today,
    from,
  });
}

export async function getHeatmapAnalytics(userId: string, query: HeatmapQuery, nowUtc: Date) {
  const weeks = query.weeks;
  if (!Number.isInteger(weeks) || weeks < 1) {
    throw new BadRequestError('weeks must be between 1 and 52', 'VALIDATION_ERROR');
  }

  const { timezone, habits } = await loadUserHabits(userId, query.habitId);
  const today = toLocalDate(nowUtc, timezone);
  const { from, to } = heatmapRange(today, weeks);
  const { checkIns, freezeUses } = await loadCheckInsAndFreezes(
    userId,
    habits.map((h) => h.id),
    from,
    to
  );

  const heatmap = computeHeatmap({ habits, checkIns, freezeUses, today, weeks });
  return { timezone, weeks, ...heatmap };
}

export {
  computeTriggerAnalytics,
  computeHeatmap,
  rangeStartFor,
  heatmapRange,
  isLateNightCheckIn,
} from '@/server/domain/triggers';
