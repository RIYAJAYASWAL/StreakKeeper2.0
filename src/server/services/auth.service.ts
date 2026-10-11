import bcrypt from 'bcryptjs';
import { prisma } from '@/server/lib/prisma';
import { BadRequestError, ConflictError, NotFoundError } from '@/server/lib/api';
import { isValidIANATimezone } from '@/server/domain/timezone';
import { resetFreezesIfDue } from '@/server/domain/freeze';

export interface RegisterUserInput {
  email: string;
  password: string;
  name: string;
  timezone: string;
}

export interface UpdateUserProfileInput {
  name?: string;
  timezone?: string;
}

export async function registerUser(input: RegisterUserInput) {
  const normalizedEmail = input.email.toLowerCase().trim();

  if (!isValidIANATimezone(input.timezone)) {
    throw new BadRequestError('Invalid IANA timezone', 'INVALID_TIMEZONE');
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    throw new ConflictError('User with this email already exists', 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: input.name.trim(),
      passwordHash,
      timezone: input.timezone.trim(),
      xp: 0,
      level: 1,
      freezesRemaining: 3,
      freezesResetAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      timezone: true,
      xp: true,
      level: true,
      freezesRemaining: true,
      freezesResetAt: true,
      createdAt: true,
    },
  });

  return user;
}

export async function authenticateCredentials(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !user.passwordHash) {
    throw new BadRequestError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new BadRequestError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    timezone: user.timezone,
    xp: user.xp,
    level: user.level,
    freezesRemaining: user.freezesRemaining,
    createdAt: user.createdAt,
  };
}

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      timezone: true,
      xp: true,
      level: true,
      freezesRemaining: true,
      freezesResetAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  // Lazy freeze reset so freezes are always correct on dashboard / profile load
  const now = new Date();
  const reset = resetFreezesIfDue(user, now);
  if (reset.didReset) {
    await prisma.user.updateMany({
      where: { id: userId, freezesResetAt: user.freezesResetAt },
      data: {
        freezesRemaining: reset.freezesRemaining,
        freezesResetAt: reset.freezesResetAt,
      },
    });
    user.freezesRemaining = reset.freezesRemaining;
    user.freezesResetAt = reset.freezesResetAt;
  }

  return user;
}

export async function updateUserProfile(userId: string, input: UpdateUserProfileInput) {
  if (input.timezone !== undefined && !isValidIANATimezone(input.timezone)) {
    throw new BadRequestError('Invalid IANA timezone', 'INVALID_TIMEZONE');
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone.trim() } : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      timezone: true,
      xp: true,
      level: true,
      freezesRemaining: true,
      freezesResetAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}
