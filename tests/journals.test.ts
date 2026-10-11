import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HabitCategory, JournalVisibility } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';
import {
  createJournal,
  updateJournal,
  deleteJournal,
  getMyJournals,
  getJournalById,
  getJournalFeed,
  readJournal,
  getJournalReadStatus,
} from '@/server/services/journals';
import { config, setRequireDailyJournalRead } from '@/server/lib/config';
import { createCheckIn } from '@/server/services/checkins';
import { AppError } from '@/server/lib/api';
import { POST as postJournalHandler } from '@app/api/journals/route';
import { GET as getMineHandler } from '@app/api/journals/mine/route';
import { GET as getFeedHandler } from '@app/api/journals/feed/route';
import { GET as getReadStatusHandler } from '@app/api/journals/read-status/route';
import {
  GET as getJournalHandler,
  PATCH as patchJournalHandler,
  DELETE as deleteJournalHandler,
} from '@app/api/journals/[id]/route';
import { POST as readJournalHandler } from '@app/api/journals/[id]/read/route';
import { POST as postLikeHandler } from '@app/api/journals/[id]/like/route';
import {
  GET as getCommentsHandler,
  POST as postCommentHandler,
} from '@app/api/journals/[id]/comments/route';
import { DELETE as deleteCommentHandler } from '@app/api/journals/[id]/comments/[commentId]/route';
import {
  toggleJournalLike,
  getJournalComments,
  addJournalComment,
  deleteJournalComment,
} from '@/server/services/journals';
import { XP_RULES } from '@/server/domain/xp';

vi.mock('@/server/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    habit: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    journal: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    journalRead: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    like: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    comment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    checkIn: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    freezeUse: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    streak: {
      upsert: vi.fn(),
    },
    xpEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

