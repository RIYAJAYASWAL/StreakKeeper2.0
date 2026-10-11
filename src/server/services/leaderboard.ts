import { z } from 'zod';
import { prisma } from '@/server/lib/prisma';

export const leaderboardQuerySchema = z.object({
  scope: z.enum(['global', 'friends']).default('global'),
  period: z.enum(['all', 'month']).default('all'),
  cursor: z.string().optional(),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .default('20')
    .transform((val) => Number(val))
    .refine((n) => Number.isInteger(n) && n >= 1 && n <= 100, {
      message: 'limit must be between 1 and 100',
    }),
});

export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;

export interface LeaderboardEntry {
  userId: string;
  name: string | null;
  xp: number;
  level: number;
  image: string | null;
  currentStreak: number;
  longestStreak: number;
  rank: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  myRank: LeaderboardEntry | null;
  nextCursor: string | null;
  scope: 'global' | 'friends';
  period: 'all' | 'month';
}

export async function getLeaderboard(
  userId: string,
  query: LeaderboardQuery
): Promise<LeaderboardResponse> {
  const scope = query.scope;
  const period = query.period;
  const limit = query.limit;
  const cursorRank = query.cursor ? Number(query.cursor) : null;

  // SQL query with window function DENSE_RANK() and proper indexes
  const allRanked = await prisma.$queryRaw<LeaderboardEntry[]>`
    WITH user_universe AS (
      SELECT u.id, u.name, u.xp, u.level, u.image
      FROM "User" u
      WHERE (
        ${scope}::text = 'global'
        OR u.id = ${userId}::text
        OR u.id IN (
          SELECT f."addresseeId" FROM "Friendship" f WHERE f."requesterId" = ${userId}::text AND f.status = 'ACCEPTED'
          UNION
          SELECT f."requesterId" FROM "Friendship" f WHERE f."addresseeId" = ${userId}::text AND f.status = 'ACCEPTED'
        )
      )
    ),
    user_best_streaks AS (
      SELECT
        u.id AS "userId",
        u.name,
        u.xp,
        u.level,
        u.image,
        COALESCE(MAX(CASE WHEN s.current IS NOT NULL THEN s.current ELSE 0 END), 0)::int AS "currentStreak",
        COALESCE(MAX(CASE WHEN s.longest IS NOT NULL THEN s.longest ELSE 0 END), 0)::int AS "longestStreak"
      FROM user_universe u
      LEFT JOIN "Habit" h ON h."userId" = u.id AND h."archivedAt" IS NULL
      LEFT JOIN "Streak" s ON s."habitId" = h.id
        AND (
          ${period}::text = 'all'
          OR (
            s."lastCountedDate" IS NOT NULL
            AND s."lastCountedDate" >= DATE_TRUNC('month', CURRENT_TIMESTAMP)
          )
        )
      GROUP BY u.id, u.name, u.xp, u.level, u.image
    ),
    ranked_users AS (
      SELECT
        "userId",
        name,
        xp,
        level,
        image,
        "currentStreak",
        "longestStreak",
        DENSE_RANK() OVER (
          ORDER BY "currentStreak" DESC, "longestStreak" DESC, xp DESC
        )::int AS rank
      FROM user_best_streaks
    )
    SELECT * FROM ranked_users
    ORDER BY rank ASC, "userId" ASC;
  `;

  // Find authenticated user's rank from the window function results
  const myRank = allRanked.find((entry) => entry.userId === userId) ?? null;

  // Apply cursor pagination
  let items = allRanked;
  if (cursorRank !== null && !isNaN(cursorRank)) {
    items = items.filter((entry) => entry.rank > cursorRank);
  }

  const entries = items.slice(0, limit);
  const nextCursor = items.length > limit ? String(entries[entries.length - 1].rank) : null;

  return {
    entries,
    myRank,
    nextCursor,
    scope,
    period,
  };
}
