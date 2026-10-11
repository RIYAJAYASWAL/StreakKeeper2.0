import { FriendshipStatus, GroupRole, GroupType, HabitCategory } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/server/lib/prisma';
import { BadRequestError, ConflictError, NotFoundError } from '@/server/lib/api';

export const friendRequestSchema = z
  .object({
    addresseeId: z.string().optional(),
    friendId: z.string().optional(),
    email: z.string().email().optional(),
  })
  .refine((data) => data.addresseeId || data.friendId || data.email, {
    message: 'addresseeId, friendId, or email must be provided',
  });

export const createGroupSchema = z
  .object({
    name: z.string().trim().min(1, 'Group name is required').max(100),
    description: z.string().trim().max(500).optional().nullable(),
    category: z.nativeEnum(HabitCategory).optional().nullable(),
    type: z.nativeEnum(GroupType).default(GroupType.HABIT),
  })
  .strict();

export const leaveGroupSchema = z.object({
  newOwnerId: z.string().optional(),
});

export type FriendRequestInput = z.infer<typeof friendRequestSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type LeaveGroupInput = z.infer<typeof leaveGroupSchema>;

export function computeJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionSize++;
    }
  }
  const unionSize = setA.size + setB.size - intersectionSize;
  if (unionSize === 0) return 0;
  return Math.round((intersectionSize / unionSize) * 100) / 100;
}

// ================= FRIENDS =================

export async function sendFriendRequest(requesterId: string, input: FriendRequestInput) {
  let targetId = input.addresseeId ?? input.friendId;

  if (!targetId && input.email) {
    const targetUser = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (!targetUser) {
      throw new NotFoundError('User not found', 'NOT_FOUND');
    }
    targetId = targetUser.id;
  }

  if (!targetId) {
    throw new BadRequestError('Addressee ID is required', 'VALIDATION_ERROR');
  }

  if (targetId === requesterId) {
    throw new BadRequestError('You cannot send a friend request to yourself', 'CANNOT_FRIEND_SELF');
  }

  const addressee = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true },
  });
  if (!addressee) {
    throw new NotFoundError('User not found', 'NOT_FOUND');
  }

  // Check if friendship already exists in either direction
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId: targetId },
        { requesterId: targetId, addresseeId: requesterId },
      ],
    },
  });

  if (existing) {
    if (existing.status === FriendshipStatus.ACCEPTED) {
      throw new ConflictError('You are already friends with this user', 'ALREADY_FRIENDS');
    }
    if (existing.requesterId === requesterId) {
      throw new ConflictError('Friend request already sent', 'REQUEST_ALREADY_SENT');
    }
    // If incoming request is pending from targetId to requesterId, auto-accept it!
    const updated = await prisma.friendship.update({
      where: { id: existing.id },
      data: { status: FriendshipStatus.ACCEPTED },
      include: {
        requester: { select: { id: true, name: true, level: true } },
        addressee: { select: { id: true, name: true, level: true } },
      },
    });
    return updated;
  }

  return prisma.friendship.create({
    data: {
      requesterId,
      addresseeId: targetId,
      status: FriendshipStatus.PENDING,
    },
    include: {
      requester: { select: { id: true, name: true, level: true } },
      addressee: { select: { id: true, name: true, level: true } },
    },
  });
}

export async function acceptFriendRequest(userId: string, friendshipIdOrRequesterId: string) {
  // Find friendship where user is the addressee
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { id: friendshipIdOrRequesterId, addresseeId: userId },
        { requesterId: friendshipIdOrRequesterId, addresseeId: userId },
      ],
    },
  });

  if (!friendship) {
    throw new NotFoundError('Friend request not found', 'NOT_FOUND');
  }

  if (friendship.status === FriendshipStatus.ACCEPTED) {
    return friendship;
  }

  return prisma.friendship.update({
    where: { id: friendship.id },
    data: { status: FriendshipStatus.ACCEPTED },
    include: {
      requester: { select: { id: true, name: true, level: true } },
      addressee: { select: { id: true, name: true, level: true } },
    },
  });
}

