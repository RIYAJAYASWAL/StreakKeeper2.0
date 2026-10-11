import { formatInTimeZone } from 'date-fns-tz';
import { CheckInStatus, Prisma } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';
import {
  addUtcDays,
  eachDayInclusive,
  formatYmd,
  isScheduledDay,
  toDateOnly,
  toLocalDate,
} from '@/server/domain/streak';
import { startOfLocalMonth, resetFreezesIfDue } from '@/server/domain/freeze';
import { persistStreak } from '@/server/services/checkins';
import { logger } from '@/server/lib/logger';

export interface RolloverOptions {
  now?: Date;
  batchSize?: number;
  userId?: string;
  cursor?: string;
  maxDurationMs?: number;
  forceAllTimezones?: boolean; // Kept for backward compatibility
}

export interface RolloverResult {
  processedUsers: number;
  updatedHabits: number;
  missedCheckInsCreated: number;
}

export interface FreezeResetOptions {
  now?: Date;
  batchSize?: number;
  userId?: string;
  forceAllDays?: boolean;
}

export interface FreezeResetResult {
  processedUsers: number;
  resetUsers: number;
}

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_DURATION_MS = 8000;
const CURSOR_IDENTIFIER = 'CRON_ROLLOVER_CURSOR';

/**
 * Retrieve stored rollover cursor from VerificationToken storage.
 */
async function getStoredCursor(): Promise<string | undefined> {
  try {
    const record = await prisma.verificationToken.findFirst({
      where: { identifier: CURSOR_IDENTIFIER },
    });
    return record?.token;
  } catch {
    return undefined;
  }
}

/**
 * Save current cursor so next run resumes seamlessly.
 */
async function saveStoredCursor(cursor: string): Promise<void> {
  try {
    await prisma.verificationToken.deleteMany({
      where: { identifier: CURSOR_IDENTIFIER },
    });
    await prisma.verificationToken.create({
      data: {
        identifier: CURSOR_IDENTIFIER,
        token: cursor,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  } catch {
    // Ignore error if database is offline or during testing
  }
}

/**
 * Clear stored cursor when all users have been processed.
 */
async function clearStoredCursor(): Promise<void> {
  try {
    await prisma.verificationToken.deleteMany({
      where: { identifier: CURSOR_IDENTIFIER },
    });
  } catch {
    // Ignore error if database is offline or during testing
  }
}

/**
 * Process a single user's rollover:
 * Idempotent and timezone-correct: for each user, process every scheduled day
 * that has already ENDED in that user's own timezone and has no check-in,
 * mark it MISSED, then recompute their Streak row.
 */
export async function processUserRollover(
  user: { id: string; timezone: string },
  now: Date
): Promise<{ updatedHabits: number; missedCheckInsCreated: number }> {
  let today: Date;
  try {
    today = toLocalDate(now, user.timezone);
  } catch {
    today = toDateOnly(now);
  }

  // Any day strictly before today has already ENDED in user's timezone
  const yesterday = addUtcDays(today, -1);

  // Fetch all active habits for this user
  const habits = await prisma.habit.findMany({
    where: {
      userId: user.id,
      archivedAt: null,
    },
    select: {
      id: true,
      frequencyType: true,
      daysOfWeek: true,
      intervalDays: true,
      startDate: true,
      targetPerPeriod: true,
    },
  });

  let updatedHabits = 0;
  let missedCheckInsCreated = 0;

  for (const habit of habits) {
    const habitStart = toDateOnly(habit.startDate);

    // If yesterday is on or after the habit's startDate, process ended days
    if (yesterday.getTime() >= habitStart.getTime()) {
      // Look back up to 60 days or habitStart, whichever is later
      const lookbackLimit = addUtcDays(today, -60);
      const earliestDay = habitStart.getTime() > lookbackLimit.getTime() ? habitStart : lookbackLimit;

      const existingCheckIns = await prisma.checkIn.findMany({
        where: {
          habitId: habit.id,
          localDate: {
            gte: earliestDay,
            lte: yesterday,
          },
        },
        select: {
          localDate: true,
        },
      });

      const existingDatesSet = new Set(
        existingCheckIns.map((c) => formatYmd(c.localDate))
      );

      const daysToCheck = eachDayInclusive(earliestDay, yesterday);
      for (const day of daysToCheck) {
        if (isScheduledDay(habit, day) && !existingDatesSet.has(formatYmd(day))) {
          try {
            await prisma.checkIn.create({
              data: {
                habitId: habit.id,
                userId: user.id,
                localDate: day,
                status: CheckInStatus.MISSED,
              },
            });
            missedCheckInsCreated++;
            existingDatesSet.add(formatYmd(day));
          } catch (err: any) {
            // Ignore unique constraint race condition
            if (err.code !== 'P2002') {
              logger.warn('Error creating MISSED checkin during rollover', {
                userId: user.id,
                habitId: habit.id,
                error: err.message,
              });
            }
          }
        }
      }
    }

    // Recompute streak for the habit as of today in user's timezone
    await prisma.$transaction(async (tx) => {
      await persistStreak(tx, habit, today);
    });

    updatedHabits++;
  }

  return { updatedHabits, missedCheckInsCreated };
}

/**
 * Lazy recomputation of a user's streaks:
 * Call this whenever a user opens the dashboard or habits list
 * so their numbers are never stale.
 */
export async function recomputeUserStreaks(
  userId: string,
  now: Date = new Date()
): Promise<{ updatedHabits: number; missedCheckInsCreated: number } | undefined> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, timezone: true },
  });
  if (!user) return undefined;
  return processUserRollover(user, now);
}

