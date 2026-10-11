import { ok, parseBody, withAuth } from '@/server/lib/api';
import { awardXp } from '@/server/services/xp';
import { prisma } from '@/server/lib/prisma';
import { levelFromXp } from '@/server/domain/xp';
import { z } from 'zod';

const xpSchema = z.object({
  amount: z.number().int(),
  habitId: z.string().optional(),
  action: z.string().optional(),
});

export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody(req, xpSchema);
  const amount = body.amount;

  if (amount < 0) {
    // Revert XP
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true },
    });
    const newXp = Math.max(0, (user?.xp ?? 0) + amount);
    const newLevel = levelFromXp(newXp);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { xp: newXp, level: newLevel },
      select: { id: true, xp: true, level: true },
    });
    return ok({ awarded: true, xp: updated.xp, level: updated.level });
  }

  const result = await awardXp(userId, body.action || 'CHECK_IN', amount, {
    habitId: body.habitId,
    localDate: new Date(),
  });

  return ok(result);
});
