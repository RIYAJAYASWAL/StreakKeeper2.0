import { ok, parseQuery, withAuth } from '@/server/lib/api';
import { getLeaderboard, leaderboardQuerySchema } from '@/server/services/leaderboard';

export const GET = withAuth(async (req, { userId }) => {
  const query = parseQuery(req, leaderboardQuerySchema);
  const result = await getLeaderboard(userId, query);
  return ok(result);
});
