import { describe, it, expect, beforeAll } from 'vitest';
import { CheckInStatus } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';
import {
  levelFromXp,
  progressToNextLevel,
  calculateCheckInXp,
  xpForLevel,
  XP_RULES,
} from '@/server/domain/xp';
import { awardXp, buildXpIdempotencyKey } from '@/server/services/xp';
import { getLeaderboard } from '@/server/services/leaderboard';

describe('XP Domain Logic (Pure)', () => {
  describe('XP Rules', () => {
    it('+10 XP for standard check-in', () => {
      const result = calculateCheckInXp(CheckInStatus.COMPLETED, 3);
      expect(result.baseXp).toBe(10);
      expect(result.milestoneXp).toBe(0);
      expect(result.totalXp).toBe(10);
    });

    it('+15 XP milestone bonus on 7-day streak milestones (streak 7, 14, 21...)', () => {
      const streak7 = calculateCheckInXp(CheckInStatus.COMPLETED, 7);
      expect(streak7.baseXp).toBe(10);
      expect(streak7.milestoneXp).toBe(15);
      expect(streak7.totalXp).toBe(25);

      const streak14 = calculateCheckInXp(CheckInStatus.COMPLETED, 14);
      expect(streak14.milestoneXp).toBe(15);
      expect(streak14.totalXp).toBe(25);

      const streak6 = calculateCheckInXp(CheckInStatus.COMPLETED, 6);
      expect(streak6.milestoneXp).toBe(0);
      expect(streak6.totalXp).toBe(10);
    });

    it('no XP for frozen days, even if on a 7-day milestone', () => {
      const frozenDay = calculateCheckInXp(CheckInStatus.FROZEN, 7);
      expect(frozenDay.baseXp).toBe(0);
      expect(frozenDay.milestoneXp).toBe(0);
      expect(frozenDay.totalXp).toBe(0);
    });

    it('no XP for missed days', () => {
      const missedDay = calculateCheckInXp(CheckInStatus.MISSED, 5);
      expect(frozenDayTotal(missedDay)).toBe(0);
    });

    function frozenDayTotal(r: { totalXp: number }) {
      return r.totalXp;
    }
  });

  describe('Smooth Level Curve', () => {
    it('returns level 1 for 0 or negative XP', () => {
      expect(levelFromXp(0)).toBe(1);
      expect(levelFromXp(-50)).toBe(1);
    });

    it('correctly maps seed data users to their expected levels', () => {
      // Alex Rivera: 220 XP -> Level 2
      expect(levelFromXp(220)).toBe(2);

      // Maya Chen: 450 XP -> Level 3
      expect(levelFromXp(450)).toBe(3);

      // Jordan Lee: 850 XP -> Level 5
      expect(levelFromXp(850)).toBe(5);
    });

    it('smoothly scales across level thresholds monotonically', () => {
      expect(levelFromXp(149)).toBe(1);
      expect(levelFromXp(150)).toBe(2);
      expect(levelFromXp(349)).toBe(2);
      expect(levelFromXp(350)).toBe(3);
      expect(levelFromXp(599)).toBe(3);
      expect(levelFromXp(600)).toBe(4);
      expect(levelFromXp(849)).toBe(4);
      expect(levelFromXp(850)).toBe(5);
      expect(levelFromXp(1149)).toBe(5);
      expect(levelFromXp(1150)).toBe(6);
    });

    it('progressToNextLevel computes correct progress and percentage', () => {
      // Alex Rivera: 220 XP (Level 2: 150 to 350, needs 200 total, 70 progress -> 35%)
      const alexProgress = progressToNextLevel(220);
      expect(alexProgress.level).toBe(2);
      expect(alexProgress.currentXp).toBe(220);
      expect(alexProgress.currentLevelXp).toBe(150);
      expect(alexProgress.nextLevelXp).toBe(350);
      expect(alexProgress.xpInLevel).toBe(70);
      expect(alexProgress.xpNeeded).toBe(200);
      expect(alexProgress.percentage).toBe(35);

      // Maya Chen: 450 XP (Level 3: 350 to 600, needs 250 total, 100 progress -> 40%)
      const mayaProgress = progressToNextLevel(450);
      expect(mayaProgress.level).toBe(3);
      expect(mayaProgress.xpInLevel).toBe(100);
      expect(mayaProgress.xpNeeded).toBe(250);
      expect(mayaProgress.percentage).toBe(40);
    });
  });
});

describe('XP Service: Idempotent XP Awards', () => {
  let testUser: { id: string; xp: number; level: number };

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `xp_test_${Date.now()}@example.com`,
        name: 'XP Test User',
        timezone: 'UTC',
        xp: 0,
        level: 1,
      },
    });
  });

  it('buildXpIdempotencyKey formats unique composite key', () => {
    expect(buildXpIdempotencyKey('CHECK_IN', 'h1', '2026-10-09')).toBe('CHECK_IN:h1:2026-10-09');
    expect(buildXpIdempotencyKey('READ_JOURNAL', undefined, '2026-10-09')).toBe('READ_JOURNAL:2026-10-09');
  });

  it('awards XP on first call, updates User.xp and level in transaction', async () => {
    const res = await awardXp(testUser.id, 'CHECK_IN', 10, {
      habitId: 'habit-xp-1',
      localDate: '2026-10-09',
    });

    expect(res.awarded).toBe(true);
    expect(res.xp).toBe(10);
    expect(res.level).toBe(1);

    const user = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: { xp: true, level: true },
    });
    expect(user?.xp).toBe(10);
  });

  it('is strictly idempotent per (user, type, habit, localDate) on duplicate awards', async () => {
    // Attempt duplicate award with identical parameters
    const duplicateRes = await awardXp(testUser.id, 'CHECK_IN', 10, {
      habitId: 'habit-xp-1',
      localDate: '2026-10-09',
    });

    expect(duplicateRes.awarded).toBe(false);
    expect(duplicateRes.xp).toBe(10); // Did not increase

    const userAfter = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: { xp: true },
    });
    expect(userAfter?.xp).toBe(10); // Still 10, no double-awarding

    const eventCount = await prisma.xpEvent.count({
      where: {
        userId: testUser.id,
        type: 'CHECK_IN:habit-xp-1:2026-10-09',
      },
    });
    expect(eventCount).toBe(1);
  });

  it('allows awarding XP for a different localDate or habitId', async () => {
    // Next day checkin
    const nextDayRes = await awardXp(testUser.id, 'CHECK_IN', 10, {
      habitId: 'habit-xp-1',
      localDate: '2026-10-10',
    });

    expect(nextDayRes.awarded).toBe(true);
    expect(nextDayRes.xp).toBe(20);

    const user = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: { xp: true },
    });
    expect(user?.xp).toBe(20);
  });
});

