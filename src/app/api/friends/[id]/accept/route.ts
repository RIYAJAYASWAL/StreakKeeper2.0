import { ok, withAuth } from '@/server/lib/api';
import { acceptFriendRequest } from '@/server/services/social';

export const POST = withAuth<{ params: { id: string } }>(async (_req, { params, userId }) => {
  const friendship = await acceptFriendRequest(userId, params.id);
  return ok(friendship);
});
