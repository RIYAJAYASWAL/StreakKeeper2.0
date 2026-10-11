import { ok, withAuth } from '@/server/lib/api';
import { deleteJournalComment } from '@/server/services/journals';

export const DELETE = withAuth<{ params: { id: string; commentId: string } }>(
  async (_req, { params, userId }) => {
    const result = await deleteJournalComment(userId, params.id, params.commentId);
    return ok(result);
  }
);
