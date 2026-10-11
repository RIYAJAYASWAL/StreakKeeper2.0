import { ok, withAuth } from '@/server/lib/api';
import { readJournal } from '@/server/services/journals';

export const POST = withAuth<{ params: { id: string } }>(async (_req, { params, userId }) => {
  const read = await readJournal(userId, params.id, new Date());
  return ok(read, 201);
});
