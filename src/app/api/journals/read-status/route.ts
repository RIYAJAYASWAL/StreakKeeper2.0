import { ok, withAuth } from '@/server/lib/api';
import { getJournalReadStatus } from '@/server/services/journals';

export const GET = withAuth(async (req, { userId }) => {
  const status = await getJournalReadStatus(userId, new Date());
  return ok(status);
});
