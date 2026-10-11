import { AiInsight } from '@prisma/client';
import { prisma } from '@/server/lib/prisma';
import { AppError, NotFoundError, TooManyRequestsError } from '@/server/lib/api';
import { formatYmd, toLocalDate, addUtcDays } from '@/server/domain/streak';
import { rangeStartFor } from '@/server/domain/triggers';
import { getTriggerAnalytics } from '@/server/services/triggers';

export const MAX_GENERATIONS_PER_DAY = 3;
export const AI_TIMEOUT_MS = 10_000;
export const MAX_TOKEN_BUDGET = 2000; // ~8,000 characters (approx 4 chars per token)
const CHARS_PER_TOKEN = 4;

export const SYSTEM_PROMPT = `You are a warm, supportive habit coach for StreakKeeper.
Analyze the user's progress, freeze reasons, notes, reflections, and trigger patterns from the last 30 days.
Provide 2 to 3 short, kind, specific suggestions to help the user maintain momentum and overcome triggers.
Do NOT give any medical, psychiatric, or diagnostic advice under any circumstances.
Keep your response concise, empathetic, and actionable.`;

export interface AiProvider {
  generate(prompt: string): Promise<string>;
}

export class EnvAiProvider implements AiProvider {
  public apiKey: string;
  public provider: string;
  public model: string;

  constructor(options?: { apiKey?: string; provider?: string; model?: string }) {
    this.apiKey = options?.apiKey ?? process.env.AI_API_KEY ?? '';
    this.provider = options?.provider ?? process.env.AI_PROVIDER ?? 'default';
    this.model = options?.model ?? process.env.AI_MODEL ?? 'default-model';
  }

  async generate(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new AppError(500, 'AI_CONFIG_ERROR', 'AI_API_KEY is not configured');
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new AppError(502, 'AI_PROVIDER_ERROR', `AI provider HTTP error ${res.status}: ${errText}`);
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new AppError(502, 'AI_PROVIDER_ERROR', 'Invalid response format from AI provider');
    }
    return content;
  }
}

let activeAiProvider: AiProvider = new EnvAiProvider();

export function getAiProvider(): AiProvider {
  return activeAiProvider;
}

