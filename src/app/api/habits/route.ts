import { ok, parseBody, withAuth } from '@/server/lib/api';
import { createHabit, createHabitSchema, getHabits } from '@/server/services/habits';

export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody(req, createHabitSchema);
  const habit = await createHabit(userId, body);
  return ok({ habit }, 201);
});

export const GET = withAuth(async (req, { userId }) => {
  const url = new URL(req.url);
  const archived = url.searchParams.get('archived');
  const habits = await getHabits(userId, archived);
  return ok({ habits });
});
