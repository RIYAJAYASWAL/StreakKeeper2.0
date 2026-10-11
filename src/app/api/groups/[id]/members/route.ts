import { ok, withAuth } from '@/server/lib/api';
import { getGroupMembers } from '@/server/services/social';

export const GET = withAuth<{ params: { id: string } }>(async (_req, { params, userId }) => {
  const members = await getGroupMembers(userId, params.id);
  return ok({ members });
});
