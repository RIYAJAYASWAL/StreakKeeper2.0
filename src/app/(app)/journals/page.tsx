'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Heart,
  MessageCircle,
  Clock,
  Sparkles,
  Lock,
  Globe,
  X,
  Flame,
  CheckCircle2,
  Filter,
  ArrowRight,
  Tag,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';

export interface JournalItem {
  id: string;
  title: string;
  body: string;
  category: 'FITNESS' | 'MINDFULNESS' | 'PRODUCTIVITY' | 'LEARNING' | 'HEALTH' | 'OTHER';
  visibility: 'PUBLIC' | 'PRIVATE';
  createdAt: string;
  authorId?: string;
  author?: {
    id: string;
    name: string;
  };
  habitId?: string | null;
  habit?: {
    id: string;
    name: string;
    category: string;
  } | null;
  likesCount?: number;
  commentsCount?: number;
  imageUrl?: string;
}

// Category styling & hashtags helper
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

// Seed inspiration items matching reference screenshot
const inspirationFeed: JournalItem[] = [
  {
    id: 'demo-1',
    title: 'Finding Balance in My Routine',
    body: 'Over the past two weeks, balancing intense work hours with daily evening mindfulness has transformed my resting heart rate and sleep clarity.',
    category: 'MINDFULNESS',
    visibility: 'PUBLIC',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    author: { id: 'u-aarav', name: 'Aarav' },
    likesCount: 24,
    commentsCount: 6,
    imageUrl: '/images/finding-balance.png',
  },
  {
    id: 'demo-2',
    title: 'Small Changes, Big Results',
    body: 'Waking up just 20 minutes earlier to organize my top three needle-moving tasks before opening emails reduced daily fatigue by half.',
    category: 'PRODUCTIVITY',
    visibility: 'PUBLIC',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    author: { id: 'u-aarav', name: 'Aarav' },
    likesCount: 18,
    commentsCount: 4,
    imageUrl: '/images/small-changes.png',
  },
  {
    id: 'demo-3',
    title: 'My 30-Day Fitness Journey',
    body: 'Completed 30 consecutive days of outdoor intervals. The habit tracking streaks kept me accountable on chilly rainy mornings!',
    category: 'FITNESS',
    visibility: 'PUBLIC',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    author: { id: 'u-neha', name: 'Neha' },
    likesCount: 32,
    commentsCount: 6,
    imageUrl: '/images/fitness-journey.png',
  },
];

function formatTimeAgo(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours <= 0) return 'Just now';
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  } catch {
    return 'Recently';
  }
}

