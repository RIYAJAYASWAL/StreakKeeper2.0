import { ok, parseBody, withAuth } from '@/server/lib/api';
import {
  getJournalById,
  updateJournal,
  deleteJournal,
  updateJournalSchema,
} from '@/server/services/journals';

export const GET = withAuth<{ params: { id: string } }>(async (_req, { params, userId }) => {
  const journal = await getJournalById(userId, params.id);
  return ok(journal);
});

export const PATCH = withAuth<{ params: { id: string } }>(async (req, { params, userId }) => {
  const body = await parseBody(req, updateJournalSchema);
  const updated = await updateJournal(userId, params.id, body);
  return ok(updated);
});

export const DELETE = withAuth<{ params: { id: string } }>(async (_req, { params, userId }) => {
  const result = await deleteJournal(userId, params.id);
  return ok(result);
});
