'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Globe,
  Heart,
  Lock,
  MessageCircle,
  Share2,
  Sparkles,
  Tag,
  User,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';

const categoryMeta: Record<
  string,
  {
    gradient: string;
    tags: string[];
    accent: string;
    bgAccent: string;
    icon: string;
  }
> = {
  FITNESS: {
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
    tags: ['#Fitness', '#Wellness', '#Discipline'],
    accent: 'text-amber-700',
    bgAccent: 'bg-amber-50 border-amber-200/60',
    icon: '⚡',
  },
  MINDFULNESS: {
    gradient: 'from-indigo-400 via-purple-500 to-pink-500',
    tags: ['#Mindfulness', '#Peace', '#Stillness'],
    accent: 'text-purple-700',
    bgAccent: 'bg-purple-50 border-purple-200/60',
    icon: '✨',
  },
  PRODUCTIVITY: {
    gradient: 'from-cyan-400 via-blue-500 to-indigo-600',
    tags: ['#Productivity', '#SelfCare', '#Focus'],
    accent: 'text-sky-700',
    bgAccent: 'bg-sky-50 border-sky-200/60',
    icon: '🚀',
  },
  LEARNING: {
    gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    tags: ['#Learning', '#Reading', '#Growth'],
    accent: 'text-emerald-700',
    bgAccent: 'bg-emerald-50 border-emerald-200/60',
    icon: '📚',
  },
  HEALTH: {
    gradient: 'from-rose-400 via-pink-500 to-amber-500',
    tags: ['#Health', '#Nutrition', '#Vitality'],
    accent: 'text-rose-700',
    bgAccent: 'bg-rose-50 border-rose-200/60',
    icon: '🌱',
  },
  OTHER: {
    gradient: 'from-slate-400 via-slate-600 to-navy-900',
    tags: ['#Reflections', '#Habits', '#Consistency'],
    accent: 'text-slate-700',
    bgAccent: 'bg-slate-50 border-slate-200/60',
    icon: '📓',
  },
};

