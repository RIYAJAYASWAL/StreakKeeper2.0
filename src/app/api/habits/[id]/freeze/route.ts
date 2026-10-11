import { ok, parseBody, withAuth } from '@/server/lib/api';
import { applyHabitFreeze, freezeHabitSchema } from '@/server/services/freezes';
import { assertRateLimit, ROUTE_RATE_LIMITS } from '@/server/lib/rate-limit';

interface RouteContext {
  params: {
    id: string;
  };
}

export const POST = withAuth<RouteContext>(async (req, { userId, params }) => {
  await assertRateLimit(`freeze:${userId}`, ROUTE_RATE_LIMITS.FREEZES.limit, ROUTE_RATE_LIMITS.FREEZES.windowMs);
  const body = await parseBody(req, freezeHabitSchema);
  const result = await applyHabitFreeze(userId, params.id, body, new Date());
  return ok(result, 201);
});