/**
 * Daily rollover scheduled job:
 * - Idempotent and timezone-correct without relying on when it runs
 * - Processes every scheduled day that has already ENDED in the user's timezone
 * - Marks missing check-ins as MISSED
 * - Recomputes Streak rows
 * - Processes users in batches and stops safely before the function time limit,
 *   saving cursor to resume on the next run.
 */
export async function runDailyRollover(options: RolloverOptions = {}): Promise<RolloverResult> {
  const now = options.now ?? new Date();
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const maxDurationMs = options.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;
  const startTime = Date.now();

  let processedUsers = 0;
  let updatedHabits = 0;
  let missedCheckInsCreated = 0;

  // Retrieve stored cursor if not provided in options
  let cursor: string | undefined = options.cursor;
  if (!cursor && !options.userId) {
    cursor = await getStoredCursor();
  }

  let completedAll = false;

  while (true) {
    // Check function time limit before starting next batch
    if (Date.now() - startTime >= maxDurationMs) {
      logger.info('Stopping rollover before function time limit', { processedUsers });
      break;
    }

    const userQuery: Prisma.UserFindManyArgs = {
      take: batchSize,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        timezone: true,
      },
    };

    if (cursor) {
      userQuery.skip = 1;
      userQuery.cursor = { id: cursor };
    }

    if (options.userId) {
      userQuery.where = { id: options.userId };
    }

    const users = await prisma.user.findMany(userQuery);
    if (users.length === 0) {
      completedAll = true;
      break;
    }

    let batchInterrupted = false;
    for (const user of users) {
      if (Date.now() - startTime >= maxDurationMs) {
        batchInterrupted = true;
        break;
      }

      const res = await processUserRollover(user, now);
      processedUsers++;
      updatedHabits += res.updatedHabits;
      missedCheckInsCreated += res.missedCheckInsCreated;

      cursor = user.id;
    }

    if (batchInterrupted) {
      break;
    }

    if (options.userId || users.length < batchSize) {
      completedAll = true;
      break;
    }
  }

  // Manage persistent cursor for resumption
  if (!options.userId) {
    if (completedAll) {
      await clearStoredCursor();
    } else if (cursor) {
      await saveStoredCursor(cursor);
    }
  }

  return {
    processedUsers,
    updatedHabits,
    missedCheckInsCreated,
  };
}

/**
 * Monthly freeze reset (Deprecated: Freezes reset lazily via resetFreezesIfDue).
 * Maintained for backward compatibility.
 */
export async function runFreezeReset(options: FreezeResetOptions = {}): Promise<FreezeResetResult> {
  const now = options.now ?? new Date();
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;

  let processedUsers = 0;
  let resetUsers = 0;

  let cursor: string | undefined = undefined;

  while (true) {
    const userQuery: Prisma.UserFindManyArgs = {
      take: batchSize,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        timezone: true,
        freezesRemaining: true,
        freezesResetAt: true,
      },
    };

    if (cursor) {
      userQuery.skip = 1;
      userQuery.cursor = { id: cursor };
    }

    if (options.userId) {
      userQuery.where = { id: options.userId };
    }

    const users = await prisma.user.findMany(userQuery);
    if (users.length === 0) {
      break;
    }

    cursor = users[users.length - 1].id;

    for (const user of users) {
      const reset = resetFreezesIfDue(user, now);
      processedUsers++;

      if (reset.didReset) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            freezesRemaining: reset.freezesRemaining,
            freezesResetAt: reset.freezesResetAt,
          },
        });
        resetUsers++;
      }
    }

    if (options.userId || users.length < batchSize) {
      break;
    }
  }

  return {
    processedUsers,
    resetUsers,
  };
}
