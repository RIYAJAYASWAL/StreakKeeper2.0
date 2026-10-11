import { ok, parseBody, withAuth } from '@/server/lib/api';
import { createGroup, createGroupSchema, getMyGroups } from '@/server/services/social';

export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody(req, createGroupSchema);
  const group = await createGroup(userId, body);
  return ok(group, 201);
});

export const GET = withAuth(async (_req, { userId }) => {
  const groups = await getMyGroups(userId);
  return ok(groups);
});