describe('Journals Service & API Routes', () => {
  const userA = {
    id: 'user-a',
    name: 'Alice',
    email: 'alice@example.com',
    timezone: 'America/New_York',
    xp: 0,
    level: 1,
  };

  const userB = {
    id: 'user-b',
    name: 'Bob',
    email: 'bob@example.com',
    timezone: 'Asia/Kolkata',
    xp: 0,
    level: 1,
  };

  const habitA = {
    id: 'habit-fitness-a',
    userId: 'user-a',
    name: 'Morning Workout',
    category: HabitCategory.FITNESS,
    archivedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setRequireDailyJournalRead(false);

    (prisma.user.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.id === userA.id) return Promise.resolve(userA);
      if (where.id === userB.id) return Promise.resolve(userB);
      return Promise.resolve(null);
    });
    (prisma.user.findFirst as any).mockImplementation(({ where }: any) => {
      if (where?.OR?.[0]?.id === userA.id || where?.id === userA.id) return Promise.resolve(userA);
      if (where?.OR?.[0]?.id === userB.id || where?.id === userB.id) return Promise.resolve(userB);
      return Promise.resolve(null);
    });
    (prisma.user.update as any).mockResolvedValue({ ...userA });
    (prisma.xpEvent.findFirst as any).mockResolvedValue(null);
    (prisma.xpEvent.create as any).mockResolvedValue({ id: 'xp-1' });

    (prisma.habit.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.id === habitA.id) return Promise.resolve(habitA);
      return Promise.resolve(null);
    });

    (prisma.checkIn.findMany as any).mockResolvedValue([]);
  });

  describe('Creation and Habit Category Copying', () => {
    it('copies category from the habit when habitId is provided', async () => {
      const createdRecord = {
        id: 'journal-1',
        authorId: userA.id,
        habitId: habitA.id,
        category: HabitCategory.FITNESS, // Copied from habitA
        title: 'Great workout today',
        body: 'Did 30 minutes of cardio and weights.',
        visibility: JournalVisibility.PUBLIC,
      };
      (prisma.journal.create as any).mockResolvedValue(createdRecord);

      const result = await createJournal(userA.id, {
        title: 'Great workout today',
        body: 'Did 30 minutes of cardio and weights.',
        habitId: habitA.id,
        visibility: JournalVisibility.PUBLIC,
      });

      expect(prisma.journal.create).toHaveBeenCalledWith({
        data: {
          authorId: userA.id,
          habitId: habitA.id,
          category: HabitCategory.FITNESS,
          title: 'Great workout today',
          body: 'Did 30 minutes of cardio and weights.',
          visibility: JournalVisibility.PUBLIC,
        },
        include: {
          author: { select: { id: true, name: true } },
          habit: { select: { id: true, name: true, category: true } },
        },
      });
      expect(result.category).toBe(HabitCategory.FITNESS);
    });

    it('rejects habitId belonging to another user with 404', async () => {
      await expect(
        createJournal(userB.id, {
          title: 'Not my habit',
          body: 'Trying to attach to Alice habit',
          habitId: habitA.id,
          visibility: JournalVisibility.PRIVATE,
        })
      ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    });

    it('defaults category to OTHER when no habitId and no category specified', async () => {
      (prisma.journal.create as any).mockImplementation(({ data }: any) => ({
        id: 'j-2',
        ...data,
      }));

      const result = await createJournal(userA.id, {
        title: 'Random reflection',
        body: 'Thinking about the week.',
        visibility: JournalVisibility.PRIVATE,
      });

      expect(result.category).toBe(HabitCategory.OTHER);
    });
  });

  describe('Private Journal Leak Prevention', () => {
    const privateJournalA = {
      id: 'private-journal-123',
      authorId: userA.id,
      habitId: habitA.id,
      category: HabitCategory.FITNESS,
      title: 'Secret personal reflections',
      body: 'Private health notes not for anyone else.',
      visibility: JournalVisibility.PRIVATE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (prisma.journal.findUnique as any).mockImplementation(({ where }: any) => {
        if (where.id === privateJournalA.id) return Promise.resolve(privateJournalA);
        return Promise.resolve(null);
      });
    });

    it('GET /api/journals/:id returns 404 (not 403 or journal) when another user attempts access', async () => {
      // Bob requests Alice's PRIVATE journal
      await expect(getJournalById(userB.id, privateJournalA.id)).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });

      const req = new Request(`http://localhost/api/journals/${privateJournalA.id}`, {
        method: 'GET',
        headers: { authorization: `Bearer ${userB.id}` },
      });
      const res = await getJournalHandler(req, { params: { id: privateJournalA.id } });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
      expect(json.data).toBeUndefined();
    });

    it('GET /api/journals/:id returns 200 for the author of a private journal', async () => {
      const result = await getJournalById(userA.id, privateJournalA.id);
      expect(result.id).toBe(privateJournalA.id);
      expect(result.body).toBe(privateJournalA.body);
    });

    it('GET /api/journals/feed strictly excludes private journals and excludes user own journals', async () => {
      const publicJournalA = {
        id: 'public-a',
        authorId: userA.id,
        visibility: JournalVisibility.PUBLIC,
        category: HabitCategory.FITNESS,
      };
      const publicJournalB = {
        id: 'public-b',
        authorId: userB.id,
        visibility: JournalVisibility.PUBLIC,
        category: HabitCategory.FITNESS,
      };

      // Mock user habits: Alice has FITNESS habit
      (prisma.habit.findMany as any).mockResolvedValue([habitA]);

      // Prisma findMany mock
      (prisma.journal.findMany as any).mockImplementation(({ where }: any) => {
        // Assert query enforces PUBLIC and excludes own journals
        expect(where.visibility).toBe(JournalVisibility.PUBLIC);
        expect(where.authorId).toEqual({ not: userA.id });
        expect(where.category).toEqual({ in: [HabitCategory.FITNESS] });
        return Promise.resolve([publicJournalB]);
      });

      const feed = await getJournalFeed(userA.id, { limit: 20 });
      expect(feed.items).toHaveLength(1);
      expect(feed.items[0].id).toBe(publicJournalB.id);
      // Private journal is never returned in feed
      expect(feed.items.some((j: any) => j.id === privateJournalA.id)).toBe(false);
    });

    it('PATCH /api/journals/:id returns 404 when non-author attempts edit', async () => {
      await expect(
        updateJournal(userB.id, privateJournalA.id, { title: 'Hacked title' })
      ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
      expect(prisma.journal.update).not.toHaveBeenCalled();
    });

    it('DELETE /api/journals/:id returns 404 when non-author attempts deletion', async () => {
      await expect(deleteJournal(userB.id, privateJournalA.id)).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
      expect(prisma.journal.delete).not.toHaveBeenCalled();
    });

    it('POST /api/journals/:id/read returns 404 when non-author attempts reading a private journal', async () => {
      await expect(readJournal(userB.id, privateJournalA.id)).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
      expect(prisma.journalRead.upsert).not.toHaveBeenCalled();
    });
  });

  describe('Timezone Boundary for readToday', () => {
    it('evaluates readToday based on the user local calendar day across timezones', async () => {
      // Instant: 2026-10-09T20:00:00Z
      // In Asia/Kolkata (+05:30): It is 2026-10-10 01:30 (Calendar day: 2026-10-10)
      // In America/Los_Angeles (-07:00 PDT): It is 2026-10-09 13:00 (Calendar day: 2026-10-09)
      const instantUtc = new Date('2026-10-09T20:00:00.000Z');

      const laUser = {
        id: 'user-la',
        name: 'LA User',
        timezone: 'America/Los_Angeles',
      };
      const kolkataUser = {
        id: 'user-kolkata',
        name: 'Kolkata User',
        timezone: 'Asia/Kolkata',
      };

      (prisma.user.findUnique as any).mockImplementation(({ where }: any) => {
        if (where.id === laUser.id) return Promise.resolve(laUser);
        if (where.id === kolkataUser.id) return Promise.resolve(kolkataUser);
        return Promise.resolve(null);
      });

      // There is a read recorded for localDate 2026-10-09
      (prisma.journalRead.count as any).mockImplementation(({ where }: any) => {
        const ymd = where.localDate.toISOString().slice(0, 10);
        // Only 2026-10-09 has a read
        if (ymd === '2026-10-09') return Promise.resolve(1);
        return Promise.resolve(0);
      });

      // LA User: at this instant, their local day is 2026-10-09 -> readToday is TRUE
      const laStatus = await getJournalReadStatus(laUser.id, instantUtc);
      expect(laStatus.readToday).toBe(true);

      // Kolkata User: at the same instant, their local day is already 2026-10-10 -> readToday is FALSE
      const kolkataStatus = await getJournalReadStatus(kolkataUser.id, instantUtc);
      expect(kolkataStatus.readToday).toBe(false);
    });

    it('transitions readToday from true to false at midnight in the user local timezone', async () => {
      const user = {
        id: 'user-tz-test',
        timezone: 'America/New_York', // UTC-4 in Oct
      };
      (prisma.user.findUnique as any).mockResolvedValue(user);

      // A read was logged for 2026-10-09
      (prisma.journalRead.count as any).mockImplementation(({ where }: any) => {
        const ymd = where.localDate.toISOString().slice(0, 10);
        return Promise.resolve(ymd === '2026-10-09' ? 1 : 0);
      });

      // 23:59 NY time on Oct 9 (03:59 UTC on Oct 10) -> 2026-10-09 local -> readToday is true
      const justBeforeMidnight = new Date('2026-10-10T03:59:00.000Z');
      expect((await getJournalReadStatus(user.id, justBeforeMidnight)).readToday).toBe(true);

      // 00:01 NY time on Oct 10 (04:01 UTC on Oct 10) -> 2026-10-10 local -> readToday is false
      const justAfterMidnight = new Date('2026-10-10T04:01:00.000Z');
      expect((await getJournalReadStatus(user.id, justAfterMidnight)).readToday).toBe(false);
    });
  });

  describe('Idempotent Reads', () => {
    const publicJournal = {
      id: 'journal-public-1',
      authorId: userB.id,
      visibility: JournalVisibility.PUBLIC,
    };

    beforeEach(() => {
      (prisma.journal.findUnique as any).mockResolvedValue(publicJournal);
    });

    it('creates JournalRead idempotently using upsert on repeat reads', async () => {
      const readRecord = {
        id: 'read-rec-1',
        userId: userA.id,
        journalId: publicJournal.id,
        localDate: new Date('2026-10-09T00:00:00.000Z'),
        createdAt: new Date(),
      };
      (prisma.journalRead.upsert as any).mockResolvedValue(readRecord);

      const firstRead = await readJournal(userA.id, publicJournal.id, new Date('2026-10-09T12:00:00.000Z'));
      const secondRead = await readJournal(userA.id, publicJournal.id, new Date('2026-10-09T14:30:00.000Z'));

      expect(firstRead).toEqual(readRecord);
      expect(secondRead).toEqual(readRecord);
      expect(prisma.journalRead.upsert).toHaveBeenCalledTimes(2);

      // Verify upsert where clause matches unique composite key
      expect(prisma.journalRead.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_journalId_localDate: {
              userId: userA.id,
              journalId: publicJournal.id,
              localDate: expect.any(Date),
            },
          },
        })
      );
    });
  });

  describe('Check-in Service Integration with REQUIRE_DAILY_JOURNAL_READ', () => {
    const testHabit = {
      id: 'habit-checkin-1',
      userId: userA.id,
      name: 'Daily Yoga',
      category: HabitCategory.HEALTH,
      frequencyType: 'DAILY' as any,
      daysOfWeek: [],
      intervalDays: null,
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      targetPerPeriod: null,
      archivedAt: null,
      streak: { current: 1, longest: 1, lastCountedDate: null },
    };

    beforeEach(() => {
      (prisma.habit.findUnique as any).mockResolvedValue({
        ...testHabit,
        user: userA,
      });
      (prisma.checkIn.findUnique as any).mockResolvedValue(null);
      (prisma.checkIn.create as any).mockResolvedValue({
        id: 'checkin-1',
        habitId: testHabit.id,
        userId: userA.id,
        localDate: new Date('2026-10-09T00:00:00.000Z'),
        status: 'COMPLETED',
      });
      (prisma.streak.upsert as any).mockResolvedValue({ current: 2, longest: 2 });
    });

    it('permits check-in without journal read when REQUIRE_DAILY_JOURNAL_READ is false', async () => {
      setRequireDailyJournalRead(false);
      expect(config.REQUIRE_DAILY_JOURNAL_READ).toBe(false);

      // User has 0 journal reads
      (prisma.journalRead.count as any).mockResolvedValue(0);

      const result = await createCheckIn(userA.id, testHabit.id, {}, new Date('2026-10-09T12:00:00.000Z'));
      expect(result.checkIn.id).toBe('checkin-1');
    });

    it('blocks check-in with DAILY_JOURNAL_REQUIRED when REQUIRE_DAILY_JOURNAL_READ is true and no read exists', async () => {
      setRequireDailyJournalRead(true);
      expect(config.REQUIRE_DAILY_JOURNAL_READ).toBe(true);

      // User has 0 journal reads today
      (prisma.journalRead.count as any).mockResolvedValue(0);

      await expect(
        createCheckIn(userA.id, testHabit.id, {}, new Date('2026-10-09T12:00:00.000Z'))
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'DAILY_JOURNAL_REQUIRED',
      });
    });

    it('allows check-in when REQUIRE_DAILY_JOURNAL_READ is true and user has read a journal today', async () => {
      setRequireDailyJournalRead(true);

      // User has 1 journal read today
      (prisma.journalRead.count as any).mockResolvedValue(1);

      const result = await createCheckIn(userA.id, testHabit.id, {}, new Date('2026-10-09T12:00:00.000Z'));
      expect(result.checkIn.id).toBe('checkin-1');
    });
  });

  describe('Route Handlers', () => {
    it('POST /api/journals creates journal and returns 201', async () => {
      const created = {
        id: 'new-journal-id',
        title: 'New Entry',
        body: 'Writing today',
        category: HabitCategory.OTHER,
        visibility: JournalVisibility.PUBLIC,
      };
      (prisma.journal.create as any).mockResolvedValue(created);

      const req = new Request('http://localhost/api/journals', {
        method: 'POST',
        headers: { authorization: `Bearer ${userA.id}` },
        body: JSON.stringify({
          title: 'New Entry',
          body: 'Writing today',
          visibility: 'PUBLIC',
        }),
      });

      const res = await postJournalHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe('new-journal-id');
    });

    it('GET /api/journals/mine returns user journals', async () => {
      (prisma.journal.findMany as any).mockResolvedValue([{ id: 'mine-1', title: 'Mine' }]);

      const req = new Request('http://localhost/api/journals/mine', {
        method: 'GET',
        headers: { authorization: `Bearer ${userA.id}` },
      });

      const res = await getMineHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
    });

    it('GET /api/journals/feed returns paginated feed', async () => {
      (prisma.habit.findMany as any).mockResolvedValue([{ category: HabitCategory.FITNESS }]);
      (prisma.journal.findMany as any).mockResolvedValue([
        { id: 'feed-1', title: 'Feed 1', category: HabitCategory.FITNESS },
      ]);

      const req = new Request('http://localhost/api/journals/feed?limit=10', {
        method: 'GET',
        headers: { authorization: `Bearer ${userA.id}` },
      });

      const res = await getFeedHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.items).toHaveLength(1);
    });

    it('POST /api/journals/:id/read records read and GET /api/journals/read-status returns status', async () => {
      (prisma.journal.findUnique as any).mockResolvedValue({
        id: 'j-to-read',
        visibility: JournalVisibility.PUBLIC,
        authorId: userB.id,
      });
      (prisma.journalRead.upsert as any).mockResolvedValue({
        id: 'read-1',
        journalId: 'j-to-read',
        userId: userA.id,
      });
      (prisma.journalRead.count as any).mockResolvedValue(1);

      const readReq = new Request('http://localhost/api/journals/j-to-read/read', {
        method: 'POST',
        headers: { authorization: `Bearer ${userA.id}` },
      });
      const readRes = await readJournalHandler(readReq, { params: { id: 'j-to-read' } });
      expect(readRes.status).toBe(201);

      const statusReq = new Request('http://localhost/api/journals/read-status', {
        method: 'GET',
        headers: { authorization: `Bearer ${userA.id}` },
      });
      const statusRes = await getReadStatusHandler(statusReq);
      expect(statusRes.status).toBe(200);
      const json = await statusRes.json();
      expect(json.data.readToday).toBe(true);
    });
  });

  describe('Likes System', () => {
    const journalPublic = {
      id: 'journal-like-test',
      authorId: userB.id,
      visibility: JournalVisibility.PUBLIC,
    };

    beforeEach(() => {
      (prisma.journal.findUnique as any).mockResolvedValue(journalPublic);
    });

    it('toggles like from unliked to liked and returns updated count', async () => {
      (prisma.like.findUnique as any).mockResolvedValue(null);
      (prisma.like.create as any).mockResolvedValue({ id: 'like-1', userId: userA.id, journalId: journalPublic.id });
      (prisma.like.count as any).mockResolvedValue(1);

      const result = await toggleJournalLike(userA.id, journalPublic.id);
      expect(result.liked).toBe(true);
      expect(result.likeCount).toBe(1);
      expect(prisma.like.create).toHaveBeenCalledWith({
        data: { userId: userA.id, journalId: journalPublic.id },
      });
    });

    it('toggles like from liked to unliked and returns updated count', async () => {
      (prisma.like.findUnique as any).mockResolvedValue({ id: 'like-1', userId: userA.id, journalId: journalPublic.id });
      (prisma.like.delete as any).mockResolvedValue({ id: 'like-1' });
      (prisma.like.count as any).mockResolvedValue(0);

      const result = await toggleJournalLike(userA.id, journalPublic.id);
      expect(result.liked).toBe(false);
      expect(result.likeCount).toBe(0);
      expect(prisma.like.delete).toHaveBeenCalledWith({ where: { id: 'like-1' } });
    });

    it('POST /api/journals/:id/like requires authentication', async () => {
      const req = new Request(`http://localhost/api/journals/${journalPublic.id}/like`, {
        method: 'POST',
      });
      const res = await postLikeHandler(req, { params: { id: journalPublic.id } });
      expect(res.status).toBe(401);
    });
  });

  describe('Comments System', () => {
    const journalPublic = {
      id: 'journal-comment-test',
      authorId: userB.id,
      visibility: JournalVisibility.PUBLIC,
    };

    beforeEach(() => {
      (prisma.journal.findUnique as any).mockResolvedValue(journalPublic);
    });

    it('adds a valid comment and returns it', async () => {
      (prisma.comment.findFirst as any).mockResolvedValue(null); // No recent comments
      (prisma.comment.create as any).mockResolvedValue({
        id: 'c-1',
        journalId: journalPublic.id,
        authorId: userA.id,
        content: 'Inspiring reflection!',
        createdAt: new Date(),
        author: { id: userA.id, name: userA.name, image: null },
      });

      const result = await addJournalComment(userA.id, journalPublic.id, {
        content: 'Inspiring reflection!',
      });
      expect(result.id).toBe('c-1');
      expect(result.content).toBe('Inspiring reflection!');
    });

    it('enforces 5-second rate limit between comments', async () => {
      // Comment made 2 seconds ago
      (prisma.comment.findFirst as any).mockResolvedValue({
        id: 'c-recent',
        createdAt: new Date(Date.now() - 2000),
      });

      await expect(
        addJournalComment(userA.id, journalPublic.id, { content: 'Spamming another comment' })
      ).rejects.toMatchObject({
        statusCode: 429,
        code: 'RATE_LIMITED',
      });
    });

    it('allows comment author to delete their own comment', async () => {
      (prisma.comment.findUnique as any).mockResolvedValue({
        id: 'c-1',
        journalId: journalPublic.id,
        authorId: userA.id,
        journal: { id: journalPublic.id, authorId: userB.id },
      });
      (prisma.comment.delete as any).mockResolvedValue({ id: 'c-1' });

      const res = await deleteJournalComment(userA.id, journalPublic.id, 'c-1');
      expect(res.success).toBe(true);
    });

    it('allows journal owner to delete any comment on their journal', async () => {
      (prisma.comment.findUnique as any).mockResolvedValue({
        id: 'c-1',
        journalId: journalPublic.id,
        authorId: userA.id, // Alice wrote it
        journal: { id: journalPublic.id, authorId: userB.id }, // Bob owns the journal
      });
      (prisma.comment.delete as any).mockResolvedValue({ id: 'c-1' });

      // Bob deletes Alice's comment on Bob's journal
      const res = await deleteJournalComment(userB.id, journalPublic.id, 'c-1');
      expect(res.success).toBe(true);
    });

    it('rejects deletion with 403 when user is neither comment author nor journal owner', async () => {
      const userC = 'user-c';
      (prisma.comment.findUnique as any).mockResolvedValue({
        id: 'c-1',
        journalId: journalPublic.id,
        authorId: userA.id,
        journal: { id: journalPublic.id, authorId: userB.id },
      });

      await expect(
        deleteJournalComment(userC, journalPublic.id, 'c-1')
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });

  describe('XP Award Rules on Journaling', () => {
    it('awards XP only once when creating a new journal entry', async () => {
      (prisma.journal.create as any).mockResolvedValue({
        id: 'j-new-1',
        authorId: userA.id,
        title: 'Fresh reflection',
        body: 'Unique content here',
        category: HabitCategory.MINDFULNESS,
        visibility: JournalVisibility.PUBLIC,
      });

      // First creation: no prior XP event for this entry
      (prisma.xpEvent.findFirst as any).mockResolvedValue(null);

      await createJournal(userA.id, {
        title: 'Fresh reflection',
        body: 'Unique content here',
        category: HabitCategory.MINDFULNESS,
        visibility: JournalVisibility.PUBLIC,
      });

      // Verified XP event was created
      expect(prisma.xpEvent.create).toHaveBeenCalled();
    });

    it('does not award XP again when re-creating the same entry content', async () => {
      (prisma.journal.create as any).mockResolvedValue({
        id: 'j-duplicate-1',
        authorId: userA.id,
        title: 'Same reflection',
        body: 'Identical body text',
        category: HabitCategory.MINDFULNESS,
        visibility: JournalVisibility.PUBLIC,
      });

      // Existing entry XP already found
      (prisma.xpEvent.findFirst as any).mockResolvedValue({
        id: 'xp-prev-1',
        type: 'JOURNAL_CREATE:fingerprint',
      });

      await createJournal(userA.id, {
        title: 'Same reflection',
        body: 'Identical body text',
        category: HabitCategory.MINDFULNESS,
        visibility: JournalVisibility.PUBLIC,
      });

      // prisma.xpEvent.create should NOT have been called
      expect(prisma.xpEvent.create).not.toHaveBeenCalled();
    });

    it('does not award XP when reading your own journal entry', async () => {
      const ownJournal = {
        id: 'own-j-1',
        authorId: userA.id,
        visibility: JournalVisibility.PUBLIC,
      };
      (prisma.journal.findUnique as any).mockResolvedValue(ownJournal);
      (prisma.journalRead.upsert as any).mockResolvedValue({
        id: 'read-own',
        journalId: ownJournal.id,
        userId: userA.id,
      });

      const res = await readJournal(userA.id, ownJournal.id, new Date());
      expect((res as any).xpAwarded).toBe(false);
      expect(prisma.xpEvent.create).not.toHaveBeenCalled();
    });
  });
});
