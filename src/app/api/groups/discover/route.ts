import { ok, withAuth } from '@/server/lib/api';
import { discoverGroups } from '@/server/services/social';

export const GET = withAuth(async (_req, { userId }) => {
  const groups = await discoverGroups(userId);
  return ok(groups);
});
