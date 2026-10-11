import { z } from 'zod';
import { ok, parseBody, withAuth, BadRequestError } from '@/server/lib/api';
import { getUserProfile, updateUserProfile } from '@/server/services/auth.service';
import { isValidIANATimezone } from '@/server/domain/timezone';

const updateProfileSchema = z
  .object({
    name: z.string().min(1, 'Name cannot be empty').max(100).optional(),
    timezone: z
      .string()
      .refine(isValidIANATimezone, 'Invalid IANA timezone identifier')
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.timezone !== undefined, {
    message: 'At least one field (name or timezone) must be provided to update',
  });

export const GET = withAuth(async (_req, { userId }) => {
  const profile = await getUserProfile(userId);
  return ok({ user: profile });
});

export const PATCH = withAuth(async (req, { userId }) => {
  const body = await parseBody(req, updateProfileSchema);
  const updated = await updateUserProfile(userId, body);
  return ok({ user: updated });
});
