import { CheckInStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/server/lib/prisma';
import { BadRequestError, ConflictError, NotFoundError } from '@/server/lib/api';
import {
  computeStreak,
  formatYmd,
  lastCountedDate,
  toLocalDate,
  isScheduledDay,
  parseYmd,
  type StreakHabit,
} from '@/server/domain/streak';

import { config } from '@/server/lib/config';
import { calculateCheckInXp } from '@/server/domain/xp';
import { awardXp } from '@/server/services/xp';

/**
 * Product rule: a check-in may require a journal read or journal authored on the same
 * local calendar day. Controlled via config.REQUIRE_DAILY_JOURNAL_READ.
 */
export const DAILY_JOURNAL_RULE_ENABLED = false;

export const createCheckInSchema = z
  .object({
    note: z.string().trim().max(1000, 'Note must be at most 1000 characters').optional().nullable(),
  })
  .strict();

export const listCheckInsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD'),
});

export type CreateCheckInInput = z.infer<typeof createCheckInSchema>;

function isDailyJournalSatisfied(journalReadsOnLocalDate: number, journalsAuthoredOnLocalDate: number): boolean {
  return journalReadsOnLocalDate > 0 || journalsAuthoredOnLocalDate > 0;
}

async function countJournalsAuthoredOnLocalDate(
  tx: Prisma.TransactionClient,
  userId: string,
  timezone: string,
  localDate: Date
): Promise<number> {
  const ymd = formatYmd(localDate);
  const journals = await tx.journal.findMany({
    where: { authorId: userId },
    select: { createdAt: true },
  });
  return journals.filter((j) => formatYmd(toLocalDate(j.createdAt, timezone)) === ymd).length;
}

async function assertDailyJournalRule(
  tx: Prisma.TransactionClient,
  userId: string,
  timezone: string,
  localDate: Date
) {
  if (config.REQUIRE_DAILY_JOURNAL_READ) {
    const reads = await tx.journalRead.count({ where: { userId, localDate } });
    if (reads === 0) {
      throw new BadRequestError(
        'Daily journal rule requires a journal read today before checking in',
        'DAILY_JOURNAL_REQUIRED'
      );
    }
    return;
  }

  if (!DAILY_JOURNAL_RULE_ENABLED) {
    return;
  }

  const [reads, authored] = await Promise.all([
    tx.journalRead.count({ where: { userId, localDate } }),
    countJournalsAuthoredOnLocalDate(tx, userId, timezone, localDate),
  ]);

  if (!isDailyJournalSatisfied(reads, authored)) {
    throw new BadRequestError(
      'Daily journal rule requires a journal read or journal entry today before checking in',
      'DAILY_JOURNAL_REQUIRED'
    );
  }
}

export async function persistStreak(tx: Prisma.TransactionClient, habit: StreakHabit & { id: string }, today: Date) {
  const checkIns = await tx.checkIn.findMany({
    where: { habitId: habit.id },
    select: { localDate: true, status: true },
  });
  const { current, longest } = computeStreak(habit, checkIns, today);
  const counted = lastCountedDate(habit, checkIns, today);

  return tx.streak.upsert({
    where: { habitId: habit.id },
    create: {
      habitId: habit.id,
      current,
      longest,
      lastCountedDate: counted,
    },
    update: {
      current,
      longest,
      lastCountedDate: counted,
    },
  });
}

export async function createCheckIn(userId: string, habitId: string, input: CreateCheckInInput, nowUtc: Date) {
  return prisma.$transaction(async (tx) => {
    const habit = await tx.habit.findUnique({
      where: { id: habitId },
      include: { user: { select: { id: true, timezone: true } } },
    });

    if (!habit || habit.userId !== userId) {
      throw new NotFoundError('Habit not found', 'NOT_FOUND');
    }
    if (habit.archivedAt) {
      throw new BadRequestError('Cannot check in to an archived habit', 'HABIT_ARCHIVED');
    }

    const localDate = toLocalDate(nowUtc, habit.user.timezone);

    if (!isScheduledDay(habit, localDate)) {
      throw new BadRequestError('Today is not a scheduled day for this habit', 'NOT_SCHEDULED_DAY');
    }

    await assertDailyJournalRule(tx, userId, habit.user.timezone, localDate);

    const duplicate = await tx.checkIn.findUnique({
      where: {
        habitId_localDate: { habitId, localDate },
      },
    });
    if (duplicate) {
      throw new ConflictError('A check-in already exists for this local date', 'DUPLICATE_CHECKIN');
    }

    let checkIn;
    try {
      checkIn = await tx.checkIn.create({
        data: {
          habitId,
          userId,
          localDate,
          status: CheckInStatus.COMPLETED,
          note: input.note ?? null,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError('A check-in already exists for this local date', 'DUPLICATE_CHECKIN');
      }
      throw err;
    }

    const streak = await persistStreak(tx, habit, localDate);

    // Award XP for completed check-in (+10) and 7-day milestone (+15)
    const { baseXp, milestoneXp } = calculateCheckInXp(CheckInStatus.COMPLETED, streak.current);
    if (baseXp > 0) {
      await awardXp(userId, 'CHECK_IN', baseXp, { habitId, localDate });
    }
    if (milestoneXp > 0) {
      await awardXp(userId, 'MILESTONE_7_DAY', milestoneXp, { habitId, localDate });
    }

    return { checkIn, streak };
  }, { maxWait: 15000, timeout: 30000 });
}

export async function listCheckIns(userId: string, habitId: string, fromYmd: string, toYmd: string) {
  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
    select: { id: true, userId: true },
  });

  if (!habit || habit.userId !== userId) {
    throw new NotFoundError('Habit not found', 'NOT_FOUND');
  }

  const from = parseYmd(fromYmd);
  const to = parseYmd(toYmd);
  if (to.getTime() < from.getTime()) {
    throw new BadRequestError('to must be on or after from', 'INVALID_DATE_RANGE');
  }

  const checkIns = await prisma.checkIn.findMany({
    where: {
      habitId,
      localDate: { gte: from, lte: to },
    },
    orderBy: { localDate: 'asc' },
  });

  return checkIns;
}
