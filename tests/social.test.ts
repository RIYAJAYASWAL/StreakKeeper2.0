import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FriendshipStatus, GroupRole, GroupType, HabitCategory } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';
import {
  computeJaccardSimilarity,
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  createGroup,
  getMyGroups,
  discoverGroups,
  joinGroup,
  leaveGroup,
  getGroupMembers,
  getSimilarPeople,
} from '@/server/services/social';
import { POST as sendFriendRequestHandler } from '@app/api/friends/request/route';
import { POST as acceptFriendRequestHandler } from '@app/api/friends/[id]/accept/route';
import { GET as getFriendsHandler } from '@app/api/friends/route';
import { POST as createGroupHandler, GET as getMyGroupsHandler } from '@app/api/groups/route';
import { GET as discoverGroupsHandler } from '@app/api/groups/discover/route';
import { POST as joinGroupHandler } from '@app/api/groups/[id]/join/route';
import { POST as leaveGroupHandler } from '@app/api/groups/[id]/leave/route';
import { GET as getGroupMembersHandler } from '@app/api/groups/[id]/members/route';
import { GET as getSimilarPeopleHandler } from '@app/api/people/similar/route';

vi.mock('@/server/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    friendship: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    group: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    groupMember: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    habit: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

describe('Social Features: Friends, Groups, and Similar People', () => {
  const userMe = {
    id: 'user-me',
    name: 'Me User',
    email: 'me@example.com',
    passwordHash: '$2a$12$secretpasswordhash',
    level: 5,
    timezone: 'UTC',
  };

  const userFriend = {
    id: 'user-friend',
    name: 'Best Friend',
    email: 'friend@example.com',
    passwordHash: '$2a$12$secretpasswordhash',
    level: 4,
    timezone: 'UTC',
  };

  const userOther = {
    id: 'user-other',
    name: 'Other Person',
    email: 'other@example.com',
    passwordHash: '$2a$12$secretpasswordhash',
    level: 3,
    timezone: 'UTC',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.user.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.id === userMe.id) return Promise.resolve(userMe);
      if (where.id === userFriend.id) return Promise.resolve(userFriend);
      if (where.id === userOther.id) return Promise.resolve(userOther);
      return Promise.resolve(null);
    });

    (prisma.user.findFirst as any).mockImplementation(({ where }: any) => {
      const id = where?.OR?.[0]?.id ?? where?.id;
      if (id === userMe.id) return Promise.resolve(userMe);
      if (id === userFriend.id) return Promise.resolve(userFriend);
      if (id === userOther.id) return Promise.resolve(userOther);
      return Promise.resolve(null);
    });

    (prisma.friendship.findFirst as any).mockResolvedValue(null);
    (prisma.friendship.findMany as any).mockResolvedValue([]);
    (prisma.group.findMany as any).mockResolvedValue([]);
    (prisma.groupMember.findMany as any).mockResolvedValue([]);
  });

  // ================= SCORING TESTS =================
  describe('Scoring Algorithms', () => {
    it('computeJaccardSimilarity computes exact overlap scores', () => {
      // Identical sets -> 1.0
      expect(
        computeJaccardSimilarity(
          new Set(['FITNESS', 'HEALTH']),
          new Set(['FITNESS', 'HEALTH'])
        )
      ).toBe(1.0);

      // Partial overlap: intersection = 1, union = 3 -> 1/3 = 0.33
      expect(
        computeJaccardSimilarity(
          new Set(['FITNESS', 'HEALTH']),
          new Set(['FITNESS', 'LEARNING'])
        )
      ).toBe(0.33);

      // Disjoint sets -> 0
      expect(
        computeJaccardSimilarity(new Set(['FITNESS']), new Set(['LEARNING']))
      ).toBe(0);

      // Empty set -> 0
      expect(computeJaccardSimilarity(new Set([]), new Set(['FITNESS']))).toBe(0);
    });

    it('getSimilarPeople ranks candidate users by Jaccard overlap score and streak', async () => {
      // My habits: FITNESS and HEALTH
      (prisma.habit.findMany as any).mockResolvedValue([
        { category: HabitCategory.FITNESS },
        { category: HabitCategory.HEALTH },
      ]);

      // No existing friends
      (prisma.friendship.findMany as any).mockResolvedValue([]);

      const candidateA = {
        id: 'user-a',
        name: 'Alice Perfect Match',
        level: 10,
        email: 'alice.private@leak.com',
        passwordHash: 'hash-leak-a',
        habits: [
          { category: HabitCategory.FITNESS, streak: { current: 15 } },
          { category: HabitCategory.HEALTH, streak: { current: 8 } },
        ],
      };

      const candidateB = {
        id: 'user-b',
        name: 'Bob Partial Match',
        level: 4,
        email: 'bob.private@leak.com',
        passwordHash: 'hash-leak-b',
        habits: [
          { category: HabitCategory.FITNESS, streak: { current: 5 } },
          { category: HabitCategory.LEARNING, streak: { current: 2 } },
          { category: HabitCategory.MINDFULNESS, streak: { current: 1 } },
        ],
      };

      (prisma.user.findMany as any).mockResolvedValue([candidateB, candidateA]);

      const similar = await getSimilarPeople(userMe.id);

      expect(similar).toHaveLength(2);
      // Alice: intersection {FITNESS, HEALTH} (2), union {FITNESS, HEALTH} (2) -> 1.0
      expect(similar[0].name).toBe('Alice Perfect Match');
      expect(similar[0].matchScore).toBe(1.0);
      expect(similar[0].currentStreak).toBe(15);
      expect(similar[0].sharedCategories).toEqual(['FITNESS', 'HEALTH']);

      // Bob: intersection {FITNESS} (1), union {FITNESS, HEALTH, LEARNING, MINDFULNESS} (4) -> 0.25
      expect(similar[1].name).toBe('Bob Partial Match');
      expect(similar[1].matchScore).toBe(0.25);
      expect(similar[1].currentStreak).toBe(5);
      expect(similar[1].sharedCategories).toEqual(['FITNESS']);
    });

    it('discoverGroups ranks HABIT groups by category overlap score and excludes joined groups', async () => {
      // User has 2 FITNESS habits and 1 MINDFULNESS habit (total 3 habits)
      (prisma.habit.findMany as any).mockResolvedValue([
        { category: HabitCategory.FITNESS },
        { category: HabitCategory.FITNESS },
        { category: HabitCategory.MINDFULNESS },
      ]);

      const groupFitness = {
        id: 'g-fit',
        name: 'Daily Runners',
        type: GroupType.HABIT,
        category: HabitCategory.FITNESS,
        _count: { members: 5 },
        createdBy: { id: userOther.id, name: userOther.name },
      };

      const groupMindfulness = {
        id: 'g-mind',
        name: 'Zen Seekers',
        type: GroupType.HABIT,
        category: HabitCategory.MINDFULNESS,
        _count: { members: 20 },
        createdBy: { id: userOther.id, name: userOther.name },
      };

      (prisma.group.findMany as any).mockResolvedValue([groupMindfulness, groupFitness]);

      const discovered = await discoverGroups(userMe.id);

      expect(discovered).toHaveLength(2);
      // FITNESS group has overlapScore 2/3 = 0.67, ranked ahead of MINDFULNESS (1/3 = 0.33)
      expect(discovered[0].id).toBe('g-fit');
      expect(discovered[0].overlapScore).toBe(0.67);
      expect(discovered[1].id).toBe('g-mind');
      expect(discovered[1].overlapScore).toBe(0.33);
    });
  });

  // ================= PERMISSION TESTS =================
  describe('Permissions: Friend Requests', () => {
    it('disallows sending a friend request to oneself', async () => {
      await expect(
        sendFriendRequest(userMe.id, { addresseeId: userMe.id })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'CANNOT_FRIEND_SELF',
      });
    });

    it('disallows duplicate pending friend requests', async () => {
      (prisma.friendship.findFirst as any).mockResolvedValue({
        id: 'f-1',
        requesterId: userMe.id,
        addresseeId: userFriend.id,
        status: FriendshipStatus.PENDING,
      });

      await expect(
        sendFriendRequest(userMe.id, { addresseeId: userFriend.id })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'REQUEST_ALREADY_SENT',
      });
    });

    it('disallows friend request if users are already friends', async () => {
      (prisma.friendship.findFirst as any).mockResolvedValue({
        id: 'f-1',
        requesterId: userMe.id,
        addresseeId: userFriend.id,
        status: FriendshipStatus.ACCEPTED,
      });

      await expect(
        sendFriendRequest(userMe.id, { addresseeId: userFriend.id })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'ALREADY_FRIENDS',
      });
    });

    it('only the addressee can accept a friend request (requester gets 404)', async () => {
      // Friendship from userMe to userFriend
      (prisma.friendship.findFirst as any).mockImplementation(({ where }: any) => {
        const matchesAddressee =
          where.addresseeId === userFriend.id ||
          where.OR?.some((cond: any) => cond.addresseeId === userFriend.id);
        if (matchesAddressee) {
          return Promise.resolve({
            id: 'friendship-1',
            requesterId: userMe.id,
            addresseeId: userFriend.id,
            status: FriendshipStatus.PENDING,
          });
        }
        return Promise.resolve(null);
      });

      // userMe (the requester) tries to accept -> fails with 404
      await expect(
        acceptFriendRequest(userMe.id, 'friendship-1')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });

      // userFriend (the addressee) accepts -> succeeds
      (prisma.friendship.update as any).mockResolvedValue({
        id: 'friendship-1',
        status: FriendshipStatus.ACCEPTED,
      });
      const accepted = await acceptFriendRequest(userFriend.id, 'friendship-1');
      expect(accepted.status).toBe(FriendshipStatus.ACCEPTED);
    });

    it('GET /api/friends returns accepted friends only', async () => {
      (prisma.friendship.findMany as any).mockResolvedValue([
        {
          id: 'f-accepted',
          requesterId: userMe.id,
          addresseeId: userFriend.id,
          status: FriendshipStatus.ACCEPTED,
          createdAt: new Date(),
          requester: userMe,
          addressee: userFriend,
        },
      ]);

      const friends = await getFriends(userMe.id);
      expect(friends).toHaveLength(1);
      expect(friends[0].friend.id).toBe(userFriend.id);
    });
  });

  describe('Permissions: Groups and Ownership Transfer', () => {
    it('creates a group with creator as OWNER', async () => {
      const createdGroup = {
        id: 'group-1',
        name: 'Fitness Fanatics',
        category: HabitCategory.FITNESS,
        type: GroupType.HABIT,
        createdById: userMe.id,
      };
      (prisma.group.create as any).mockResolvedValue(createdGroup);

      const result = await createGroup(userMe.id, {
        name: 'Fitness Fanatics',
        category: HabitCategory.FITNESS,
        type: GroupType.HABIT,
      });

      expect(result.id).toBe('group-1');
      expect(prisma.groupMember.create).toHaveBeenCalledWith({
        data: {
          groupId: 'group-1',
          userId: userMe.id,
          role: GroupRole.OWNER,
        },
      });
    });

    it('rejects duplicate group join with 409', async () => {
      (prisma.group.findUnique as any).mockResolvedValue({ id: 'group-1' });
      (prisma.groupMember.findUnique as any).mockResolvedValue({
        groupId: 'group-1',
        userId: userMe.id,
      });

      await expect(joinGroup(userMe.id, 'group-1')).rejects.toMatchObject({
        statusCode: 409,
        code: 'ALREADY_MEMBER',
      });
    });

    it('prevents group OWNER from leaving without transferring ownership', async () => {
      const groupWithMembers = {
        id: 'group-1',
        createdById: userMe.id,
        members: [
          { groupId: 'group-1', userId: userMe.id, role: GroupRole.OWNER },
          { groupId: 'group-1', userId: userFriend.id, role: GroupRole.MEMBER },
        ],
      };
      (prisma.group.findUnique as any).mockResolvedValue(groupWithMembers);

      // Owner attempts to leave without specifying newOwnerId
      await expect(leaveGroup(userMe.id, 'group-1')).rejects.toMatchObject({
        statusCode: 400,
        code: 'OWNER_CANNOT_LEAVE',
      });
    });

    it('rejects ownership transfer to a user who is not a group member', async () => {
      const groupWithMembers = {
        id: 'group-1',
        createdById: userMe.id,
        members: [
          { groupId: 'group-1', userId: userMe.id, role: GroupRole.OWNER },
          { groupId: 'group-1', userId: userFriend.id, role: GroupRole.MEMBER },
        ],
      };
      (prisma.group.findUnique as any).mockResolvedValue(groupWithMembers);

      // userOther is not in the group
      await expect(
        leaveGroup(userMe.id, 'group-1', { newOwnerId: userOther.id })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_NEW_OWNER',
      });
    });

    it('allows OWNER to leave when valid newOwnerId is provided', async () => {
      const groupWithMembers = {
        id: 'group-1',
        createdById: userMe.id,
        members: [
          { groupId: 'group-1', userId: userMe.id, role: GroupRole.OWNER },
          { groupId: 'group-1', userId: userFriend.id, role: GroupRole.MEMBER },
        ],
      };
      (prisma.group.findUnique as any).mockResolvedValue(groupWithMembers);

      const result = await leaveGroup(userMe.id, 'group-1', {
        newOwnerId: userFriend.id,
      });

      expect(result).toEqual({ success: true, transferredTo: userFriend.id });
      // Promotes userFriend to OWNER
      expect(prisma.groupMember.update).toHaveBeenCalledWith({
        where: { groupId_userId: { groupId: 'group-1', userId: userFriend.id } },
        data: { role: GroupRole.OWNER },
      });
      // Deletes leaving owner
      expect(prisma.groupMember.delete).toHaveBeenCalledWith({
        where: { groupId_userId: { groupId: 'group-1', userId: userMe.id } },
      });
    });

    it('allows a regular MEMBER to leave freely without transfer', async () => {
      const groupWithMembers = {
        id: 'group-1',
        members: [
          { groupId: 'group-1', userId: userMe.id, role: GroupRole.OWNER },
          { groupId: 'group-1', userId: userFriend.id, role: GroupRole.MEMBER },
        ],
      };
      (prisma.group.findUnique as any).mockResolvedValue(groupWithMembers);

      const result = await leaveGroup(userFriend.id, 'group-1');
      expect(result).toEqual({ success: true });
      expect(prisma.groupMember.delete).toHaveBeenCalledWith({
        where: { groupId_userId: { groupId: 'group-1', userId: userFriend.id } },
      });
    });
  });

  describe('Privacy & Exclusion in Similar People', () => {
    it('excludes myself and existing friends from similar people suggestions', async () => {
      (prisma.habit.findMany as any).mockResolvedValue([
        { category: HabitCategory.FITNESS },
      ]);

      // userFriend is already an existing friend
      (prisma.friendship.findMany as any).mockResolvedValue([
        { requesterId: userMe.id, addresseeId: userFriend.id },
      ]);

      (prisma.user.findMany as any).mockImplementation(({ where }: any) => {
        // Must exclude userMe and userFriend
        expect(where.id.notIn).toContain(userMe.id);
        expect(where.id.notIn).toContain(userFriend.id);
        return Promise.resolve([
          {
            id: userOther.id,
            name: userOther.name,
            level: userOther.level,
            habits: [{ category: HabitCategory.FITNESS, streak: { current: 3 } }],
          },
        ]);
      });

      const people = await getSimilarPeople(userMe.id);
      expect(people).toHaveLength(1);
      expect(people[0].id).toBe(userOther.id);
    });

    it('exposes ONLY name, level, current streak, shared categories and NEVER private data', async () => {
      (prisma.habit.findMany as any).mockResolvedValue([
        { category: HabitCategory.FITNESS },
      ]);
      (prisma.friendship.findMany as any).mockResolvedValue([]);

      (prisma.user.findMany as any).mockResolvedValue([
        {
          id: userOther.id,
          name: userOther.name,
          level: userOther.level,
          habits: [{ category: HabitCategory.FITNESS, streak: { current: 4 } }],
        },
      ]);

      const people = await getSimilarPeople(userMe.id);
      expect(people).toHaveLength(1);
      const person = people[0];

      // Public keys
      expect(person).toHaveProperty('id');
      expect(person).toHaveProperty('name', userOther.name);
      expect(person).toHaveProperty('level', userOther.level);
      expect(person).toHaveProperty('currentStreak', 4);
      expect(person).toHaveProperty('sharedCategories', ['FITNESS']);
      expect(person).toHaveProperty('matchScore', 1.0);

      // Private fields strictly prohibited
      expect(person).not.toHaveProperty('email');
      expect(person).not.toHaveProperty('passwordHash');
      expect(person).not.toHaveProperty('timezone');
      expect(person).not.toHaveProperty('xp');
      expect(person).not.toHaveProperty('freezesRemaining');
    });
  });

  // ================= ROUTE HANDLERS TESTS =================
  describe('Route Handlers', () => {
    it('POST /api/friends/request creates friend request', async () => {
      (prisma.friendship.create as any).mockResolvedValue({
        id: 'f-created',
        requesterId: userMe.id,
        addresseeId: userFriend.id,
        status: FriendshipStatus.PENDING,
      });

      const req = new Request('http://localhost/api/friends/request', {
        method: 'POST',
        headers: { authorization: `Bearer ${userMe.id}` },
        body: JSON.stringify({ addresseeId: userFriend.id }),
      });

      const res = await sendFriendRequestHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe('f-created');
    });

    it('POST /api/friends/:id/accept accepts friend request', async () => {
      (prisma.friendship.findFirst as any).mockResolvedValue({
        id: 'f-to-accept',
        requesterId: userFriend.id,
        addresseeId: userMe.id,
        status: FriendshipStatus.PENDING,
      });
      (prisma.friendship.update as any).mockResolvedValue({
        id: 'f-to-accept',
        status: FriendshipStatus.ACCEPTED,
      });

      const req = new Request('http://localhost/api/friends/f-to-accept/accept', {
        method: 'POST',
        headers: { authorization: `Bearer ${userMe.id}` },
      });

      const res = await acceptFriendRequestHandler(req, {
        params: { id: 'f-to-accept' },
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe(FriendshipStatus.ACCEPTED);
    });

    it('GET /api/friends returns friends list', async () => {
      (prisma.friendship.findMany as any).mockResolvedValue([]);

      const req = new Request('http://localhost/api/friends', {
        method: 'GET',
        headers: { authorization: `Bearer ${userMe.id}` },
      });

      const res = await getFriendsHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
    });

    it('POST /api/groups creates group', async () => {
      (prisma.group.create as any).mockResolvedValue({
        id: 'g-new',
        name: 'New Group',
      });

      const req = new Request('http://localhost/api/groups', {
        method: 'POST',
        headers: { authorization: `Bearer ${userMe.id}` },
        body: JSON.stringify({ name: 'New Group', type: 'HABIT' }),
      });

      const res = await createGroupHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe('g-new');
    });

    it('GET /api/groups returns user groups', async () => {
      (prisma.groupMember.findMany as any).mockResolvedValue([]);

      const req = new Request('http://localhost/api/groups', {
        method: 'GET',
        headers: { authorization: `Bearer ${userMe.id}` },
      });

      const res = await getMyGroupsHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
    });

    it('GET /api/groups/discover returns ranked groups', async () => {
      (prisma.habit.findMany as any).mockResolvedValue([]);

      const req = new Request('http://localhost/api/groups/discover', {
        method: 'GET',
        headers: { authorization: `Bearer ${userMe.id}` },
      });

      const res = await discoverGroupsHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
    });

    it('POST /api/groups/:id/join joins group', async () => {
      (prisma.group.findUnique as any).mockResolvedValue({ id: 'g-join' });
      (prisma.groupMember.findUnique as any).mockResolvedValue(null);
      (prisma.groupMember.create as any).mockResolvedValue({
        groupId: 'g-join',
        userId: userMe.id,
      });

      const req = new Request('http://localhost/api/groups/g-join/join', {
        method: 'POST',
        headers: { authorization: `Bearer ${userMe.id}` },
      });

      const res = await joinGroupHandler(req, { params: { id: 'g-join' } });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.groupId).toBe('g-join');
    });

    it('POST /api/groups/:id/leave leaves group', async () => {
      (prisma.group.findUnique as any).mockResolvedValue({
        id: 'g-leave',
        members: [{ groupId: 'g-leave', userId: userMe.id, role: GroupRole.MEMBER }],
      });

      const req = new Request('http://localhost/api/groups/g-leave/leave', {
        method: 'POST',
        headers: { authorization: `Bearer ${userMe.id}` },
      });

      const res = await leaveGroupHandler(req, { params: { id: 'g-leave' } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.success).toBe(true);
    });

    it('GET /api/groups/:id/members returns member list without private data', async () => {
      (prisma.group.findUnique as any).mockResolvedValue({
        id: 'g-members',
        members: [
          {
            user: { id: userMe.id, name: userMe.name, level: userMe.level },
            role: GroupRole.OWNER,
            joinedAt: new Date(),
          },
        ],
      });

      const req = new Request('http://localhost/api/groups/g-members/members', {
        method: 'GET',
        headers: { authorization: `Bearer ${userMe.id}` },
      });

      const res = await getGroupMembersHandler(req, { params: { id: 'g-members' } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.members).toHaveLength(1);
      expect(json.data.members[0].user.name).toBe(userMe.name);
      expect(json.data.members[0].user).not.toHaveProperty('email');
    });

    it('GET /api/people/similar returns matching users', async () => {
      (prisma.habit.findMany as any).mockResolvedValue([]);

      const req = new Request('http://localhost/api/people/similar', {
        method: 'GET',
        headers: { authorization: `Bearer ${userMe.id}` },
      });

      const res = await getSimilarPeopleHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
    });
  });
});
