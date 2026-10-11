import { ok, parseQuery, withAuth } from '@/server/lib/api';
import { getHeatmapAnalytics, heatmapQuerySchema } from '@/server/services/triggers';

export const GET = withAuth(async (req, { userId }) => {
  const query = parseQuery(req, heatmapQuerySchema);
  const heatmap = await getHeatmapAnalytics(userId, query, new Date());
  return ok(heatmap);
});
