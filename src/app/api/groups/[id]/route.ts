import { ok, NotFoundError, withAuth } from '@/server/lib/api';
import { prisma } from '@/server/lib/prisma';

export const GET = withAuth<{ params: { id: string } }>(async (_req, { userId, params }) => {
  const id = params.id;
  if (!id) {
    throw new NotFoundError('Group not found', 'NOT_FOUND');
  }

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      _count: { select: { members: true } },
      createdBy: { select: { id: true, name: true } },
      members: {
        include: {
          user: {
            select: { id: true, name: true, level: true, image: true },
          },
        },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      },
    },
  });

  if (!group) {
    throw new NotFoundError('Group not found', 'NOT_FOUND');
  }

  const isMember = group.members.some((m) => m.userId === userId);
  const myMembership = group.members.find((m) => m.userId === userId);

  return ok({
    ...group,
    memberCount: group._count.members,
    isMember,
    myRole: myMembership?.role ?? null,
  });
});
