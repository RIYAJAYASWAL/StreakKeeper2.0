import { withCronAuth, ok } from '@/server/lib/api';
import { runDailyRollover, RolloverOptions } from '@/server/services/cron';

export const GET = withCronAuth(async (req: Request) => {
  const url = new URL(req.url);
  const nowParam = url.searchParams.get('now');
  const userIdParam = url.searchParams.get('userId');
  const batchSizeParam = url.searchParams.get('batchSize');
  const cursorParam = url.searchParams.get('cursor');

  const options: RolloverOptions = {
    now: nowParam ? new Date(nowParam) : undefined,
    userId: userIdParam ?? undefined,
    batchSize: batchSizeParam ? Number(batchSizeParam) : undefined,
    cursor: cursorParam ?? undefined,
  };

  const result = await runDailyRollover(options);
  return ok(result);
});

// Backward compatibility for POST requests
export const POST = withCronAuth(async (req: Request) => {
  let options: RolloverOptions = {};

  try {
    const body = await req.json();
    if (body && typeof body === 'object') {
      options = {
        now: body.now ? new Date(body.now) : undefined,
        userId: body.userId,
        batchSize: body.batchSize ? Number(body.batchSize) : undefined,
        cursor: body.cursor,
        forceAllTimezones: Boolean(body.forceAllTimezones),
      };
    }
  } catch {
    const url = new URL(req.url);
    const nowParam = url.searchParams.get('now');
    const userIdParam = url.searchParams.get('userId');
    options = {
      now: nowParam ? new Date(nowParam) : undefined,
      userId: userIdParam ?? undefined,
    };
  }

  const result = await runDailyRollover(options);
  return ok(result);
});
