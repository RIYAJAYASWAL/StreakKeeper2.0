import { z } from 'zod';
import { ok, fail, parseBody, AppError } from '@/server/lib/api';
import { registerUser } from '@/server/services/auth.service';
import { isValidIANATimezone } from '@/server/domain/timezone';
import { authRateLimiter } from '@/server/lib/rate-limit';
import { logger } from '@/server/lib/logger';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  timezone: z.string().refine(isValidIANATimezone, 'Invalid IANA timezone identifier'),
});

export async function POST(req: Request) {
  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
    const rateLimit = await authRateLimiter.check(`register:${clientIp}`, 10, 15 * 60 * 1000);
    if (!rateLimit.success) {
      return fail('RATE_LIMIT_EXCEEDED', 'Too many registration attempts. Please try again later.', 429);
    }

    const body = await parseBody(req, registerSchema);
    const user = await registerUser(body);

    return ok({ user }, 201);
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return fail(err.code, err.message, err.statusCode);
    }
    logger.error('Registration error', err);
    return fail('INTERNAL_SERVER_ERROR', 'Registration failed', 500);
  }
}
