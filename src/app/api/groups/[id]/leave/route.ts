import { ok, parseBody, withAuth } from '@/server/lib/api';
import { leaveGroup, leaveGroupSchema } from '@/server/services/social';

export const POST = withAuth<{ params: { id: string } }>(async (req, { params, userId }) => {
  let body;
  try {
    body = await parseBody(req, leaveGroupSchema);
  } catch {
    body = undefined;
  }
  const result = await leaveGroup(userId, params.id, body);
  return ok(result);
});
