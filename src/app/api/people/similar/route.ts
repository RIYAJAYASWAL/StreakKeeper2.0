import { ok, withAuth } from '@/server/lib/api';
import { getSimilarPeople } from '@/server/services/social';

export const GET = withAuth(async (_req, { userId }) => {
  const people = await getSimilarPeople(userId);
  return ok(people);
});
