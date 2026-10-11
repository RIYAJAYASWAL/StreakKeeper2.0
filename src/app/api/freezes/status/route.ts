import { ok, withAuth } from '@/server/lib/api';
import { getFreezeStatus } from '@/server/services/freezes';

export const GET = withAuth(async (_req, { userId }) => {
  const status = await getFreezeStatus(userId, new Date());
  return ok(status);
});
