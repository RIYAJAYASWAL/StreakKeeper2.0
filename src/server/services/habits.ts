import { z } from 'zod';
import { HabitCategory, FrequencyType } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';
import { BadRequestError, NotFoundError } from '@/server/lib/api';
import { recomputeUserStreaks } from '@/server/services/cron';

export const habitCategoryEnum = z.nativeEnum(HabitCategory);
export const frequencyTypeEnum = z.nativeEnum(FrequencyType);

export const createHabitSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    category: habitCategoryEnum,
    description: z.string().trim().max(500, 'Description must be at most 500 characters').optional().nullable(),
    frequencyType: frequencyTypeEnum,
    targetPerPeriod: z.number().int().min(1).max(7).optional().nullable(),
    daysOfWeek: z
      .array(z.number().int().min(0).max(6))
      .optional()
      .nullable(),
    intervalDays: z.number().int().min(2).optional().nullable(),
    startDate: z
      .string()
      .optional()
      .nullable()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Invalid startDate format',
      }),
  })
  .superRefine((data, ctx) => {
    if (data.frequencyType === FrequencyType.WEEKLY) {
      if (typeof data.targetPerPeriod !== 'number' || data.targetPerPeriod < 1 || data.targetPerPeriod > 7) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['targetPerPeriod'],
          message: 'WEEKLY habits require targetPerPeriod between 1 and 7',
        });
      }
      if (data.daysOfWeek && data.daysOfWeek.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['daysOfWeek'],
          message: 'WEEKLY habits should not specify daysOfWeek',
        });
      }
      if (typeof data.intervalDays === 'number') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['intervalDays'],
          message: 'WEEKLY habits should not specify intervalDays',
        });
      }
    } else if (data.frequencyType === FrequencyType.CUSTOM) {
      const hasDaysOfWeek = Array.isArray(data.daysOfWeek) && data.daysOfWeek.length > 0;
      const hasIntervalDays = typeof data.intervalDays === 'number';

      if (!hasDaysOfWeek && !hasIntervalDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['frequencyType'],
          message: 'CUSTOM habits require either non-empty daysOfWeek (0-6) or intervalDays >= 2',
        });
      }

      if (hasDaysOfWeek && hasIntervalDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['frequencyType'],
          message: 'CUSTOM habits cannot specify both daysOfWeek and intervalDays',
        });
      }

      if (hasIntervalDays && (data.intervalDays as number) < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['intervalDays'],
          message: 'CUSTOM habits intervalDays must be at least 2',
        });
      }

      if (typeof data.targetPerPeriod === 'number') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['targetPerPeriod'],
          message: 'CUSTOM habits should not specify targetPerPeriod',
        });
      }
    } else if (data.frequencyType === FrequencyType.DAILY) {
      if (typeof data.targetPerPeriod === 'number') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['targetPerPeriod'],
          message: 'DAILY habits should not specify targetPerPeriod',
        });
      }
      if (data.daysOfWeek && data.daysOfWeek.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['daysOfWeek'],
          message: 'DAILY habits should not specify daysOfWeek',
        });
      }
      if (typeof data.intervalDays === 'number') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['intervalDays'],
          message: 'DAILY habits should not specify intervalDays',
        });
      }
    }
  });

export const updateHabitSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100).optional(),
    category: habitCategoryEnum.optional(),
    description: z.string().trim().max(500).optional().nullable(),
    frequencyType: frequencyTypeEnum.optional(),
    targetPerPeriod: z.number().int().min(1).max(7).optional().nullable(),
    daysOfWeek: z
      .array(z.number().int().min(0).max(6))
      .optional()
      .nullable(),
    intervalDays: z.number().int().min(2).optional().nullable(),
    archived: z.boolean().optional(),
  });

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;

export async function createHabit(userId: string, input: CreateHabitInput) {
  // Use Prisma transaction to create both Habit and Streak row (0/0)
  return prisma.$transaction(
    async (tx) => {
    const habit = await tx.habit.create({
      data: {
        userId,
        name: input.name,
        category: input.category,
        description: input.description ?? null,
        frequencyType: input.frequencyType,
        targetPerPeriod: input.frequencyType === FrequencyType.WEEKLY ? input.targetPerPeriod : null,
        daysOfWeek: input.frequencyType === FrequencyType.CUSTOM && input.daysOfWeek ? [...new Set(input.daysOfWeek)] : [],
        intervalDays: input.frequencyType === FrequencyType.CUSTOM ? input.intervalDays ?? null : null,
        startDate: input.startDate ? new Date(input.startDate) : new Date(),
        streak: {
          create: {
            current: 0,
            longest: 0,
            lastCountedDate: null,
          },
        },
      },
      include: {
        streak: true,
      },
    });

    return habit;
  }, { maxWait: 15000, timeout: 30000 });
}

