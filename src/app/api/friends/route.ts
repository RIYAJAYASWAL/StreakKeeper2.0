import { ok, withAuth } from '@/server/lib/api';
import { getFriends } from '@/server/services/social';

export const GET = withAuth(async (_req, { userId }) => {
  const friends = await getFriends(userId);
  return ok(friends);
});
