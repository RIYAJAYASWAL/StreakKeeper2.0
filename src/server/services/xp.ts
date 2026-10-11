import { XpEvent } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';
import { levelFromXp } from '@/server/domain/xp';
import { formatYmd } from '@/server/domain/streak';

export function buildXpIdempotencyKey(
  type: string,
  habitId?: string,
  localDate?: Date | string
): string {
  const parts = [type];
  if (habitId) parts.push(habitId);
  if (localDate) {
    parts.push(typeof localDate === 'string' ? localDate : formatYmd(localDate));
  }
  return parts.join(':');
}

export interface AwardXpOptions {
  habitId?: string;
  localDate?: Date | string;
  journalId?: string;
}

export interface AwardXpResult {
  awarded: boolean;
  xp: number;
  level: number;
  event?: XpEvent;
}

/**
 * Award XP to a user.
 * Writes an XpEvent and updates User.xp and User.level in a transaction.
 * Awards are idempotent per (user, type, habit, localDate).
 */
export async function awardXp(
  userId: string,
  type: string,
  amount: number,
  options?: AwardXpOptions
): Promise<AwardXpResult> {
  if (amount <= 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    });
    return {
      awarded: false,
      xp: user?.xp ?? 0,
      level: user?.level ?? 1,
    };
  }

  const eventType = buildXpIdempotencyKey(type, options?.habitId, options?.localDate);

  return prisma.$transaction(async (tx) => {
    // Check if this XP event was already awarded
    const existing = await tx.xpEvent.findFirst({
      where: { userId, type: eventType },
    });

    if (existing) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { xp: true, level: true },
      });
      return {
        awarded: false,
        xp: user?.xp ?? 0,
        level: user?.level ?? 1,
        event: existing,
      };
    }

    const event = await tx.xpEvent.create({
      data: {
        userId,
        type: eventType,
        amount,
      },
    });

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { xp: true },
    });

    const newXp = (user?.xp ?? 0) + amount;
    const newLevel = levelFromXp(newXp);

    await tx.user.update({
      where: { id: userId },
      data: {
        xp: newXp,
        level: newLevel,
      },
    });

    return {
      awarded: true,
      xp: newXp,
      level: newLevel,
      event,
    };
  }, { maxWait: 15000, timeout: 30000 });
}
