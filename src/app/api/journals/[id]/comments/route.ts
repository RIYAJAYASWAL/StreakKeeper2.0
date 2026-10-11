import { ok, parseBody, resolveSessionUser, withAuth, AppError, fail } from '@/server/lib/api';
import {
  getJournalComments,
  addJournalComment,
  createCommentSchema,
} from '@/server/services/journals';

export const GET = async (req: Request, { params }: { params: { id: string } }) => {
  try {
    const user = await resolveSessionUser(req);
    const comments = await getJournalComments(params.id, user?.id ?? null);
    return ok({ comments });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return fail(err.code, err.message, err.statusCode);
    }
    return fail('INTERNAL_SERVER_ERROR', 'An unexpected error occurred', 500);
  }
};

export const POST = withAuth<{ params: { id: string } }>(async (req, { params, userId }) => {
  const body = await parseBody(req, createCommentSchema);
  const comment = await addJournalComment(userId, params.id, body);
  return ok({ comment }, 201);
});
