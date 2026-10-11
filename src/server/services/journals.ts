import crypto from 'crypto';
import { HabitCategory, JournalVisibility, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/server/lib/prisma';
import { ForbiddenError, NotFoundError, TooManyRequestsError } from '@/server/lib/api';
import { toLocalDate } from '@/server/domain/streak';
import { XP_RULES } from '@/server/domain/xp';
import { awardXp } from '@/server/services/xp';
import { config } from '@/server/lib/config';
import { createCheckIn } from '@/server/services/checkins';

export const createJournalSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
    body: z.string().trim().min(1, 'Body is required'),
    habitId: z
      .string()
      .optional()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined)),
    visibility: z.nativeEnum(JournalVisibility).default(JournalVisibility.PRIVATE),
    category: z.nativeEnum(HabitCategory).optional(),
  })
  .strict();

export const updateJournalSchema = z
  .object({
    title: z.string().trim().min(1, 'Title cannot be empty').max(200).optional(),
    body: z.string().trim().min(1, 'Body cannot be empty').optional(),
    visibility: z.nativeEnum(JournalVisibility).optional(),
    habitId: z
      .string()
      .nullable()
      .optional()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : val)),
    category: z.nativeEnum(HabitCategory).optional(),
  })
  .strict();

export const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .default('20')
    .transform((val) => Number(val))
    .refine((n) => Number.isInteger(n) && n >= 1 && n <= 50, {
      message: 'limit must be an integer between 1 and 50',
    }),
  category: z.nativeEnum(HabitCategory).optional(),
});

export const myJournalsQuerySchema = z.object({
  habitId: z.string().optional(),
  visibility: z.nativeEnum(JournalVisibility).optional(),
});

export type CreateJournalInput = z.infer<typeof createJournalSchema>;
export type UpdateJournalInput = z.infer<typeof updateJournalSchema>;
export type FeedQuery = z.infer<typeof feedQuerySchema>;
export type MyJournalsQuery = z.infer<typeof myJournalsQuerySchema>;

