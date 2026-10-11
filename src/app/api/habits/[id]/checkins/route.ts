import { z } from 'zod';
import { ok, parseQuery, parseZod, withAuth, BadRequestError } from '@/server/lib/api';
import {
  createCheckIn,
  createCheckInSchema,
  listCheckIns,
  listCheckInsQuerySchema,
} from '@/server/services/checkins';

import { assertRateLimit, ROUTE_RATE_LIMITS } from '@/server/lib/rate-limit';

interface RouteContext {
  params: {
    id: string;
  };
}

async function parseOptionalJsonBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const text = await req.text();
  if (!text.trim()) {
    return parseZod(schema, {});
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new BadRequestError('Invalid JSON in request body', 'INVALID_JSON');
  }
  return parseZod(schema, body);
}

export const POST = withAuth<RouteContext>(async (req, { userId, params }) => {
  await assertRateLimit(`checkin:${userId}`, ROUTE_RATE_LIMITS.CHECKINS.limit, ROUTE_RATE_LIMITS.CHECKINS.windowMs);
  const body = await parseOptionalJsonBody(req, createCheckInSchema);
  const result = await createCheckIn(userId, params.id, body, new Date());
  return ok(result, 201);
});

export const GET = withAuth<RouteContext>(async (req, { userId, params }) => {
  const { from, to } = parseQuery(req, listCheckInsQuerySchema);
  const checkIns = await listCheckIns(userId, params.id, from, to);
  return ok({ checkIns });
});
