import { ok, withAuth } from '@/server/lib/api';
import { toggleJournalLike } from '@/server/services/journals';

export const POST = withAuth<{ params: { id: string } }>(async (_req, { params, userId }) => {
  const result = await toggleJournalLike(userId, params.id);
  return ok(result);
});