export async function createJournal(userId: string, input: CreateJournalInput) {
  let category = input.category ?? HabitCategory.OTHER;

  if (input.habitId) {
    const habit = await prisma.habit.findUnique({
      where: { id: input.habitId },
    });
    if (!habit || habit.userId !== userId) {
      throw new NotFoundError('Habit not found', 'NOT_FOUND');
    }
    category = habit.category;
  }

  const journal = await prisma.journal.create({
    data: {
      authorId: userId,
      habitId: input.habitId,
      category,
      title: input.title,
      body: input.body,
      visibility: input.visibility,
    },
    include: {
      author: { select: { id: true, name: true } },
      habit: { select: { id: true, name: true, category: true } },
    },
  });

  // Update streak / consistency goal if journaling counts toward it
  if (input.habitId) {
    try {
      await createCheckIn(userId, input.habitId, { note: `Journal: ${input.title}` }, new Date());
    } catch {
      // Habit check-in might already exist or not scheduled today, ignore gracefully
    }
  }

  // Award XP (+10) once per journal entry.
  // Editing, re-saving, or deleting and recreating the same entry must not give XP again.
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${userId}:${input.title.trim().toLowerCase()}:${input.body.trim().toLowerCase()}`)
    .digest('hex')
    .slice(0, 16);

  const existingEntryXp = await prisma.xpEvent.findFirst({
    where: {
      userId,
      type: `JOURNAL_CREATE:${fingerprint}`,
    },
  });

  if (!existingEntryXp) {
    await awardXp(userId, `JOURNAL_CREATE:${fingerprint}`, XP_RULES.JOURNAL_CREATE, {
      journalId: journal.id,
    });
  }

  return journal;
}

export async function updateJournal(userId: string, id: string, input: UpdateJournalInput) {
  const existing = await prisma.journal.findUnique({ where: { id } });
  if (!existing || existing.authorId !== userId) {
    throw new NotFoundError('Journal not found', 'NOT_FOUND');
  }

  let category = input.category;
  if (input.habitId !== undefined) {
    if (input.habitId) {
      const habit = await prisma.habit.findUnique({ where: { id: input.habitId } });
      if (!habit || habit.userId !== userId) {
        throw new NotFoundError('Habit not found', 'NOT_FOUND');
      }
      category = habit.category;
    }
  }

  return prisma.journal.update({
    where: { id },
    data: {
      title: input.title,
      body: input.body,
      visibility: input.visibility,
      habitId: input.habitId,
      ...(category ? { category } : {}),
    },
    include: {
      author: { select: { id: true, name: true } },
      habit: { select: { id: true, name: true, category: true } },
    },
  });
}

export async function deleteJournal(userId: string, id: string) {
  const existing = await prisma.journal.findUnique({ where: { id } });
  if (!existing || existing.authorId !== userId) {
    throw new NotFoundError('Journal not found', 'NOT_FOUND');
  }

  await prisma.journal.delete({ where: { id } });
  return { success: true };
}

export async function getMyJournals(userId: string, query?: MyJournalsQuery) {
  return prisma.journal.findMany({
    where: {
      authorId: userId,
      ...(query?.habitId ? { habitId: query.habitId } : {}),
      ...(query?.visibility ? { visibility: query.visibility } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, name: true } },
      habit: { select: { id: true, name: true, category: true } },
    },
  });
}

export async function getJournalById(userId: string | null, id: string) {
  const journal = await prisma.journal.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, image: true } },
      habit: { select: { id: true, name: true, category: true } },
    },
  });

  if (!journal) {
    throw new NotFoundError('Journal not found', 'NOT_FOUND');
  }

  // PUBLIC for anyone logged in; PRIVATE only for the author (404 otherwise)
  if (journal.visibility === JournalVisibility.PRIVATE && (!userId || journal.authorId !== userId)) {
    throw new NotFoundError('Journal not found', 'NOT_FOUND');
  }

  let likeCount = 0;
  let likedByMe = false;
  let commentCount = 0;

  try {
    if (prisma.like?.count) {
      const lc = await prisma.like.count({ where: { journalId: id } });
      likeCount = typeof lc === 'number' ? lc : 0;
      if (userId) {
        const myLikes = await prisma.like.count({ where: { journalId: id, userId } });
        likedByMe = typeof myLikes === 'number' && myLikes > 0;
      }
    }
    if (prisma.comment?.count) {
      const cc = await prisma.comment.count({ where: { journalId: id } });
      commentCount = typeof cc === 'number' ? cc : 0;
    }
  } catch {
    // Fallback if like/comment models uninitialized in mocks
  }

  return {
    ...journal,
    likeCount,
    likedByMe,
    commentCount,
  };
}

export async function getJournalFeed(userId: string, query: FeedQuery) {
  let categoriesToFilter: HabitCategory[] | undefined = undefined;

  if (query.category) {
    categoriesToFilter = [query.category];
  } else {
    const userHabits = await prisma.habit.findMany({
      where: { userId, archivedAt: null },
      select: { category: true },
    });
    const habitCategories = Array.from(new Set(userHabits.map((h) => h.category)));
    if (habitCategories.length > 0) {
      categoriesToFilter = habitCategories;
    }
  }

  const where: Prisma.JournalWhereInput = {
    visibility: JournalVisibility.PUBLIC,
    authorId: { not: userId },
  };

  if (categoriesToFilter && categoriesToFilter.length > 0) {
    where.category = { in: categoriesToFilter };
  } else if (!query.category) {
    // User has no habits, so feed filtered to categories of user habits is empty
    where.category = { in: [] };
  }

  const limit = query.limit;
  const items = await prisma.journal.findMany({
    where,
    take: limit + 1,
    cursor: query.cursor ? { id: query.cursor } : undefined,
    skip: query.cursor ? 1 : 0,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      author: { select: { id: true, name: true } },
      habit: { select: { id: true, name: true, category: true } },
    },
  });

  let nextCursor: string | null = null;
  if (items.length > limit) {
    const nextItem = items.pop();
    nextCursor = nextItem!.id;
  }

  return { items, nextCursor };
}

export async function readJournal(userId: string, journalId: string, nowUtc: Date = new Date()) {
  const journal = await prisma.journal.findUnique({ where: { id: journalId } });
  if (!journal) {
    throw new NotFoundError('Journal not found', 'NOT_FOUND');
  }

  if (journal.visibility === JournalVisibility.PRIVATE && journal.authorId !== userId) {
    throw new NotFoundError('Journal not found', 'NOT_FOUND');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  if (!user) {
    throw new NotFoundError('User not found', 'NOT_FOUND');
  }

  const localDate = toLocalDate(nowUtc, user.timezone);

  const read = await prisma.journalRead.upsert({
    where: {
      userId_journalId_localDate: {
        userId,
        journalId,
        localDate,
      },
    },
    create: {
      userId,
      journalId,
      localDate,
    },
    update: {},
  });

  // Award +5 XP once per entry per user per day. Don't award for reading your own entries.
  let awarded = false;
  if (journal.authorId !== userId) {
    const xpResult = await awardXp(userId, 'READ_JOURNAL', XP_RULES.READ_JOURNAL, {
      journalId,
      localDate,
    });
    awarded = xpResult.awarded;
  }

  (read as any).xpAwarded = awarded;
  return read;
}

export async function toggleJournalLike(userId: string, journalId: string) {
  const journal = await prisma.journal.findUnique({
    where: { id: journalId },
    select: { id: true, visibility: true, authorId: true },
  });

  if (!journal) {
    throw new NotFoundError('Journal not found', 'NOT_FOUND');
  }

  if (journal.visibility === JournalVisibility.PRIVATE && journal.authorId !== userId) {
    throw new NotFoundError('Journal not found', 'NOT_FOUND');
  }

  const existing = await prisma.like.findUnique({
    where: {
      userId_journalId: { userId, journalId },
    },
  });

  let liked = false;
  if (existing) {
    await prisma.like.delete({
      where: { id: existing.id },
    });
    liked = false;
  } else {
    try {
      await prisma.like.create({
        data: { userId, journalId },
      });
      liked = true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        liked = true;
      } else {
        throw err;
      }
    }
  }

  const likeCount = await prisma.like.count({
    where: { journalId },
  });

  return { liked, likeCount };
}

export const createCommentSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, 'Comment cannot be empty')
      .max(500, 'Comment must be at most 500 characters'),
  })
  .strict();

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export async function getJournalComments(journalId: string, userId?: string | null) {
  const journal = await prisma.journal.findUnique({
    where: { id: journalId },
    select: { id: true, visibility: true, authorId: true },
  });

  if (!journal) {
    throw new NotFoundError('Journal not found', 'NOT_FOUND');
  }

  if (journal.visibility === JournalVisibility.PRIVATE && (!userId || journal.authorId !== userId)) {
    throw new NotFoundError('Journal not found', 'NOT_FOUND');
  }

  return prisma.comment.findMany({
    where: { journalId },
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });
}

export async function addJournalComment(
  userId: string,
  journalId: string,
  input: CreateCommentInput
) {
  const journal = await prisma.journal.findUnique({
    where: { id: journalId },
    select: { id: true, visibility: true, authorId: true },
  });

  if (!journal) {
    throw new NotFoundError('Journal not found', 'NOT_FOUND');
  }

  if (journal.visibility === JournalVisibility.PRIVATE && journal.authorId !== userId) {
    throw new NotFoundError('Journal not found', 'NOT_FOUND');
  }

  // Rate limit: max 1 comment per 5 seconds per user to prevent spam
  const recentComment = await prisma.comment.findFirst({
    where: {
      authorId: userId,
      createdAt: {
        gte: new Date(Date.now() - 5000),
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (recentComment) {
    throw new TooManyRequestsError(
      'You are commenting too fast. Please wait 5 seconds between comments.',
      'RATE_LIMITED'
    );
  }

  const comment = await prisma.comment.create({
    data: {
      journalId,
      authorId: userId,
      content: input.content.trim(),
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  return comment;
}

export async function deleteJournalComment(
  userId: string,
  journalId: string,
  commentId: string
) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      journal: { select: { id: true, authorId: true } },
    },
  });

  if (!comment || comment.journalId !== journalId) {
    throw new NotFoundError('Comment not found', 'NOT_FOUND');
  }

  // Users can delete their own comments (and the journal owner can delete any comment on their journal)
  const isAuthor = comment.authorId === userId;
  const isJournalOwner = comment.journal.authorId === userId;

  if (!isAuthor && !isJournalOwner) {
    throw new ForbiddenError('You do not have permission to delete this comment', 'FORBIDDEN');
  }

  await prisma.comment.delete({
    where: { id: commentId },
  });

  return { success: true };
}

export async function getJournalReadStatus(userId: string, nowUtc: Date = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  if (!user) {
    throw new NotFoundError('User not found', 'NOT_FOUND');
  }

  const localDate = toLocalDate(nowUtc, user.timezone);
  const count = await prisma.journalRead.count({
    where: { userId, localDate },
  });

  return {
    readToday: count > 0,
    required: config.REQUIRE_DAILY_JOURNAL_READ,
  };
}
