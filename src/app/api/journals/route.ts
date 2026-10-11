import { ok, parseBody, withAuth } from '@/server/lib/api';
import { createJournal, createJournalSchema } from '@/server/services/journals';

export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody(req, createJournalSchema);
  const journal = await createJournal(userId, body);
  return ok(journal, 201);
});