export async function getHabits(userId: string, archivedFilter?: string | null) {
  // Recompute user streaks lazily whenever dashboard or habits list is opened so numbers are never stale
  await recomputeUserStreaks(userId);

  const where: { userId: string; archivedAt?: { not: null } | null } = { userId };

  if (archivedFilter === 'true') {
    where.archivedAt = { not: null };
  } else if (archivedFilter === 'all') {
    // don't filter on archivedAt
  } else {
    // default to unarchived
    where.archivedAt = null;
  }

  return prisma.habit.findMany({
    where,
    include: {
      streak: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getHabitById(userId: string, habitId: string) {
  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
    include: {
      streak: true,
    },
  });

  // Owner-only check: Return 404 (not 403) for habits owned by someone else
  if (!habit || habit.userId !== userId) {
    throw new NotFoundError('Habit not found', 'NOT_FOUND');
  }

  return habit;
}

export async function updateHabit(userId: string, habitId: string, input: UpdateHabitInput) {
  // Fetch habit and check ownership
  const existing = await prisma.habit.findUnique({
    where: { id: habitId },
  });

  if (!existing || existing.userId !== userId) {
    throw new NotFoundError('Habit not found', 'NOT_FOUND');
  }

  // Determine merged frequency configuration
  const newFrequencyType = input.frequencyType ?? existing.frequencyType;
  const newTargetPerPeriod =
    input.targetPerPeriod !== undefined ? input.targetPerPeriod : existing.targetPerPeriod;
  const newDaysOfWeek =
    input.daysOfWeek !== undefined ? input.daysOfWeek : existing.daysOfWeek;
  const newIntervalDays =
    input.intervalDays !== undefined ? input.intervalDays : existing.intervalDays;

  // Validate the resulting frequency configuration
  if (newFrequencyType === FrequencyType.WEEKLY) {
    if (typeof newTargetPerPeriod !== 'number' || newTargetPerPeriod < 1 || newTargetPerPeriod > 7) {
      throw new BadRequestError('WEEKLY habits require targetPerPeriod between 1 and 7', 'INVALID_FREQUENCY_CONFIG');
    }
  } else if (newFrequencyType === FrequencyType.CUSTOM) {
    const hasDaysOfWeek = Array.isArray(newDaysOfWeek) && newDaysOfWeek.length > 0;
    const hasIntervalDays = typeof newIntervalDays === 'number';

    if (!hasDaysOfWeek && !hasIntervalDays) {
      throw new BadRequestError('CUSTOM habits require either non-empty daysOfWeek (0-6) or intervalDays >= 2', 'INVALID_FREQUENCY_CONFIG');
    }
    if (hasDaysOfWeek && hasIntervalDays) {
      throw new BadRequestError('CUSTOM habits cannot specify both daysOfWeek and intervalDays', 'INVALID_FREQUENCY_CONFIG');
    }
    if (hasIntervalDays && (newIntervalDays as number) < 2) {
      throw new BadRequestError('CUSTOM habits intervalDays must be at least 2', 'INVALID_FREQUENCY_CONFIG');
    }
  }

  let archivedAtUpdate = existing.archivedAt;
  if (input.archived === true) {
    archivedAtUpdate = new Date();
  } else if (input.archived === false) {
    archivedAtUpdate = null;
  }

  return prisma.habit.update({
    where: { id: habitId },
    data: {
      name: input.name ?? existing.name,
      category: input.category ?? existing.category,
      description: input.description !== undefined ? input.description : existing.description,
      frequencyType: newFrequencyType,
      targetPerPeriod: newFrequencyType === FrequencyType.WEEKLY ? newTargetPerPeriod : null,
      daysOfWeek: newFrequencyType === FrequencyType.CUSTOM && newDaysOfWeek ? [...new Set(newDaysOfWeek)] : [],
      intervalDays: newFrequencyType === FrequencyType.CUSTOM ? newIntervalDays ?? null : null,
      archivedAt: archivedAtUpdate,
    },
    include: {
      streak: true,
    },
  });
}

export async function archiveHabit(userId: string, habitId: string) {
  const existing = await prisma.habit.findUnique({
    where: { id: habitId },
  });

  if (!existing || existing.userId !== userId) {
    throw new NotFoundError('Habit not found', 'NOT_FOUND');
  }

  return prisma.habit.update({
    where: { id: habitId },
    data: {
      archivedAt: new Date(),
    },
    include: {
      streak: true,
    },
  });
}