export default function JournalsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  // Navigation & state
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'ALL' | 'PUBLIC' | 'PRIVATE'>('ALL');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest'>('latest');
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newHabitId, setNewHabitId] = useState<string>('');
  const [newVisibility, setNewVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [newCategory, setNewCategory] = useState<string>('PRODUCTIVITY');

  // Infinite scroll cursor for feed
  const [feedItems, setFeedItems] = useState<JournalItem[]>([]);
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 1. Fetch user habits for modal dropdown
  const { data: habitsData } = useQuery<{ habits: Array<{ id: string; name: string; category: string }> }>({
    queryKey: ['journals-habits-dropdown'],
    queryFn: async () => {
      const res = await fetch('/api/habits');
      if (!res.ok) return { habits: [] };
      const json = await res.json();
      return { habits: json?.data?.habits || json?.habits || [] };
    },
  });

  // 2. Fetch daily read status
  const { data: readStatusData } = useQuery<{ readToday: boolean; required?: boolean }>({
    queryKey: ['journal-read-status'],
    queryFn: async () => {
      const res = await fetch('/api/journals/read-status');
      if (!res.ok) return { readToday: false, required: false };
      return res.json();
    },
  });

  // 3. Fetch My Journals
  const { data: myJournalsData, isLoading: isMyLoading } = useQuery<JournalItem[]>({
    queryKey: ['my-journals'],
    queryFn: async () => {
      const res = await fetch('/api/journals/mine');
      if (!res.ok) return [];
      return res.json();
    },
  });

  // 4. Fetch initial Feed
  const { data: feedInitialData, isLoading: isFeedLoading, refetch: refetchFeed } = useQuery<{
    items: JournalItem[];
    nextCursor: string | null;
  }>({
    queryKey: ['journal-feed'],
    queryFn: async () => {
      const res = await fetch('/api/journals/feed?limit=10');
      if (!res.ok) return { items: [], nextCursor: null };
      return res.json();
    },
  });

  useEffect(() => {
    if (feedInitialData?.items) {
      setFeedItems(feedInitialData.items);
      setFeedCursor(feedInitialData.nextCursor);
      setHasMoreFeed(!!feedInitialData.nextCursor);
    }
  }, [feedInitialData]);

  // Load more feed items handler
  const loadMoreFeed = async () => {
    if (!feedCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/journals/feed?limit=10&cursor=${feedCursor}`);
      if (res.ok) {
        const data = await res.json();
        setFeedItems((prev) => [...prev, ...data.items]);
        setFeedCursor(data.nextCursor);
        setHasMoreFeed(!!data.nextCursor);
      }
    } catch {
      showErrorToast('Failed to load more journals');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Create journal mutation
  const createJournalMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      body: string;
      habitId?: string;
      visibility: 'PUBLIC' | 'PRIVATE';
      category: string;
    }) => {
      const res = await fetch('/api/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create journal');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-journals'] });
      queryClient.invalidateQueries({ queryKey: ['journal-feed'] });
      setIsWriteModalOpen(false);
      setNewTitle('');
      setNewBody('');
      setNewHabitId('');
      setNewVisibility('PUBLIC');
      showSuccessToast('Journal created successfully!', 'Published');
    },
    onError: (err: any) => {
      showErrorToast(err.message || 'Failed to publish journal', 'Error');
    },
  });

  // Filter & sort logic
  const displayedJournals = useMemo(() => {
    let sourceList: JournalItem[] = [];

    if (activeTab === 'my') {
      sourceList = myJournalsData || [];
    } else {
      // If community feed is empty, supplement with aesthetic inspiration items
      if (feedItems.length === 0 && !isFeedLoading) {
        sourceList = inspirationFeed;
      } else {
        sourceList = feedItems;
      }
    }

    // Apply visibility filter
    if (visibilityFilter !== 'ALL') {
      sourceList = sourceList.filter((j) => j.visibility === visibilityFilter);
    }

    // Apply search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sourceList = sourceList.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.body.toLowerCase().includes(q) ||
          j.author?.name.toLowerCase().includes(q) ||
          categoryMeta[j.category]?.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Apply sort
    const sorted = [...sourceList].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortBy === 'latest' ? timeB - timeA : timeA - timeB;
    });

    return sorted;
  }, [activeTab, myJournalsData, feedItems, isFeedLoading, visibilityFilter, searchQuery, sortBy]);

  // Handle habit selection auto-fill category
  const handleHabitChange = (hId: string) => {
    setNewHabitId(hId);
    if (hId && habitsData?.habits) {
      const picked = habitsData.habits.find((h) => h.id === hId);
      if (picked) {
        setNewCategory(picked.category);
      }
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-2rem)] pb-20">
      <div className="max-w-4xl mx-auto space-y-5 pt-0">
        {/* Top Header: Title & "Write a Journal" button */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-[28px] font-black text-navy-950 tracking-tight">
            Journals
          </h1>

          <button
            type="button"
            onClick={() => setIsWriteModalOpen(true)}
            className="inline-flex items-center justify-center px-5 py-2.5 sm:py-3 rounded-xl bg-[#0B1635] hover:bg-[#1B2A5E] text-white font-bold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all active:scale-95 shrink-0"
          >
            <span>Write a Journal</span>
          </button>
        </div>

        {/* Daily Read Rule Banner (Shown when required or as streak protection motivator) */}
        {readStatusData?.required && (
          <div
            className={`p-3.5 sm:p-4 rounded-[18px] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${readStatusData.readToday
                ? 'bg-emerald-50/90 border-emerald-200/80 text-emerald-950'
                : 'bg-amber-50/90 border-amber-200/80 text-amber-950'
              }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${readStatusData.readToday ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
              >
                {readStatusData.readToday ? (
                  <CheckCircle2 className="w-4.5 h-4.5 stroke-[2.5]" />
                ) : (
                  <BookOpen className="w-4.5 h-4.5" />
                )}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-extrabold tracking-tight">
                  {readStatusData.readToday
                    ? 'Daily journal reading goal accomplished!'
                    : 'Read 1 journal today to keep your streak counting'}
                </p>
                <p className="text-[11px] font-medium opacity-80 mt-0.5">
                  {readStatusData.readToday
                    ? 'Your streak is protected for today. +5 XP earned.'
                    : 'Open and read any community entry below to complete this rule.'}
                </p>
              </div>
            </div>

            <div className="shrink-0 self-start sm:self-auto flex items-center gap-2">
              <span
                className={`text-xs font-black px-3 py-1 rounded-full ${readStatusData.readToday
                    ? 'bg-emerald-200/70 text-emerald-900'
                    : 'bg-amber-200/70 text-amber-900'
                  }`}
              >
                {readStatusData.readToday ? '1/1 Done ✨' : '0/1 Read'}
              </span>
            </div>
          </div>
        )}

        {/* Tabs: "All Journals" & "My Journals" */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-all shadow-xs ${activeTab === 'all'
                ? 'bg-[#0B1635] text-white'
                : 'bg-white/80 hover:bg-white text-slate-600 hover:text-navy-950 border border-slate-200/80'
              }`}
          >
            All Journals
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-all shadow-xs ${activeTab === 'my'
                ? 'bg-[#0B1635] text-white'
                : 'bg-white/80 hover:bg-white text-slate-600 hover:text-navy-950 border border-slate-200/80'
              }`}
          >
            My Journals
          </button>
        </div>

        {/* Search Input Bar matching screenshot */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search journals..."
            className="w-full bg-white/90 hover:bg-white focus:bg-white border border-slate-200/80 rounded-[20px] pl-11 pr-11 py-3 text-xs sm:text-sm text-navy-950 placeholder:text-slate-400 shadow-2xs focus:ring-2 focus:ring-navy-900/10 focus:border-navy-900 outline-hidden transition-all"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-navy-950"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-300">
              <ArrowRight className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Filter Pills & Sort Select Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVisibilityFilter('ALL')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${visibilityFilter === 'ALL'
                  ? 'bg-slate-200 text-navy-950 shadow-2xs'
                  : 'bg-white/80 text-slate-600 hover:text-navy-950 border border-slate-200/80'
                }`}
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              <span>All</span>
            </button>

            <button
              type="button"
              onClick={() => setVisibilityFilter(visibilityFilter === 'PUBLIC' ? 'ALL' : 'PUBLIC')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${visibilityFilter === 'PUBLIC'
                  ? 'bg-[#0B1635] text-white shadow-2xs'
                  : 'bg-white/80 text-slate-700 hover:text-navy-950 border border-slate-200/80'
                }`}
            >
              <Globe className="w-3 h-3 text-emerald-500" />
              <span>Public</span>
            </button>

            <button
              type="button"
              onClick={() => setVisibilityFilter(visibilityFilter === 'PRIVATE' ? 'ALL' : 'PRIVATE')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${visibilityFilter === 'PRIVATE'
                  ? 'bg-[#0B1635] text-white shadow-2xs'
                  : 'bg-white/80 text-slate-700 hover:text-navy-950 border border-slate-200/80'
                }`}
            >
              <Lock className="w-3 h-3 text-amber-500" />
              <span>Private</span>
            </button>
          </div>

          {/* Sort Select Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'latest' | 'oldest')}
                className="appearance-none bg-white/85 hover:bg-white border border-slate-200/80 rounded-full pl-4 pr-8 py-1.5 text-xs font-bold text-navy-950 shadow-2xs focus:ring-2 focus:ring-navy-900/10 outline-hidden cursor-pointer transition-all"
              >
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Journals List Rows */}
        <div className="space-y-3.5">
          {isFeedLoading && activeTab === 'all' ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/90 rounded-[22px] p-4 sm:p-5 border border-slate-100 flex items-center gap-4"
              >
                <Skeleton className="w-16 h-16 rounded-[16px] shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3.5 w-32" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              </div>
            ))
          ) : isMyLoading && activeTab === 'my' ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/90 rounded-[22px] p-4 sm:p-5 border border-slate-100 flex items-center gap-4"
              >
                <Skeleton className="w-16 h-16 rounded-[16px] shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
              </div>
            ))
          ) : displayedJournals.length === 0 ? (
            <div className="bg-white/80 rounded-[24px] p-8 text-center border border-white/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-navy-950">No journals found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {activeTab === 'my'
                  ? "You haven't written any journal reflections yet. Click 'Write a Journal' to start!"
                  : 'No journals match your search filters. Try adjusting your query.'}
              </p>
              {activeTab === 'my' && (
                <button
                  type="button"
                  onClick={() => setIsWriteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B1635] text-white text-xs font-bold hover:bg-[#1B2A5E] transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Write your first journal</span>
                </button>
              )}
            </div>
          ) : (
            displayedJournals.map((journal) => {
              const meta = categoryMeta[journal.category] || categoryMeta.OTHER;
              const tags = meta.tags;
              const likes = journal.likesCount || 20 + (journal.title.length % 15);
              const comments = journal.commentsCount || 4 + (journal.title.length % 5);
              const authorName = journal.author?.name || 'Aarav';

              return (
                <div
                  key={journal.id}
                  onClick={() => router.push(`/journals/${journal.id}`)}
                  className="bg-white/95 hover:bg-white rounded-[22px] p-4 sm:p-5 border border-slate-100/90 shadow-[0_4px_20px_rgba(11,22,53,0.03)] hover:shadow-[0_8px_30px_rgba(11,22,53,0.07)] transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: Thumbnail & Content Info */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {/* Thumbnail box */}
                    <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-[16px] overflow-hidden shrink-0 shadow-xs flex items-center justify-center bg-gradient-to-br transition-transform group-hover:scale-105 duration-200">
                      {journal.imageUrl || journal.title.includes('Finding Balance') || journal.title.includes('Small Changes') || journal.title.includes('Fitness Journey') ? (
                        <div className="w-full h-full bg-[#FFF5F5] border border-slate-100/80 flex items-center justify-center p-2">
                          <img
                            src={
                              journal.imageUrl ||
                              (journal.title.includes('Fitness Journey')
                                ? '/images/fitness-journey.png'
                                : journal.title.includes('Small Changes')
                                ? '/images/small-changes.png'
                                : '/images/finding-balance.png')
                            }
                            alt={journal.title}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white relative`}
                        >
                          <span className="text-xl drop-shadow-md select-none">{meta.icon}</span>
                          <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />
                        </div>
                      )}
                    </div>

                    {/* Middle: Title, Author, Date, Hashtags */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-extrabold text-navy-950 group-hover:text-navy-900 transition-colors truncate">
                          {journal.title}
                        </h2>
                        {journal.visibility === 'PRIVATE' && (
                          <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Private</span>
                          </span>
                        )}
                      </div>

                      {/* Snippet / Author & time */}
                      <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <span>By {authorName}</span>
                        <span>·</span>
                        <span className="text-slate-400">{formatTimeAgo(journal.createdAt)}</span>
                        {journal.habit && (
                          <>
                            <span>·</span>
                            <span className="text-indigo-600 font-bold truncate max-w-[120px]">
                              {journal.habit.name}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Hashtag chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] font-bold text-sky-700 bg-sky-50/80 px-2.5 py-0.5 rounded-full border border-sky-100/60"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Stats & Chevron */}
                  <div className="flex items-center justify-end sm:justify-start gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* Likes */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <Heart className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
                      <span>{likes}</span>
                    </div>

                    {/* Comments */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <MessageCircle className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
                      <span>{comments}</span>
                    </div>

                    {/* Chevron Right */}
                    <div className="pl-1 text-slate-400 group-hover:text-navy-950 group-hover:translate-x-1 transition-all">
                      <ChevronRight className="w-5 h-5 stroke-[2.2]" />
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Infinite Scroll "Load More" for All Journals tab */}
          {activeTab === 'all' && hasMoreFeed && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={loadMoreFeed}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/90 hover:bg-white text-navy-950 font-bold text-xs sm:text-sm border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
                    <span>Loading more journals...</span>
                  </>
                ) : (
                  <>
                    <span>Load more journals</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Write a Journal */}
      {isWriteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/45 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsWriteModalOpen(false)}
        >
          <div
            className="bg-white rounded-[26px] max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-navy-950 tracking-tight">Write a Journal</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Capture insights and build reflective momentum.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsWriteModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTitle.trim()) {
                  showErrorToast('Please enter a title', 'Validation Error');
                  return;
                }
                if (!newBody.trim()) {
                  showErrorToast('Please write your journal reflection', 'Validation Error');
                  return;
                }
                createJournalMutation.mutate({
                  title: newTitle.trim(),
                  body: newBody.trim(),
                  habitId: newHabitId || undefined,
                  visibility: newVisibility,
                  category: newCategory,
                });
              }}
              className="space-y-4"
            >
              {/* Title */}
              <div>
                <label htmlFor="journal-title" className="block text-xs font-bold text-navy-950 mb-1.5">
                  Title *
                </label>
                <input
                  id="journal-title"
                  type="text"
                  required
                  maxLength={200}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Finding Balance in My Routine"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-navy-950 placeholder:text-slate-400 focus:bg-white focus:border-navy-900 focus:ring-2 focus:ring-navy-900/10 outline-hidden transition-all"
                />
              </div>

              {/* Body */}
              <div>
                <label htmlFor="journal-body" className="block text-xs font-bold text-navy-950 mb-1.5">
                  Reflection / Body *
                </label>
                <textarea
                  id="journal-body"
                  rows={5}
                  required
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="What worked today? What challenges or breakthroughs did you experience?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-navy-950 placeholder:text-slate-400 focus:bg-white focus:border-navy-900 focus:ring-2 focus:ring-navy-900/10 outline-hidden transition-all resize-none"
                />
              </div>

              {/* Optional Habit & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="journal-habit" className="block text-xs font-bold text-navy-950 mb-1.5">
                    Link Habit (Optional)
                  </label>
                  <select
                    id="journal-habit"
                    value={newHabitId}
                    onChange={(e) => handleHabitChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-navy-950 focus:bg-white focus:border-navy-900 outline-hidden transition-all"
                  >
                    <option value="">None / General Journal</option>
                    {habitsData?.habits?.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="journal-cat" className="block text-xs font-bold text-navy-950 mb-1.5">
                    Category
                  </label>
                  <select
                    id="journal-cat"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-navy-950 focus:bg-white focus:border-navy-900 outline-hidden transition-all"
                  >
                    <option value="FITNESS">Fitness & Workout</option>
                    <option value="MINDFULNESS">Mindfulness & Meditation</option>
                    <option value="PRODUCTIVITY">Productivity & Focus</option>
                    <option value="LEARNING">Reading & Learning</option>
                    <option value="HEALTH">Health & Nutrition</option>
                    <option value="OTHER">Other / General</option>
                  </select>
                </div>
              </div>

              {/* Visibility Toggle */}
              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1.5">
                  Visibility
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewVisibility('PUBLIC')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${newVisibility === 'PUBLIC'
                        ? 'bg-[#0B1635] text-white border-[#0B1635] shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Public (Feed)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewVisibility('PRIVATE')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${newVisibility === 'PRIVATE'
                        ? 'bg-[#0B1635] text-white border-[#0B1635] shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Private (Only you)</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWriteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-navy-950 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createJournalMutation.isPending || !newTitle.trim() || !newBody.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#0B1635] hover:bg-[#1B2A5E] text-white text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {createJournalMutation.isPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Publish Journal</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
