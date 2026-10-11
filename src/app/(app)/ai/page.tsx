'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  RefreshCw,
  ArrowRight,
  RotateCcw,
  Activity,
  BookOpen,
  Moon,
  Lightbulb,
  AlertCircle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { api, AiInsightResponse } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';

export interface SuggestionItem {
  id: string;
  title: string;
  helper: string;
  category: 'screen' | 'workout' | 'reading' | 'sleep' | 'default';
}

const DEFAULT_SUGGESTIONS: SuggestionItem[] = [
  {
    id: 's-screen',
    title: 'Your screen time has increased.',
    helper: 'Try a 5-min breathing exercise before using your phone.',
    category: 'screen',
  },
  {
    id: 's-workout',
    title: "You're most likely to skip workouts on weekends.",
    helper: 'Try setting a reminder 30 mins earlier or finding a workout buddy.',
    category: 'workout',
  },
  {
    id: 's-reading',
    title: "You've been consistent with reading!",
    helper: 'Keep going — it helps with focus and reduces stress.',
    category: 'reading',
  },
  {
    id: 's-sleep',
    title: 'Your sleep quality seems low.',
    helper: 'Consider a digital detox 1 hour before bed.',
    category: 'sleep',
  },
];

function parseInsightsToSuggestions(content: string | null | undefined): SuggestionItem[] {
  if (!content || !content.trim()) {
    return DEFAULT_SUGGESTIONS;
  }

  // Split into suggestions by numbered items, bullets, or paragraphs
  const rawBlocks = content
    .split(/(?:^|\n)(?:\d+[\.\)]|\-|\*)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const blocks =
    rawBlocks.length > 1
      ? rawBlocks
      : content
          .split(/\n\n+/)
          .map((s) => s.trim())
          .filter(Boolean);

  if (blocks.length === 0) {
    return DEFAULT_SUGGESTIONS;
  }

  return blocks.map((block, idx) => {
    const cleanBlock = block.replace(/^[\d\.\-\*\s]+/, '').trim();
    let title = cleanBlock;
    let helper = '';

    const colonIndex = cleanBlock.indexOf(':');
    const sentenceMatch = cleanBlock.match(/^([^\.\!\?]+[\.\!\?])\s*(.*)$/);

    if (colonIndex > 8 && colonIndex < 80) {
      title = cleanBlock.slice(0, colonIndex).trim();
      helper = cleanBlock.slice(colonIndex + 1).trim();
    } else if (sentenceMatch && sentenceMatch[1] && sentenceMatch[2]) {
      title = sentenceMatch[1].trim();
      helper = sentenceMatch[2].trim();
    } else {
      title = cleanBlock;
      helper = 'Small consistent steps create lasting behavioral change.';
    }

    // Keyword detection
    const lower = cleanBlock.toLowerCase();
    let category: SuggestionItem['category'] = 'default';
    if (/screen|phone|device|digital|scroll|social media/.test(lower)) {
      category = 'screen';
    } else if (/workout|exercise|gym|run|fitness|walk|movement|active/.test(lower)) {
      category = 'workout';
    } else if (/read|book|journal|write|study|learn|pages/.test(lower)) {
      category = 'reading';
    } else if (/sleep|bed|night|rest|wake|insomnia|tired/.test(lower)) {
      category = 'sleep';
    }

    return {
      id: `insight-${idx}`,
      title,
      helper,
      category,
    };
  });
}