export default function JournalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  const journalId = params?.id as string;

  // Fetch journal details
  const { data: journal, isLoading, error } = useQuery({
    queryKey: ['journal', journalId],
    queryFn: async () => {
      const res = await fetch(`/api/journals/${journalId}`);
      if (!res.ok) {
        throw new Error('Journal not found');
      }
      return res.json();
    },
    enabled: !!journalId,
  });

  // Call POST /api/journals/:id/read on mount as required
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/journals/${journalId}/read`, {
        method: 'POST',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-read-status'] });
    },
  });

  useEffect(() => {
    if (journalId && !journalId.startsWith('demo-')) {
      markAsReadMutation.mutate();
    }
  }, [journalId]);

  const meta = categoryMeta[journal?.category || 'OTHER'] || categoryMeta.OTHER;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-4 pb-20">
        <Skeleton className="h-8 w-32 rounded-xl" />
        <div className="bg-white/90 rounded-[26px] p-6 sm:p-8 space-y-4 border border-slate-100">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-40" />
          <div className="pt-4 space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  // Handle demo or fallback if journal not found in DB
  const fallbackJournals: Record<string, any> = {
    'demo-1': {
      id: 'demo-1',
      title: 'Finding Balance in My Routine',
      body: 'Over the past two weeks, balancing intense work hours with daily evening mindfulness has transformed my resting heart rate and sleep clarity.\n\nKey takeaways:\n1. Consistent small efforts compound faster than periodic marathons.\n2. Protecting 15 minutes before bed prepares the nervous system for restorative sleep.\n3. Keep going even when momentum dips!',
      category: 'MINDFULNESS',
      visibility: 'PUBLIC',
      createdAt: new Date().toISOString(),
      author: { name: 'Aarav' },
      imageUrl: '/images/finding-balance.png',
    },
    'demo-2': {
      id: 'demo-2',
      title: 'Small Changes, Big Results',
      body: 'Waking up just 20 minutes earlier to organize my top three needle-moving tasks before opening emails reduced daily fatigue by half.\n\nKey takeaways:\n1. Focus on tiny daily habit shifts.\n2. Momentum breeds energy and discipline.\n3. Action before motivation every time.',
      category: 'PRODUCTIVITY',
      visibility: 'PUBLIC',
      createdAt: new Date().toISOString(),
      author: { name: 'Aarav' },
      imageUrl: '/images/small-changes.png',
    },
    'demo-3': {
      id: 'demo-3',
      title: 'My 30-Day Fitness Journey',
      body: 'Completed 30 consecutive days of outdoor intervals. The habit tracking streaks kept me accountable on chilly rainy mornings!\n\nKey takeaways:\n1. Small continuous efforts beat intermittent bursts.\n2. Tracking progress builds real momentum.\n3. Celebrate each active day!',
      category: 'FITNESS',
      visibility: 'PUBLIC',
      createdAt: new Date().toISOString(),
      author: { name: 'Neha' },
      imageUrl: '/images/fitness-journey.png',
    },
  };

  const displayJournal = journal || fallbackJournals[journalId] || fallbackJournals['demo-1'];

  return (
    <div className="relative min-h-[calc(100vh-2rem)] pb-20">
      <div className="max-w-3xl mx-auto space-y-6 pt-0">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/journals')}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-navy-950 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white border border-slate-200/80 shadow-2xs transition-all group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Journals</span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              showSuccessToast('Link copied to clipboard', 'Copied');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-navy-950 px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white border border-slate-200/80 shadow-2xs transition-all"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Share</span>
          </button>
        </div>

        {/* Read Notification Badge */}
        <div className="bg-emerald-50/90 border border-emerald-200/70 rounded-2xl p-3 flex items-center justify-between gap-3 text-emerald-950 text-xs sm:text-sm font-bold shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span>Entry read! +5 XP counted towards today's consistency goal.</span>
          </div>
          <span className="shrink-0 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900">
            Streak Active
          </span>
        </div>

        {/* Main Journal Card */}
        <article className="bg-white/95 rounded-[26px] p-6 sm:p-9 border border-slate-100 shadow-[0_4px_30px_rgba(11,22,53,0.04)] space-y-6">
          {/* Header Area */}
          <div className="space-y-3.5 pb-5 border-b border-slate-100">
            {/* Category & Visibility Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs font-extrabold px-3 py-1 rounded-full border ${meta.bgAccent} ${meta.accent} flex items-center gap-1.5`}
              >
                {displayJournal.title.includes('Finding Balance') ? (
                  <img src="/images/finding-balance.png" alt="Finding Balance" className="w-3.5 h-3.5 object-contain inline-block" />
                ) : displayJournal.title.includes('Small Changes') ? (
                  <img src="/images/small-changes.png" alt="Small Changes" className="w-3.5 h-3.5 object-contain inline-block" />
                ) : displayJournal.title.includes('Fitness Journey') ? (
                  <img src="/images/fitness-journey.png" alt="Fitness Journey" className="w-3.5 h-3.5 object-contain inline-block" />
                ) : (
                  <span>{meta.icon}</span>
                )}
                <span className="capitalize">{displayJournal.category.toLowerCase()}</span>
              </span>

              {displayJournal.visibility === 'PUBLIC' ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-emerald-500" />
                  <span>Public</span>
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500" />
                  <span>Private</span>
                </span>
              )}
            </div>

            {/* Title */}
            <div className="flex items-center gap-3.5">
              {(displayJournal.imageUrl || displayJournal.title.includes('Finding Balance') || displayJournal.title.includes('Small Changes') || displayJournal.title.includes('Fitness Journey')) && (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#FFF5F5] border border-slate-100/80 p-2 flex items-center justify-center shrink-0 shadow-2xs">
                  <img
                    src={
                      displayJournal.imageUrl ||
                      (displayJournal.title.includes('Fitness Journey')
                        ? '/images/fitness-journey.png'
                        : displayJournal.title.includes('Small Changes')
                        ? '/images/small-changes.png'
                        : '/images/finding-balance.png')
                    }
                    alt={displayJournal.title}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <h1 className="text-2xl sm:text-3xl font-black text-navy-950 tracking-tight leading-tight">
                {displayJournal.title}
              </h1>
            </div>

            {/* Author & Timestamp */}
            <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-500">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                {displayJournal.author?.name?.[0] || 'A'}
              </div>
              <span>By {displayJournal.author?.name || 'Aarav'}</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(displayJournal.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Linked Habit Box if attached */}
          {displayJournal.habit && (
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                  Linked Habit
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-navy-950 truncate">
                  {displayJournal.habit.name}
                </div>
              </div>
            </div>
          )}

          {/* Journal Body */}
          <div className="prose prose-slate max-w-none text-sm sm:text-base text-slate-800 leading-relaxed font-medium whitespace-pre-line">
            {displayJournal.body}
          </div>

          {/* Hashtag pills */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
            {meta.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-100/70"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Bottom Actions */}
          <div className="pt-2 flex items-center justify-between text-slate-500">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => showSuccessToast('Liked this reflection', 'Liked')}
                className="flex items-center gap-1.5 text-xs font-bold hover:text-rose-600 transition-colors py-1 px-2.5 rounded-lg hover:bg-rose-50"
              >
                <Heart className="w-4 h-4 text-slate-400 hover:text-rose-500" />
                <span>24 Likes</span>
              </button>

              <div className="flex items-center gap-1.5 text-xs font-bold py-1 px-2.5">
                <MessageCircle className="w-4 h-4 text-slate-400" />
                <span>6 Comments</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
