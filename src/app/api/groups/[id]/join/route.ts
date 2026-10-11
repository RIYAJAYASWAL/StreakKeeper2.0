import { ok, withAuth } from '@/server/lib/api';
import { joinGroup } from '@/server/services/social';

export const POST = withAuth<{ params: { id: string } }>(async (_req, { params, userId }) => {
  const member = await joinGroup(userId, params.id);
  return ok(member, 201);
});