describe('Leaderboard (SQL Window Function & Seed Data)', () => {
  let mayaUser: { id: string };
  let alexUser: { id: string };
  let jordanUser: { id: string };

  beforeAll(async () => {
    const users = await prisma.user.findMany({
      where: {
        email: { in: ['maya@example.com', 'alex@example.com', 'jordan@example.com'] },
      },
      select: { id: true, email: true },
    });

    mayaUser = users.find((u) => u.email === 'maya@example.com')!;
    alexUser = users.find((u) => u.email === 'alex@example.com')!;
    jordanUser = users.find((u) => u.email === 'jordan@example.com')!;
  });

  it('returns correct ranks on seed data (Jordan #1: 12, Maya #2: 7, Alex #3: 4)', async () => {
    const result = await getLeaderboard(mayaUser.id, {
      scope: 'global',
      period: 'all',
      limit: 10,
    });

    expect(result.entries.length).toBeGreaterThanOrEqual(3);

    // Filter to the seed users to verify their relative ordering
    const seedEntries = result.entries.filter((e) =>
      [jordanUser.id, mayaUser.id, alexUser.id].includes(e.userId)
    );

    expect(seedEntries).toHaveLength(3);

    // Rank 1: Jordan Lee (current streak: 12, longest: 21, xp: 850)
    expect(seedEntries[0].userId).toBe(jordanUser.id);
    expect(seedEntries[0].currentStreak).toBe(12);
    expect(seedEntries[0].longestStreak).toBe(21);
    expect(seedEntries[0].rank).toBe(1);

    // Rank 2: Maya Chen (current streak: 7, longest: 14, xp: 450)
    expect(seedEntries[1].userId).toBe(mayaUser.id);
    expect(seedEntries[1].currentStreak).toBe(7);
    expect(seedEntries[1].longestStreak).toBe(14);
    expect(seedEntries[1].rank).toBe(2);

    // Rank 3: Alex Rivera (current streak: 4, longest: 10, xp: 220)
    expect(seedEntries[2].userId).toBe(alexUser.id);
    expect(seedEntries[2].currentStreak).toBe(4);
    expect(seedEntries[2].longestStreak).toBe(10);
    expect(seedEntries[2].rank).toBe(3);

    // Maya requested the leaderboard -> myRank must be rank 2
    expect(result.myRank).not.toBeNull();
    expect(result.myRank?.userId).toBe(mayaUser.id);
    expect(result.myRank?.rank).toBe(2);
    expect(result.myRank?.currentStreak).toBe(7);
  });

  it('handles cursor pagination on the leaderboard', async () => {
    const page1 = await getLeaderboard(jordanUser.id, {
      scope: 'global',
      period: 'all',
      limit: 2,
    });

    expect(page1.entries).toHaveLength(2);
    expect(page1.nextCursor).toBeDefined();

    const page2 = await getLeaderboard(jordanUser.id, {
      scope: 'global',
      period: 'all',
      cursor: page1.nextCursor ?? undefined,
      limit: 2,
    });

    expect(page2.entries.length).toBeGreaterThanOrEqual(1);
    // Page 2 ranks must be greater than page 1 ranks
    expect(page2.entries[0].rank).toBeGreaterThan(page1.entries[0].rank);
  });

  it('filters by scope=friends correctly', async () => {
    // Create friendship between Maya and Alex
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: mayaUser.id, addresseeId: alexUser.id },
          { requesterId: alexUser.id, addresseeId: mayaUser.id },
        ],
      },
    });

    await prisma.friendship.create({
      data: {
        requesterId: mayaUser.id,
        addresseeId: alexUser.id,
        status: 'ACCEPTED',
      },
    });

    const friendsLeaderboard = await getLeaderboard(mayaUser.id, {
      scope: 'friends',
      period: 'all',
      limit: 10,
    });

    const userIds = friendsLeaderboard.entries.map((e) => e.userId);
    expect(userIds).toContain(mayaUser.id);
    expect(userIds).toContain(alexUser.id);
    expect(userIds).not.toContain(jordanUser.id); // Jordan is not a friend

    // In friends scope, Maya is #1 (7) and Alex is #2 (4)
    expect(friendsLeaderboard.entries[0].userId).toBe(mayaUser.id);
    expect(friendsLeaderboard.entries[0].rank).toBe(1);
    expect(friendsLeaderboard.entries[1].userId).toBe(alexUser.id);
    expect(friendsLeaderboard.entries[1].rank).toBe(2);
  });
});
