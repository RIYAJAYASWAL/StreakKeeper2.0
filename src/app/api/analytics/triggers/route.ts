import { ok, parseQuery, withAuth } from '@/server/lib/api';
import { getTriggerAnalytics, triggersQuerySchema } from '@/server/services/triggers';

export const GET = withAuth(async (req, { userId }) => {
  const query = parseQuery(req, triggersQuerySchema);
  const analytics = await getTriggerAnalytics(userId, query, new Date());
  return ok(analytics);
});
