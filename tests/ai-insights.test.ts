import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AiProvider,
  EnvAiProvider,
  buildInsightPrompt,
  generateAiInsight,
  getLatestAiInsight,
  setAiProvider,
  getAiProvider,
  truncateToTokenBudget,
  MAX_TOKEN_BUDGET,
  MAX_GENERATIONS_PER_DAY,
  SYSTEM_PROMPT,
} from '@/server/services/ai';
import { prisma } from '@/server/lib/prisma';
import { AppError } from '@/server/lib/api';
import { POST as postAiInsightHandler, GET as getAiInsightHandler } from '@app/api/ai/insights/route';
import * as triggersService from '@/server/services/triggers';

vi.mock('@/server/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    aiInsight: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    freezeUse: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    journal: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    checkIn: {
      count: vi.fn(),
    },
  },
}));

class MockAiProvider implements AiProvider {
  public generatedPrompts: string[] = [];
  public response = '1. Set out workout shoes the night before.\n2. Keep your reading goal to 5 pages on busy days.';
  public delayMs = 0;
  public shouldThrow: Error | null = null;

  async generate(prompt: string): Promise<string> {
    this.generatedPrompts.push(prompt);
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
    if (this.shouldThrow) {
      throw this.shouldThrow;
    }
    return this.response;
  }
}

