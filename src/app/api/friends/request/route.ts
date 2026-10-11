import { ok, parseBody, withAuth } from '@/server/lib/api';
import { friendRequestSchema, sendFriendRequest } from '@/server/services/social';

export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody(req, friendRequestSchema);
  const friendship = await sendFriendRequest(userId, body);
  return ok(friendship, 201);
});
