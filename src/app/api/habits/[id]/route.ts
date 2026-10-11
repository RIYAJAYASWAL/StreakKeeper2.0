import { ok, parseBody, withAuth } from '@/server/lib/api';
import {
  getHabitById,
  updateHabit,
  archiveHabit,
  updateHabitSchema,
} from '@/server/services/habits';

interface RouteContext {
  params: {
    id: string;
  };
}

export const GET = withAuth<RouteContext>(async (_req, { userId, params }) => {
  const habit = await getHabitById(userId, params.id);
  return ok({ habit });
});

export const PATCH = withAuth<RouteContext>(async (req, { userId, params }) => {
  const body = await parseBody(req, updateHabitSchema);
  const habit = await updateHabit(userId, params.id, body);
  return ok({ habit });
});

export const DELETE = withAuth<RouteContext>(async (_req, { userId, params }) => {
  const habit = await archiveHabit(userId, params.id);
  return ok({ habit });
});