export function setAiProvider(provider: AiProvider): void {
  activeAiProvider = provider;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function truncateToTokenBudget(text: string, tokenBudget: number = MAX_TOKEN_BUDGET): string {
  const maxChars = tokenBudget * CHARS_PER_TOKEN;
  if (text.length <= maxChars) {
    return text;
  }
  const truncationNotice = '\n... [truncated to fit token budget]';
  const cutoff = Math.max(0, maxChars - truncationNotice.length);
  return text.slice(0, cutoff) + truncationNotice;
}

export interface InsightPromptInput {
  userName?: string | null;
  completionRate: number;
  triggers: Array<{ key: string; label: string; percentage: number; count: number }>;
  freezeUses: Array<{ localDate: Date; reasonTag: string; note: string }>;
  journals: Array<{ createdAt: Date; category: string; title: string; body: string }>;
}

export function buildInsightPrompt(input: InsightPromptInput): string {
  const lines: string[] = [];
  lines.push(`User: ${input.userName ? input.userName : 'Habit builder'}`);
  lines.push(`30-Day Completion Rate: ${input.completionRate}%`);

  if (input.triggers.length > 0) {
    lines.push('\nTrigger Points & Friction Patterns:');
    for (const t of input.triggers) {
      lines.push(`- ${t.label}: ${t.count} times (${t.percentage}% of friction days)`);
    }
  } else {
    lines.push('\nTrigger Points: None identified (excellent consistency).');
  }

  if (input.freezeUses.length > 0) {
    lines.push('\nStreak Freeze Usages & Notes:');
    for (const f of input.freezeUses) {
      lines.push(`- [${formatYmd(f.localDate)}] Reason: ${f.reasonTag} | Note: "${f.note}"`);
    }
  } else {
    lines.push('\nStreak Freeze Usages: None used in the last 30 days.');
  }

  if (input.journals.length > 0) {
    lines.push('\nUser Journal Entries & Reflections:');
    for (const j of input.journals) {
      lines.push(`- [${formatYmd(j.createdAt)}] (${j.category}) ${j.title}: ${j.body}`);
    }
  } else {
    lines.push('\nUser Journal Entries: None written in the last 30 days.');
  }

  const rawPrompt = lines.join('\n');
  return truncateToTokenBudget(rawPrompt, MAX_TOKEN_BUDGET);
}

export async function generateWithTimeout(
  provider: AiProvider,
  prompt: string,
  timeoutMs: number = AI_TIMEOUT_MS
): Promise<string> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new AppError(504, 'AI_TIMEOUT', `AI generation timed out after ${timeoutMs / 1000} seconds`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([provider.generate(prompt), timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function generateAiInsight(
  userId: string,
  options?: {
    provider?: AiProvider;
    now?: Date;
    timeoutMs?: number;
  }
): Promise<AiInsight> {
  const now = options?.now ?? new Date();
  const provider = options?.provider ?? getAiProvider();
  const timeoutMs = options?.timeoutMs ?? AI_TIMEOUT_MS;

  // Never query email or passwordHash
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, timezone: true },
  });
  if (!user) {
    throw new NotFoundError('User not found', 'NOT_FOUND');
  }

  const today = toLocalDate(now, user.timezone);
  const from = rangeStartFor(today, '30d');

  // 1. Check 24-hour cache when underlying data has not changed
  const latestInsight = await prisma.aiInsight.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (latestInsight) {
    const ageMs = now.getTime() - latestInsight.createdAt.getTime();
    if (ageMs < 24 * 60 * 60 * 1000) {
      const [newCheckIns, newFreezes, newJournals] = await Promise.all([
        prisma.checkIn.count({
          where: { userId, createdAt: { gt: latestInsight.createdAt } },
        }),
        prisma.freezeUse.count({
          where: { userId, createdAt: { gt: latestInsight.createdAt } },
        }),
        prisma.journal.count({
          where: { authorId: userId, updatedAt: { gt: latestInsight.createdAt } },
        }),
      ]);

      if (newCheckIns === 0 && newFreezes === 0 && newJournals === 0) {
        return latestInsight;
      }
    }
  }

  // 2. Check rate limit: max 3 generations per user per day in user local timezone
  const startOfYesterdayUtc = addUtcDays(today, -1);
  const recentInsights = await prisma.aiInsight.findMany({
    where: {
      userId,
      createdAt: { gte: startOfYesterdayUtc },
    },
    select: { createdAt: true },
  });
  const todayStr = formatYmd(today);
  const generationsToday = recentInsights.filter(
    (i) => formatYmd(toLocalDate(i.createdAt, user.timezone)) === todayStr
  ).length;

  if (generationsToday >= MAX_GENERATIONS_PER_DAY) {
    throw new TooManyRequestsError(
      `Daily AI generation limit reached (${MAX_GENERATIONS_PER_DAY} per day)`,
      'RATE_LIMIT_EXCEEDED'
    );
  }

  // 3. Gather last 30 days data
  const [freezeUses, journals, triggerAnalytics] = await Promise.all([
    prisma.freezeUse.findMany({
      where: {
        userId,
        localDate: { gte: from, lte: today },
      },
      orderBy: { localDate: 'desc' },
      select: { localDate: true, reasonTag: true, note: true },
    }),
    prisma.journal.findMany({
      where: {
        authorId: userId,
        createdAt: {
          gte: new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 0, 0, 0)),
          lte: now,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, category: true, title: true, body: true },
    }),
    getTriggerAnalytics(userId, { range: '30d' }, now),
  ]);

  // 4. Build prompt (safely truncated to token budget, strictly no email/passwordHash)
  const prompt = buildInsightPrompt({
    userName: user.name,
    completionRate: triggerAnalytics.completionRate,
    triggers: triggerAnalytics.triggers,
    freezeUses,
    journals,
  });

  // 5. Generate with 10-second timeout
  let content: string;
  try {
    content = await generateWithTimeout(provider, prompt, timeoutMs);
  } catch (err: unknown) {
    if (err instanceof AppError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Unknown AI provider error';
    throw new AppError(502, 'AI_PROVIDER_ERROR', `AI provider error: ${message}`);
  }

  // 6. Store result in AiInsight
  return prisma.aiInsight.create({
    data: {
      userId,
      content: content.trim(),
      basedOnFrom: from,
      basedOnTo: today,
    },
  });
}

export async function getLatestAiInsight(userId: string): Promise<AiInsight | null> {
  return prisma.aiInsight.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAiDailyQuota(
  userId: string,
  now?: Date
): Promise<{ used: number; remaining: number; max: number }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const tz = user?.timezone || 'UTC';
    const currentDate = now ?? new Date();
    const today = toLocalDate(currentDate, tz);
    const startOfYesterdayUtc = addUtcDays(today, -1);
    const recentInsights = await prisma.aiInsight.findMany({
      where: {
        userId,
        createdAt: { gte: startOfYesterdayUtc },
      },
      select: { createdAt: true },
    });
    if (!Array.isArray(recentInsights)) {
      return { used: 0, remaining: MAX_GENERATIONS_PER_DAY, max: MAX_GENERATIONS_PER_DAY };
    }
    const todayStr = formatYmd(today);
    const used = recentInsights.filter(
      (i) => i?.createdAt && formatYmd(toLocalDate(i.createdAt, tz)) === todayStr
    ).length;
    const remaining = Math.max(0, MAX_GENERATIONS_PER_DAY - used);
    return { used, remaining, max: MAX_GENERATIONS_PER_DAY };
  } catch {
    return { used: 0, remaining: MAX_GENERATIONS_PER_DAY, max: MAX_GENERATIONS_PER_DAY };
  }
}
