import { ok, parseQuery, withAuth } from '@/server/lib/api';
import { getJournalFeed, feedQuerySchema } from '@/server/services/journals';

export const GET = withAuth(async (req, { userId }) => {
  const query = parseQuery(req, feedQuerySchema);
  const feed = await getJournalFeed(userId, query);
  return ok(feed);
});
