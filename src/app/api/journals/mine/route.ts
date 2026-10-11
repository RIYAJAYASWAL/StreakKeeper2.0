import { ok, parseQuery, withAuth } from '@/server/lib/api';
import { getMyJournals, myJournalsQuerySchema } from '@/server/services/journals';

export const GET = withAuth(async (req, { userId }) => {
  const query = parseQuery(req, myJournalsQuerySchema);
  const journals = await getMyJournals(userId, query);
  return ok(journals);
});
