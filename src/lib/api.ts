/**
 * Typed client for StreakKeeper API routes.
 * Automatically unwraps { data } and transforms { error } into ApiClientError.
 */

export class ApiClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public raw?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  let json: ApiResponse<T> | null = null;
  try {
    json = await response.json();
  } catch {
    // Empty or non-JSON body
  }

  if (!response.ok || json?.error) {
    const code = json?.error?.code ?? `HTTP_${response.status}`;
    const message = json?.error?.message ?? response.statusText ?? 'An unexpected error occurred';
    throw new ApiClientError(message, code, response.status, json);
  }

  return (json?.data as T) ?? ({} as T);
}

// ----------------- Data Models -----------------
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
  xp: number;
  level: number;
  freezesRemaining: number;
  image?: string | null;
  createdAt: string;
}

export type HabitCategory =
  | 'HEALTH'
  | 'FITNESS'
  | 'LEARNING'
  | 'MINDFULNESS'
  | 'PRODUCTIVITY'
  | 'QUIT_BAD_HABIT'
  | 'OTHER';

export type FrequencyType = 'DAILY' | 'WEEKLY' | 'CUSTOM';

export interface HabitStreak {
  current: number;
  longest: number;
  lastCountedDate: string | null;
}

export interface HabitItem {
  id: string;
  userId: string;
  name: string;
  category: HabitCategory;
  description?: string | null;
  frequencyType: FrequencyType;
  targetPerPeriod?: number | null;
  daysOfWeek: number[];
  intervalDays?: number | null;
  startDate: string;
  createdAt: string;
  streak?: HabitStreak | null;
}

export interface CheckInItem {
  id: string;
  habitId: string;
  userId: string;
  localDate: string;
  status: 'COMPLETED' | 'FROZEN' | 'MISSED';
  note?: string | null;
  createdAt: string;
}

export interface FreezeStatus {
  freezesRemaining: number;
  freezesResetAt?: string;
  nextResetDate: string;
  habits?: Array<{
    habitId: string;
    restorableDays: string[];
  }>;
  restorable?: Array<{
    habitId: string;
    habitName: string;
    missedLocalDate: string;
  }>;
}

