import { CheckInStatus, FreezeReasonTag, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/server/lib/prisma';
import { BadRequestError, ConflictError, NotFoundError } from '@/server/lib/api';
import {
  canFreeze,
  formatRestorableYmd,
  getRestorableDays,
  nextFreezeResetDate,
  resetFreezesIfDue,
  type FreezeDenialReason,
} from '@/server/domain/freeze';
import { isScheduledDay, parseYmd, toLocalDate } from '@/server/domain/streak';
import { persistStreak } from '@/server/services/checkins';

export const freezeHabitSchema = z
  .object({
    localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'localDate must be YYYY-MM-DD'),
    reasonTag: z.nativeEnum(FreezeReasonTag),
    note: z.string().trim().min(1, 'Note is required').max(500, 'Note must be at most 500 characters'),
  })
  .strict();

export type FreezeHabitInput = z.infer<typeof freezeHabitSchema>;

const DENIAL_MESSAGES: Record<FreezeDenialReason, string> = {
  NO_FREEZES_LEFT: 'No streak freezes remaining',
  ALREADY_FROZEN: 'This day is already frozen',
  TOO_OLD: 'Missed day is older than the 3-day freeze window',
  NOT_IN_WINDOW: 'Only past days within the last 3 local days can be frozen',
  NOT_SCHEDULED: 'That date is not a scheduled day for this habit',
  NOT_UNFILLED: 'That day already has a completed check-in',
};

function throwFreezeDenied(reason: FreezeDenialReason): never {
  if (reason === 'ALREADY_FROZEN') {
    throw new ConflictError(DENIAL_MESSAGES[reason], reason);
  }
  throw new BadRequestError(DENIAL_MESSAGES[reason], reason);
}

async function persistLazyReset(
  tx: Prisma.TransactionClient,
  user: { id: string; freezesRemaining: number; freezesResetAt: Date; timezone: string },
  nowUtc: Date
) {
  const reset = resetFreezesIfDue(user, nowUtc);
  if (reset.didReset) {
    await tx.user.updateMany({
      where: { id: user.id, freezesResetAt: user.freezesResetAt },
      data: {
        freezesRemaining: reset.freezesRemaining,
        freezesResetAt: reset.freezesResetAt,
      },
    });
  }
  return reset;
}

/**
 * Decrement only when remaining > 0 so concurrent freeze requests cannot drive the counter negative.
 */
async function decrementFreezeBalance(tx: Prisma.TransactionClient, userId: string) {
  const result = await tx.user.updateMany({
    where: { id: userId, freezesRemaining: { gt: 0 } },
    data: { freezesRemaining: { decrement: 1 } },
  });
  if (result.count !== 1) {
    throwFreezeDenied('NO_FREEZES_LEFT');
  }
}

export async function applyHabitFreeze(userId: string, habitId: string, input: FreezeHabitInput, nowUtc: Date) {
  const localDate = parseYmd(input.localDate);

  return prisma.$transaction(async (tx) => {
    const habit = await tx.habit.findUnique({
      where: { id: habitId },
      include: { user: true },
    });

    if (!habit || habit.userId !== userId) {
      throw new NotFoundError('Habit not found', 'NOT_FOUND');
    }
    if (habit.archivedAt) {
      throw new BadRequestError('Cannot freeze an archived habit', 'HABIT_ARCHIVED');
    }

    const reset = await persistLazyReset(tx, habit.user, nowUtc);
    const today = toLocalDate(nowUtc, habit.user.timezone);

    const existing = await tx.checkIn.findUnique({
      where: { habitId_localDate: { habitId, localDate } },
    });

    const alreadyFrozen = existing?.status === CheckInStatus.FROZEN;
    const isUnfilled = !existing || existing.status === CheckInStatus.MISSED;
    const verdict = canFreeze({
      missedLocalDate: localDate,
      today,
      freezesRemaining: reset.freezesRemaining,
      alreadyFrozen,
      isScheduled: isScheduledDay(habit, localDate),
      isUnfilled,
    });
    if (!verdict.allowed) {
      throwFreezeDenied(verdict.reason ?? 'NOT_IN_WINDOW');
    }

    let checkIn = existing;
    if (existing?.status === CheckInStatus.MISSED) {
      const flipped = await tx.checkIn.updateMany({
        where: { id: existing.id, status: CheckInStatus.MISSED },
        data: { status: CheckInStatus.FROZEN, note: input.note },
      });
      if (flipped.count !== 1) {
        throwFreezeDenied('ALREADY_FROZEN');
      }
      checkIn = await tx.checkIn.findUnique({ where: { id: existing.id } });
    } else {
      try {
        checkIn = await tx.checkIn.create({
          data: {
            habitId,
            userId,
            localDate,
            status: CheckInStatus.FROZEN,
            note: input.note,
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throwFreezeDenied('ALREADY_FROZEN');
        }
        throw err;
      }
    }

    if (!checkIn) {
      throw new Error('Failed to persist frozen check-in');
    }

    await tx.freezeUse.create({
      data: {
        userId,
        habitId,
        checkInId: checkIn.id,
        localDate,
        reasonTag: input.reasonTag,
        note: input.note,
      },
    });

    await decrementFreezeBalance(tx, userId);

    const streak = await persistStreak(tx, habit, today);
    const userAfter = await tx.user.findUnique({
      where: { id: userId },
      select: { freezesRemaining: true },
    });

    return {
      streak,
      freezesRemaining: userAfter?.freezesRemaining ?? 0,
    };
  }, { maxWait: 15000, timeout: 30000 });
}

export async function getFreezeStatus(userId: string, nowUtc: Date) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User not found', 'NOT_FOUND');
  }

  const reset = resetFreezesIfDue(user, nowUtc);
  if (reset.didReset) {
    await prisma.user.updateMany({
      where: { id: userId, freezesResetAt: user.freezesResetAt },
      data: {
        freezesRemaining: reset.freezesRemaining,
        freezesResetAt: reset.freezesResetAt,
      },
    });
  }

  const refreshed = await prisma.user.findUnique({
    where: { id: userId },
    select: { freezesRemaining: true, freezesResetAt: true, timezone: true },
  });
  if (!refreshed) {
    throw new NotFoundError('User not found', 'NOT_FOUND');
  }

  const today = toLocalDate(nowUtc, refreshed.timezone);
  const habits = await prisma.habit.findMany({
    where: { userId, archivedAt: null },
    include: { checkIns: { select: { localDate: true, status: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return {
    freezesRemaining: refreshed.freezesRemaining,
    nextResetDate: nextFreezeResetDate(refreshed.freezesResetAt, refreshed.timezone),
    habits: habits.map((habit) => ({
      habitId: habit.id,
      restorableDays: formatRestorableYmd(
        getRestorableDays(habit, habit.checkIns, today, refreshed.freezesRemaining)
      ),
    })),
  };
}