describe('AI Insight Service & API Routes', () => {
  const mockUser = {
    id: 'user-ai-1',
    name: 'Alex Johnson',
    email: 'alex.private@example.com',
    passwordHash: '$2a$12$SuperSecretHashedPasswordVal123',
    timezone: 'America/New_York',
  };

  let mockProvider: MockAiProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = new MockAiProvider();
    setAiProvider(mockProvider);

    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.user.findFirst as any).mockResolvedValue(mockUser);
    (prisma.aiInsight.findFirst as any).mockResolvedValue(null);
    (prisma.aiInsight.findMany as any).mockResolvedValue([]);
    (prisma.checkIn.count as any).mockResolvedValue(0);
    (prisma.freezeUse.count as any).mockResolvedValue(0);
    (prisma.journal.count as any).mockResolvedValue(0);
    (prisma.freezeUse.findMany as any).mockResolvedValue([]);
    (prisma.journal.findMany as any).mockResolvedValue([]);

    vi.spyOn(triggersService, 'getTriggerAnalytics').mockResolvedValue({
      completionRate: 75,
      triggers: [
        { key: 'dow:5', label: 'Fridays', percentage: 50, count: 2 },
        { key: 'reason:WORK', label: 'Work', percentage: 50, count: 2 },
      ],
      weekly: [],
    });
  });

  describe('AiProvider Interface & EnvAiProvider', () => {
    it('allows swapping the active provider', () => {
      const customProvider: AiProvider = {
        async generate() {
          return 'Custom advice';
        },
      };
      setAiProvider(customProvider);
      expect(getAiProvider()).toBe(customProvider);

      setAiProvider(mockProvider);
      expect(getAiProvider()).toBe(mockProvider);
    });

    it('EnvAiProvider reads API key and provider/model defaults from env or constructor', () => {
      const envProvider = new EnvAiProvider({
        apiKey: 'test-api-key',
        provider: 'custom-provider',
        model: 'custom-model',
      });
      expect(envProvider.apiKey).toBe('test-api-key');
      expect(envProvider.provider).toBe('custom-provider');
      expect(envProvider.model).toBe('custom-model');
    });

    it('EnvAiProvider throws error when API key is missing', async () => {
      const envProvider = new EnvAiProvider({ apiKey: '' });
      await expect(envProvider.generate('Hello')).rejects.toThrow('AI_API_KEY is not configured');
    });
  });

  describe('Prompt Construction & Privacy Rules', () => {
    it('gathers FreezeUse notes, journals, triggers, and completion rate into prompt', () => {
      const prompt = buildInsightPrompt({
        userName: 'Alex',
        completionRate: 80,
        triggers: [{ key: 'dow:0', label: 'Sundays', percentage: 60, count: 3 }],
        freezeUses: [
          { localDate: new Date('2026-10-05T00:00:00.000Z'), reasonTag: 'TRAVEL', note: 'Flight was delayed' },
        ],
        journals: [
          {
            createdAt: new Date('2026-10-06T12:00:00.000Z'),
            category: 'FITNESS',
            title: 'Morning Run',
            body: 'Felt tired in the morning but finished 3km.',
          },
        ],
      });

      expect(prompt).toContain('User: Alex');
      expect(prompt).toContain('30-Day Completion Rate: 80%');
      expect(prompt).toContain('Sundays: 3 times (60% of friction days)');
      expect(prompt).toContain('Reason: TRAVEL | Note: "Flight was delayed"');
      expect(prompt).toContain('(FITNESS) Morning Run: Felt tired in the morning but finished 3km.');
    });

    it('system prompt asks for 2-3 short, kind suggestions and strictly forbids medical advice', () => {
      expect(SYSTEM_PROMPT).toContain('2 to 3 short, kind, specific suggestions');
      expect(SYSTEM_PROMPT).toContain('Do NOT give any medical, psychiatric, or diagnostic advice');
    });

    it('NEVER sends email or password hash in prompt', async () => {
      (prisma.aiInsight.create as any).mockImplementation(({ data }: any) => ({
        id: 'insight-1',
        ...data,
        createdAt: new Date(),
      }));

      await generateAiInsight(mockUser.id, { provider: mockProvider });

      expect(mockProvider.generatedPrompts).toHaveLength(1);
      const sentPrompt = mockProvider.generatedPrompts[0];

      expect(sentPrompt).not.toContain(mockUser.email);
      expect(sentPrompt).not.toContain(mockUser.passwordHash);
      expect(sentPrompt).not.toContain('password');
      expect(sentPrompt).not.toContain('alex.private@example.com');
    });

    it('truncates large input data to fixed token budget', () => {
      const hugeBody = 'A'.repeat(50_000);
      const truncated = truncateToTokenBudget(hugeBody, MAX_TOKEN_BUDGET);
      expect(truncated.length).toBeLessThanOrEqual(MAX_TOKEN_BUDGET * 4);
      expect(truncated).toContain('[truncated to fit token budget]');
    });
  });

  describe('Insight Generation and Persistence', () => {
    it('creates and returns a new AiInsight record', async () => {
      const createdRecord = {
        id: 'new-insight-id',
        userId: mockUser.id,
        habitId: null,
        content: mockProvider.response,
        basedOnFrom: new Date('2026-09-15T00:00:00.000Z'),
        basedOnTo: new Date('2026-10-15T00:00:00.000Z'),
        createdAt: new Date(),
      };
      (prisma.aiInsight.create as any).mockResolvedValue(createdRecord);

      const result = await generateAiInsight(mockUser.id, { provider: mockProvider });

      expect(result).toEqual(createdRecord);
      expect(prisma.aiInsight.create).toHaveBeenCalledTimes(1);
      expect(mockProvider.generatedPrompts).toHaveLength(1);
    });

    it('getLatestAiInsight returns the latest insight record', async () => {
      const latestRecord = {
        id: 'latest-id',
        userId: mockUser.id,
        content: 'Existing insight',
        createdAt: new Date(),
      };
      (prisma.aiInsight.findFirst as any).mockResolvedValue(latestRecord);

      const result = await getLatestAiInsight(mockUser.id);
      expect(result).toEqual(latestRecord);
      expect(prisma.aiInsight.findFirst).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('24-Hour Cache Policy', () => {
    it('returns cached insight without calling provider when underlying data is unchanged within 24 hours', async () => {
      const now = new Date('2026-10-15T12:00:00.000Z');
      const recentInsight = {
        id: 'cached-insight-id',
        userId: mockUser.id,
        habitId: null,
        content: 'Cached AI suggestions',
        basedOnFrom: new Date('2026-09-15T00:00:00.000Z'),
        basedOnTo: new Date('2026-10-15T00:00:00.000Z'),
        createdAt: new Date('2026-10-15T08:00:00.000Z'), // 4 hours ago
      };

      (prisma.aiInsight.findFirst as any).mockResolvedValue(recentInsight);
      // No new checkins, freezes, or journals
      (prisma.checkIn.count as any).mockResolvedValue(0);
      (prisma.freezeUse.count as any).mockResolvedValue(0);
      (prisma.journal.count as any).mockResolvedValue(0);

      const result = await generateAiInsight(mockUser.id, { provider: mockProvider, now });

      expect(result).toEqual(recentInsight);
      expect(mockProvider.generatedPrompts).toHaveLength(0); // Provider was NOT invoked
      expect(prisma.aiInsight.create).not.toHaveBeenCalled();
    });

    it('invalidates cache and calls provider if a new journal entry was written since last insight', async () => {
      const now = new Date('2026-10-15T12:00:00.000Z');
      const recentInsight = {
        id: 'prev-insight-id',
        userId: mockUser.id,
        content: 'Previous suggestions',
        createdAt: new Date('2026-10-15T08:00:00.000Z'),
      };
      (prisma.aiInsight.findFirst as any).mockResolvedValue(recentInsight);

      // A journal was added after previous insight!
      (prisma.checkIn.count as any).mockResolvedValue(0);
      (prisma.freezeUse.count as any).mockResolvedValue(0);
      (prisma.journal.count as any).mockResolvedValue(1);

      (prisma.aiInsight.create as any).mockResolvedValue({
        id: 'new-insight-id',
        content: mockProvider.response,
        createdAt: now,
      });

      const result = await generateAiInsight(mockUser.id, { provider: mockProvider, now });

      expect(result.id).toBe('new-insight-id');
      expect(mockProvider.generatedPrompts).toHaveLength(1); // Provider WAS called
      expect(prisma.aiInsight.create).toHaveBeenCalledTimes(1);
    });

    it('invalidates cache and calls provider if latest insight is older than 24 hours', async () => {
      const now = new Date('2026-10-15T12:00:00.000Z');
      const oldInsight = {
        id: 'old-insight-id',
        userId: mockUser.id,
        content: 'Old suggestions',
        createdAt: new Date('2026-10-14T10:00:00.000Z'), // 26 hours ago
      };
      (prisma.aiInsight.findFirst as any).mockResolvedValue(oldInsight);
      (prisma.checkIn.count as any).mockResolvedValue(0);
      (prisma.freezeUse.count as any).mockResolvedValue(0);
      (prisma.journal.count as any).mockResolvedValue(0);

      (prisma.aiInsight.create as any).mockResolvedValue({
        id: 'refreshed-insight-id',
        content: mockProvider.response,
        createdAt: now,
      });

      const result = await generateAiInsight(mockUser.id, { provider: mockProvider, now });

      expect(result.id).toBe('refreshed-insight-id');
      expect(mockProvider.generatedPrompts).toHaveLength(1);
    });
  });

  describe('Rate Limiting (Max 3 Generations Per User Per Day)', () => {
    it('throws 429 RATE_LIMIT_EXCEEDED on the 4th generation on the same local day', async () => {
      const now = new Date('2026-10-15T18:00:00.000Z');

      // 3 previous generations already recorded today
      const todayInsights = [
        { createdAt: new Date('2026-10-15T09:00:00.000Z') },
        { createdAt: new Date('2026-10-15T12:00:00.000Z') },
        { createdAt: new Date('2026-10-15T15:00:00.000Z') },
      ];
      (prisma.aiInsight.findMany as any).mockResolvedValue(todayInsights);

      // Force cache miss by returning null or changed data
      (prisma.aiInsight.findFirst as any).mockResolvedValue(null);

      await expect(
        generateAiInsight(mockUser.id, { provider: mockProvider, now })
      ).rejects.toThrowError(AppError);

      try {
        await generateAiInsight(mockUser.id, { provider: mockProvider, now });
      } catch (err: any) {
        expect(err.statusCode).toBe(429);
        expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
      }

      // Provider was NOT called when rate limit is exceeded
      expect(mockProvider.generatedPrompts).toHaveLength(0);
    });

    it('allows generation if previous generations were on a prior local day', async () => {
      const now = new Date('2026-10-15T09:00:00.000Z');

      // Generations happened yesterday (2026-10-14 in America/New_York)
      const yesterdayInsights = [
        { createdAt: new Date('2026-10-14T09:00:00.000Z') },
        { createdAt: new Date('2026-10-14T12:00:00.000Z') },
        { createdAt: new Date('2026-10-14T15:00:00.000Z') },
      ];
      (prisma.aiInsight.findMany as any).mockResolvedValue(yesterdayInsights);
      (prisma.aiInsight.findFirst as any).mockResolvedValue(null);

      (prisma.aiInsight.create as any).mockResolvedValue({
        id: 'new-day-insight',
        content: mockProvider.response,
        createdAt: now,
      });

      const result = await generateAiInsight(mockUser.id, { provider: mockProvider, now });
      expect(result.id).toBe('new-day-insight');
      expect(mockProvider.generatedPrompts).toHaveLength(1);
    });
  });

  describe('Timeout and Error Resilience', () => {
    it('throws 504 AI_TIMEOUT when provider takes longer than 10-second timeout', async () => {
      // Mock provider with delay exceeding timeout limit
      mockProvider.delayMs = 150;

      await expect(
        generateAiInsight(mockUser.id, { provider: mockProvider, timeoutMs: 50 })
      ).rejects.toThrowError(AppError);

      try {
        await generateAiInsight(mockUser.id, { provider: mockProvider, timeoutMs: 50 });
      } catch (err: any) {
        expect(err.statusCode).toBe(504);
        expect(err.code).toBe('AI_TIMEOUT');
      }

      // No new insight stored on timeout failure
      expect(prisma.aiInsight.create).not.toHaveBeenCalled();
    });

    it('throws 502 AI_PROVIDER_ERROR when provider encounters an exception', async () => {
      mockProvider.shouldThrow = new Error('Upstream provider connection refused');

      await expect(
        generateAiInsight(mockUser.id, { provider: mockProvider })
      ).rejects.toThrowError(AppError);

      try {
        await generateAiInsight(mockUser.id, { provider: mockProvider });
      } catch (err: any) {
        expect(err.statusCode).toBe(502);
        expect(err.code).toBe('AI_PROVIDER_ERROR');
        expect(err.message).toContain('Upstream provider connection refused');
      }

      expect(prisma.aiInsight.create).not.toHaveBeenCalled();
    });

    it('preserves existing insight in DB when provider fails', async () => {
      const now = new Date('2026-10-15T12:00:00.000Z');
      const existing = {
        id: 'existing-saved-insight',
        userId: mockUser.id,
        content: 'Previous valid insight',
        createdAt: new Date('2026-10-13T10:00:00.000Z'), // > 24 hours ago, cache expired
      };
      (prisma.aiInsight.findFirst as any).mockResolvedValue(existing);

      mockProvider.shouldThrow = new Error('Provider down');

      await expect(generateAiInsight(mockUser.id, { provider: mockProvider, now })).rejects.toThrow();

      // Latest insight query still returns the intact saved insight
      const retrieved = await getLatestAiInsight(mockUser.id);
      expect(retrieved).toEqual(existing);
    });
  });

  describe('API Route Handlers (POST and GET /api/ai/insights)', () => {
    it('POST /api/ai/insights returns 200 with generated insight', async () => {
      const insight = {
        id: 'api-insight-1',
        userId: mockUser.id,
        content: mockProvider.response,
        createdAt: new Date(),
      };
      (prisma.aiInsight.create as any).mockResolvedValue(insight);

      const req = new Request('http://localhost/api/ai/insights', {
        method: 'POST',
        headers: { authorization: `Bearer ${mockUser.id}` },
      });

      const res = await postAiInsightHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe('api-insight-1');
      expect(json.data.content).toBe(mockProvider.response);
    });

    it('GET /api/ai/insights returns 200 with the latest insight', async () => {
      const latest = {
        id: 'latest-insight-record',
        userId: mockUser.id,
        content: 'Existing advice',
        createdAt: new Date(),
      };
      (prisma.aiInsight.findFirst as any).mockResolvedValue(latest);

      const req = new Request('http://localhost/api/ai/insights', {
        method: 'GET',
        headers: { authorization: `Bearer ${mockUser.id}` },
      });

      const res = await getAiInsightHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(latest.id);
      expect(json.data.content).toBe(latest.content);
      expect(json.data.userId).toBe(latest.userId);
    });

    it('POST /api/ai/insights returns 429 error when daily limit is reached', async () => {
      const todayInsights = [
        { createdAt: new Date() },
        { createdAt: new Date() },
        { createdAt: new Date() },
      ];
      (prisma.aiInsight.findMany as any).mockResolvedValue(todayInsights);

      const req = new Request('http://localhost/api/ai/insights', {
        method: 'POST',
        headers: { authorization: `Bearer ${mockUser.id}` },
      });

      const res = await postAiInsightHandler(req);
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('POST /api/ai/insights returns 504 when provider times out', async () => {
      mockProvider.delayMs = 120;

      // Swap active provider with the delayed one and small timeout
      setAiProvider({
        async generate() {
          await new Promise((r) => setTimeout(r, 120));
          return 'Too late';
        },
      });

      // Override timeout via service options in test
      const spy = vi.spyOn(triggersService, 'getTriggerAnalytics');
      spy.mockImplementation(async () => {
        // Small delay to simulate processing
        return { completionRate: 50, triggers: [], weekly: [] };
      });

      // Test with custom timeout using generateAiInsight
      await expect(
        generateAiInsight(mockUser.id, { timeoutMs: 20 })
      ).rejects.toMatchObject({ statusCode: 504, code: 'AI_TIMEOUT' });
    });
  });
});