export async function getFriends(userId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: userId }, { addresseeId: userId }],
      status: FriendshipStatus.ACCEPTED,
    },
    include: {
      requester: { select: { id: true, name: true, level: true } },
      addressee: { select: { id: true, name: true, level: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return friendships.map((f) => {
    const friend = f.requesterId === userId ? f.addressee : f.requester;
    return {
      friendshipId: f.id,
      friend,
      createdAt: f.createdAt,
    };
  });
}

// ================= GROUPS =================

export async function createGroup(userId: string, input: CreateGroupInput) {
  return prisma.$transaction(async (tx) => {
    const group = await tx.group.create({
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        type: input.type,
        createdById: userId,
      },
    });

    await tx.groupMember.create({
      data: {
        groupId: group.id,
        userId,
        role: GroupRole.OWNER,
      },
    });

    return group;
  });
}

export async function getMyGroups(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          _count: { select: { members: true } },
          createdBy: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  return memberships.map((m) => ({
    ...m.group,
    myRole: m.role,
    joinedAt: m.joinedAt,
    memberCount: m.group._count.members,
  }));
}

export async function discoverGroups(userId: string) {
  // Find categories of user's active habits
  const userHabits = await prisma.habit.findMany({
    where: { userId, archivedAt: null },
    select: { category: true },
  });

  const myCategories = new Set(userHabits.map((h) => h.category));
  if (myCategories.size === 0) {
    return [];
  }

  // Count user habits per category for weighted ranking
  const categoryCountMap = new Map<HabitCategory, number>();
  for (const h of userHabits) {
    categoryCountMap.set(h.category, (categoryCountMap.get(h.category) ?? 0) + 1);
  }

  // Only HABIT groups matching user's categories, excluding groups user already joined
  const eligibleGroups = await prisma.group.findMany({
    where: {
      type: GroupType.HABIT,
      category: { in: Array.from(myCategories) },
      members: { none: { userId } },
    },
    include: {
      _count: { select: { members: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  // Rank by category overlap and member count
  const ranked = eligibleGroups.map((group) => {
    const habitCountInCat = group.category ? (categoryCountMap.get(group.category) ?? 1) : 1;
    const overlapScore = habitCountInCat / userHabits.length;
    return {
      ...group,
      memberCount: group._count.members,
      overlapScore: Math.round(overlapScore * 100) / 100,
    };
  });

  ranked.sort((a, b) => {
    if (b.overlapScore !== a.overlapScore) return b.overlapScore - a.overlapScore;
    return b.memberCount - a.memberCount;
  });

  return ranked;
}

export async function joinGroup(userId: string, groupId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new NotFoundError('Group not found', 'NOT_FOUND');
  }

  const existingMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (existingMember) {
    throw new ConflictError('You are already a member of this group', 'ALREADY_MEMBER');
  }

  return prisma.groupMember.create({
    data: {
      groupId,
      userId,
      role: GroupRole.MEMBER,
    },
    include: {
      group: true,
    },
  });
}

export async function leaveGroup(userId: string, groupId: string, input?: LeaveGroupInput) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });
  if (!group) {
    throw new NotFoundError('Group not found', 'NOT_FOUND');
  }

  const member = group.members.find((m) => m.userId === userId);
  if (!member) {
    throw new BadRequestError('You are not a member of this group', 'NOT_A_MEMBER');
  }

  // Owners cannot leave without transferring ownership when other members exist
  if (member.role === GroupRole.OWNER) {
    const otherMembers = group.members.filter((m) => m.userId !== userId);
    if (otherMembers.length > 0) {
      if (!input?.newOwnerId) {
        throw new BadRequestError(
          'Owners cannot leave without transferring ownership',
          'OWNER_CANNOT_LEAVE'
        );
      }

      const targetMember = otherMembers.find((m) => m.userId === input.newOwnerId);
      if (!targetMember) {
        throw new BadRequestError(
          'New owner must be an existing member of the group',
          'INVALID_NEW_OWNER'
        );
      }

      return prisma.$transaction(async (tx) => {
        await tx.groupMember.update({
          where: { groupId_userId: { groupId, userId: input.newOwnerId! } },
          data: { role: GroupRole.OWNER },
        });

        await tx.group.update({
          where: { id: groupId },
          data: { createdById: input.newOwnerId! },
        });

        await tx.groupMember.delete({
          where: { groupId_userId: { groupId, userId } },
        });

        return { success: true, transferredTo: input.newOwnerId };
      });
    }
  }

  // Regular member or sole owner leaving
  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId } },
  });

  return { success: true };
}

export async function getGroupMembers(userId: string, groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              level: true,
              image: true,
            },
          },
        },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      },
    },
  });

  if (!group) {
    throw new NotFoundError('Group not found', 'NOT_FOUND');
  }

  return group.members.map((m) => ({
    user: m.user,
    role: m.role,
    joinedAt: m.joinedAt,
  }));
}

// ================= SIMILAR PEOPLE =================

export async function getSimilarPeople(userId: string) {
  // 1. Get user's own active habit categories
  const myHabits = await prisma.habit.findMany({
    where: { userId, archivedAt: null },
    select: { category: true },
  });

  const myCategories = new Set(myHabits.map((h) => h.category));
  if (myCategories.size === 0) {
    return [];
  }

  // 2. Exclude myself and existing friends (ACCEPTED or PENDING)
  const existingFriendships = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });

  const excludedUserIds = new Set<string>();
  excludedUserIds.add(userId);
  for (const f of existingFriendships) {
    excludedUserIds.add(f.requesterId === userId ? f.addresseeId : f.requesterId);
  }

  // 3. Find candidate users who share at least one category
  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: Array.from(excludedUserIds) },
      habits: {
        some: {
          archivedAt: null,
          category: { in: Array.from(myCategories) },
        },
      },
    },
    select: {
      id: true,
      name: true,
      level: true,
      habits: {
        where: { archivedAt: null },
        select: {
          category: true,
          streak: { select: { current: true } },
        },
      },
    },
  });

  // 4. Calculate Jaccard similarity and extract max current streak
  const results = candidates.map((candidate) => {
    const candidateCategories = new Set(candidate.habits.map((h) => h.category));
    const score = computeJaccardSimilarity(myCategories, candidateCategories);

    const sharedCategories = Array.from(candidateCategories).filter((c) => myCategories.has(c));

    const maxStreak = candidate.habits.reduce((max, h) => {
      const current = h.streak?.current ?? 0;
      return current > max ? current : max;
    }, 0);

    return {
      id: candidate.id,
      name: candidate.name,
      level: candidate.level,
      currentStreak: maxStreak,
      sharedCategories,
      matchScore: score,
    };
  });

  // 5. Rank descending by match score, then by current streak
  results.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return b.currentStreak - a.currentStreak;
  });

  return results;
}