export interface JournalItem {
  id: string;
  authorId: string;
  habitId?: string | null;
  category: HabitCategory;
  title: string;
  body: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  createdAt: string;
  author?: {
    id: string;
    name: string | null;
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  currentStreak: number;
  longestStreak: number;
  xp: number;
  level: number;
  image?: string | null;
}

export interface TriggerPoint {
  key: string;
  label: string;
  percentage: number;
  count: number;
}

export interface HeatmapDay {
  date: string;
  status: 'COMPLETED' | 'FROZEN' | 'MISSED' | 'NONE';
  dayOfWeek?: number;
  count?: number;
  freezeReason?: string;
  freezeNote?: string;
  note?: string;
}

export interface AiInsightResponse {
  id?: string;
  content: string;
  createdAt?: string;
  cached?: boolean;
  remainingGenerations?: number;
}

// ----------------- Typed API Client -----------------
export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ user: UserProfile }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (data: { email: string; password: string; name: string; timezone: string }) =>
      request<{ user: UserProfile }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // User Profile
  me: {
    get: () => request<{ user: UserProfile }>('/api/me'),
    update: (data: { name?: string; timezone?: string }) =>
      request<{ user: UserProfile }>('/api/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    addXp: (data: { amount: number; habitId?: string; action?: string }) =>
      request<{ awarded: boolean; xp: number; level: number }>('/api/me/xp', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Habits
  habits: {
    list: () => request<{ habits: HabitItem[] }>('/api/habits'),
    create: (data: {
      name: string;
      category: HabitCategory;
      description?: string;
      frequencyType?: FrequencyType;
      targetPerPeriod?: number;
      daysOfWeek?: number[];
      intervalDays?: number;
      startDate?: string;
    }) =>
      request<{ habit: HabitItem }>('/api/habits', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id: string) => request<{ habit: HabitItem }>(`/api/habits/${id}`),
    update: (id: string, data: Partial<HabitItem>) =>
      request<{ habit: HabitItem }>(`/api/habits/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/habits/${id}`, {
        method: 'DELETE',
      }),
    archive: (id: string) =>
      request<{ habit: HabitItem }>(`/api/habits/${id}`, {
        method: 'DELETE',
      }),
  },

  // Check-ins
  checkins: {
    create: (habitId: string, data?: { note?: string }) =>
      request<{ checkIn: CheckInItem; streak: HabitStreak }>(`/api/habits/${habitId}/checkins`, {
        method: 'POST',
        body: JSON.stringify(data ?? {}),
      }),
    list: (habitId: string, params: { from: string; to: string }) =>
      request<{ checkIns: CheckInItem[] }>(
        `/api/habits/${habitId}/checkins?from=${params.from}&to=${params.to}`
      ),
  },

  // Freezes
  freezes: {
    apply: (
      habitId: string,
      data: {
        localDate: string;
        reasonTag: 'SICK' | 'TRAVEL' | 'WORK' | 'POOR_SLEEP' | 'FORGOT' | 'STRESS' | 'OTHER';
        note: string;
      }
    ) =>
      request<{ freezeUse: any; freezesRemaining: number; streak: HabitStreak }>(
        `/api/habits/${habitId}/freeze`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      ),
    status: () => request<FreezeStatus>('/api/freezes/status'),
  },

  // Journals
  journals: {
    listMine: () => request<{ journals: JournalItem[] }>('/api/journals/mine'),
    feed: (params?: { cursor?: string; limit?: number }) => {
      const search = new URLSearchParams();
      if (params?.cursor) search.set('cursor', params.cursor);
      if (params?.limit) search.set('limit', String(params.limit));
      const qs = search.toString() ? `?${search.toString()}` : '';
      return request<{ journals: JournalItem[]; nextCursor: string | null }>(`/api/journals/feed${qs}`);
    },
    get: (id: string) => request<{ journal: JournalItem }>(`/api/journals/${id}`),
    create: (data: {
      title: string;
      body: string;
      habitId?: string;
      visibility?: 'PUBLIC' | 'PRIVATE';
    }) =>
      request<{ journal: JournalItem }>('/api/journals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { title?: string; body?: string; visibility?: 'PUBLIC' | 'PRIVATE' }) =>
      request<{ journal: JournalItem }>(`/api/journals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/journals/${id}`, {
        method: 'DELETE',
      }),
    read: (id: string) => request<{ success: boolean }>(`/api/journals/${id}/read`, { method: 'POST' }),
    readStatus: () => request<{ readToday: boolean }>('/api/journals/read-status'),
  },

  // Social & Groups
  social: {
    getFriends: () => request<{ friends: any[]; incomingRequests: any[] }>('/api/friends'),
    sendFriendRequest: (targetUserId: string) =>
      request<{ friendship: any }>('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ addresseeId: targetUserId }),
      }),
    acceptFriendRequest: (id: string) =>
      request<{ friendship: any }>(`/api/friends/${id}/accept`, {
        method: 'POST',
      }),
    getSimilarPeople: () => request<{ similar: any[] }>('/api/people/similar'),
  },

  groups: {
    listMine: () => request<{ groups: any[] }>('/api/groups'),
    discover: () => request<{ groups: any[] }>('/api/groups/discover'),
    get: (id: string) => request<any>(`/api/groups/${id}`),
    create: (data: { name: string; type: 'FRIENDS' | 'HABIT'; category?: HabitCategory; description?: string }) =>
      request<{ group: any }>('/api/groups', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    join: (id: string) => request<{ membership: any }>(`/api/groups/${id}/join`, { method: 'POST' }),
    leave: (id: string) => request<{ success: boolean }>(`/api/groups/${id}/leave`, { method: 'POST' }),
    members: (id: string) => request<{ members: any[] }>(`/api/groups/${id}/members`),
  },

  // Leaderboard
  leaderboard: {
    get: (params?: { scope?: 'global' | 'friends'; period?: 'all' | 'month'; limit?: number; cursor?: string }) => {
      const sp = new URLSearchParams();
      if (params?.scope) sp.set('scope', params.scope);
      if (params?.period) sp.set('period', params.period);
      if (params?.limit) sp.set('limit', String(params.limit));
      if (params?.cursor) sp.set('cursor', params.cursor);
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return request<{ leaderboard: LeaderboardEntry[]; myRank: number | null; nextCursor: string | null }>(
        `/api/leaderboard${qs}`
      );
    },
  },

  // Analytics
  analytics: {
    getTriggers: (params?: { habitId?: string; range?: '7d' | '30d' | '90d' }) => {
      const sp = new URLSearchParams();
      if (params?.habitId) sp.set('habitId', params.habitId);
      if (params?.range) sp.set('range', params.range);
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return request<{
        triggers: TriggerPoint[];
        completionRate: number;
        weeklySeries: Array<{ weekStart: string; rate: number }>;
      }>(`/api/analytics/triggers${qs}`);
    },
    getHeatmap: (weeks = 14, habitId?: string) => {
      const sp = new URLSearchParams();
      sp.set('weeks', String(weeks));
      if (habitId) sp.set('habitId', habitId);
      return request<{ timezone: string; weeks: number; from: string; to: string; days: HeatmapDay[] }>(
        `/api/analytics/heatmap?${sp.toString()}`
      );
    },
  },

  // AI Assistant
  ai: {
    getLatest: async () => {
      const res = await request<any>('/api/ai/insights');
      if (res && res.insight !== undefined) return res as { insight: AiInsightResponse | null };
      return { insight: (res?.content ? res : null) as AiInsightResponse | null };
    },
    generate: async () => {
      const res = await request<any>('/api/ai/insights', { method: 'POST' });
      if (res && res.insight !== undefined) return res as { insight: AiInsightResponse };
      return { insight: res as AiInsightResponse };
    },
  },

  // Health
  health: {
    check: () => request<{ status: string; uptime: number; database: { status: string } }>('/api/health'),
  },
};