export default function AiAssistantPage() {
  const queryClient = useQueryClient();
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  const [activeModalItem, setActiveModalItem] = useState<SuggestionItem | null>(null);

  // 1. Fetch latest insight
  const { data: insightData, isLoading, isError } = useQuery({
    queryKey: ['ai-insight'],
    queryFn: async () => {
      try {
        const res = await api.ai.getLatest();
        return res.insight;
      } catch {
        return null;
      }
    },
  });

  const remainingDailyGenerations =
    typeof insightData?.remainingGenerations === 'number'
      ? insightData.remainingGenerations
      : 3;

  // 2. Refresh mutation to POST /api/ai/insights
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await api.ai.generate();
      return res.insight;
    },
    onSuccess: (newInsight) => {
      queryClient.setQueryData(['ai-insight'], newInsight);
      queryClient.invalidateQueries({ queryKey: ['ai-insight'] });
      queryClient.invalidateQueries({ queryKey: ['ai-latest'] });
      showSuccessToast(
        'Fresh suggestions generated based on your latest habits.',
        'Personalized for you'
      );
    },
    onError: (err: any) => {
      const statusCode = err?.status ?? err?.statusCode;
      const errorCode = err?.code;
      const message = err?.message || '';

      if (statusCode === 429 || errorCode === 'RATE_LIMIT_EXCEEDED' || message.includes('limit')) {
        showErrorToast(
          "You've reached your 3 daily AI generations. Check back tomorrow for fresh insights!",
          'Daily Limit Reached'
        );
      } else if (statusCode === 504 || errorCode === 'AI_TIMEOUT' || message.includes('timed out')) {
        showErrorToast(
          'Generation timed out after 10 seconds. Please try refreshing again in a moment.',
          'Request Timed Out'
        );
      } else {
        showErrorToast(
          message || 'Unable to generate new insights right now. Please try again later.',
          'Generation Error'
        );
      }
    },
  });

  // 3. Parsed suggestions or fallback
  const suggestions = useMemo(() => {
    if (!insightData || !insightData.content) {
      return DEFAULT_SUGGESTIONS;
    }
    return parseInsightsToSuggestions(insightData.content);
  }, [insightData]);

  // Category style mapping matching reference screenshot
  const categoryConfig: Record<
    SuggestionItem['category'],
    {
      bg: string;
      color: string;
      icon: React.ReactNode;
      tag: string;
    }
  > = {
    screen: {
      bg: 'bg-[#EAF8F0]',
      color: 'text-[#10B981]',
      icon: <RotateCcw className="w-5 h-5 stroke-[2.4]" />,
      tag: 'Digital Wellness',
    },
    workout: {
      bg: 'bg-[#EEF2FF]',
      color: 'text-[#4F46E5]',
      icon: <Activity className="w-5 h-5 stroke-[2.4]" />,
      tag: 'Physical Fitness',
    },
    reading: {
      bg: 'bg-[#E0F2FE]',
      color: 'text-[#0284C7]',
      icon: <BookOpen className="w-5 h-5 stroke-[2.4]" />,
      tag: 'Mind & Focus',
    },
    sleep: {
      bg: 'bg-[#F3E8FF]',
      color: 'text-[#9333EA]',
      icon: <Moon className="w-5 h-5 fill-current stroke-[2]" />,
      tag: 'Sleep & Recovery',
    },
    default: {
      bg: 'bg-[#FEF3C7]',
      color: 'text-[#D97706]',
      icon: <Lightbulb className="w-5 h-5 stroke-[2.4]" />,
      tag: 'General Habit',
    },
  };

  return (
    <div className="relative min-h-[calc(100vh-2rem)] pb-16">
      {/* Background Scenic Illustration provided by user */}
      <div className="fixed inset-0 lg:left-64 pointer-events-none select-none z-0 overflow-hidden">
        <img
          src="/images/ai-bg.png"
          alt="AI background scenery"
          className="w-full h-full object-cover object-bottom"
        />
      </div>

      <div className="relative z-10 space-y-6 pt-2 max-w-5xl mx-auto">
        {/* Page Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-[28px] font-black text-navy-950 tracking-tight">
            AI Suggestions
          </h1>
        </div>

        {/* Top Banner: Clean lavender gradient with purple sparkle */}
        <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#F6EEFD] via-[#EEE9FE] to-[#E3EBFD] border border-purple-200/60 p-6 sm:p-7 shadow-[0_8px_32px_rgba(139,92,246,0.06)]">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            {/* Left: Sparkle Badge + Text */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-4.5">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#E9D5FF] to-[#D8B4FE] text-[#7E22CE] flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-6 h-6 fill-[#7E22CE]/20 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-navy-950 tracking-tight">
                  Personalized for you
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                  Based on your habits, patterns and journal entries.
                </p>
              </div>
            </div>

            {/* Right: Refresh Button */}
            <div className="sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending || remainingDailyGenerations <= 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/90 hover:bg-white text-navy-950 border border-purple-200/80 shadow-xs hover:shadow-md transition-all font-bold text-xs sm:text-sm disabled:opacity-55 disabled:cursor-not-allowed group active:scale-95"
                aria-label="Refresh AI insights"
              >
                <RefreshCw
                  className={`w-4 h-4 text-purple-700 transition-transform ${
                    refreshMutation.isPending ? 'animate-spin' : 'group-hover:rotate-45'
                  }`}
                />
                <span>{refreshMutation.isPending ? 'Generating...' : 'Refresh'}</span>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  {remainingDailyGenerations} left
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Vertical List of Suggestion Cards */}
        <div className="space-y-3.5">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/85 rounded-[22px] p-5 sm:p-5.5 border border-white/80 shadow-[0_4px_20px_rgba(31,38,135,0.04)] flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 flex-1">
                  <Skeleton className="w-13 h-13 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/5 rounded-md" />
                    <Skeleton className="h-4 w-4/5 rounded-md" />
                  </div>
                </div>
                <Skeleton className="w-5 h-5 rounded-md shrink-0" />
              </div>
            ))
          ) : (
            suggestions.map((item) => {
              const config = categoryConfig[item.category] || categoryConfig.default;

              return (
                <div
                  key={item.id}
                  onClick={() => setActiveModalItem(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveModalItem(item);
                    }
                  }}
                  className="bg-white/85 hover:bg-white border border-white/80 hover:border-purple-200/50 rounded-[22px] p-4.5 sm:p-5 flex items-center justify-between gap-4 shadow-[0_4px_20px_rgba(31,38,135,0.04)] hover:shadow-[0_8px_30px_rgba(31,38,135,0.08)] transition-all duration-200 group cursor-pointer"
                >
                  {/* Left: Pastel Icon Tile + Content */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Pastel icon tile */}
                    <div
                      className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full ${config.bg} ${config.color} flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105 duration-200`}
                    >
                      {config.icon}
                    </div>

                    {/* Text Details */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-black text-navy-950 tracking-tight group-hover:text-purple-950 transition-colors leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mt-0.5 truncate sm:whitespace-normal">
                        {item.helper}
                      </p>
                    </div>
                  </div>

                  {/* Right Arrow */}
                  <div className="shrink-0 p-1">
                    <ArrowRight className="w-4.5 h-4.5 text-slate-400 group-hover:text-navy-950 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quiet Disclaimer Note */}
        <p className="text-center text-xs text-slate-500 font-semibold mt-7 mb-2 select-none">
          Suggestions are general wellbeing tips, not medical advice.
        </p>
      </div>

      {/* Suggestion Detail Modal */}
      {activeModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="bg-white rounded-[26px] max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveModalItem(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Category Badge & Icon */}
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full ${
                  categoryConfig[activeModalItem.category]?.bg || 'bg-amber-100'
                } ${
                  categoryConfig[activeModalItem.category]?.color || 'text-amber-700'
                } flex items-center justify-center shrink-0 shadow-xs`}
              >
                {categoryConfig[activeModalItem.category]?.icon}
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-purple-700 tracking-wider uppercase bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/50">
                  {categoryConfig[activeModalItem.category]?.tag || 'Wellbeing'}
                </span>
                <h2 className="text-base sm:text-lg font-black text-navy-950 mt-1 leading-snug">
                  {activeModalItem.title}
                </h2>
              </div>
            </div>

            {/* Helper Guidance */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
              <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                {activeModalItem.helper}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModalItem(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-navy-950 text-white font-bold text-xs hover:bg-navy-900 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
