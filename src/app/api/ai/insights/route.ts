import { ok, withAuth } from '@/server/lib/api';
import { generateAiInsight, getLatestAiInsight, getAiDailyQuota } from '@/server/services/ai';
import { assertRateLimit, ROUTE_RATE_LIMITS } from '@/server/lib/rate-limit';

export const POST = withAuth(async (req, { userId }) => {
  await assertRateLimit(`ai:${userId}`, ROUTE_RATE_LIMITS.AI_INSIGHTS.limit, ROUTE_RATE_LIMITS.AI_INSIGHTS.windowMs);
  const insight = await generateAiInsight(userId);
  const quota = await getAiDailyQuota(userId);
  return ok({ ...insight, remainingGenerations: quota.remaining });
});

export const GET = withAuth(async (req, { userId }) => {
  const latest = await getLatestAiInsight(userId);
  const quota = await getAiDailyQuota(userId);
  if (!latest) {
    return ok(null);
  }
  return ok({ ...latest, remainingGenerations: quota.remaining });
});
