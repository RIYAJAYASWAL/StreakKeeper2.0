import { z } from 'zod';
import { ok, fail, parseBody, AppError } from '@/server/lib/api';
import { authenticateCredentials } from '@/server/services/auth.service';
import { authRateLimiter } from '@/server/lib/rate-limit';
import { logger } from '@/server/lib/logger';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: Request) {
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
    const rateLimit = await authRateLimiter.check(`login:${clientIp}`, 10, 15 * 60 * 1000);
    if (!rateLimit.success) {
      return fail('RATE_LIMIT_EXCEEDED', 'Too many login attempts. Please try again later.', 429);
    }

    const body = await parseBody(req, loginSchema);
    const user = await authenticateCredentials(body.email, body.password);

    return ok({ user });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return fail(err.code, err.message, err.statusCode);
    }
    logger.error('Login error', err);
    return fail('INTERNAL_SERVER_ERROR', 'Login failed', 500);
  }
}
