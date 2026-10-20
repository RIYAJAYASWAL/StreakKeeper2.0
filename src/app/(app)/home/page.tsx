'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Flame,
  Check,
  Snowflake,
  Crown,
  Moon,
  Laptop,
  Smile,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, HabitItem } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSharedHabits } from '@/lib/habitsStore';

// Level title mapping
const LEVEL_TITLES: Record<number, string> = {
  1: 'Habit Starter',
  2: 'Streak Builder',
  3: 'Habit Explorer',
  4: 'Habit Champion',
  5: 'Streak Master',
  6: 'Consistency Pro',
  7: 'Habit Veteran',
  8: 'Zen Achiever',
  9: 'Grandmaster',
  10: 'Habit Legend',
};

// Internal model for habit row in Today's Habits
interface DisplayHabit {
  id: string;
  name: string;
  currentCount: number;
  targetCount: number;
  isCompleted: boolean;
  hasRestorableMissedDay?: boolean;
}

// Fallback demo habits matching the reference screenshot exactly
const DEFAULT_DEMO_HABITS: DisplayHabit[] = [
  {
    id: 'demo-1',
    name: 'Read a book',
    currentCount: 1,
    targetCount: 1,
    isCompleted: true,
  },
  {
    id: 'demo-2',
    name: 'Workout',
    currentCount: 1,
    targetCount: 1,
    isCompleted: true,
  },
  {
    id: 'demo-3',
    name: 'Drink 2L water',
    currentCount: 0,
    targetCount: 1,
    isCompleted: false,
  },
  {
    id: 'demo-4',
    name: 'Meditate',
    currentCount: 0,
    targetCount: 1,
    isCompleted: false,
  },
  {
    id: 'demo-5',
    name: 'Avoid junk food',
    currentCount: 0,
    targetCount: 1,
    isCompleted: false,
  },
];

export default function HomePage() {
  const queryClient = useQueryClient();
  const { toast, error: showErrorToast, success: showSuccessToast } = useToast();

  /**
   * TODO: /api/dashboard/summary does not exist yet.
   * Building dashboard summary numbers and widgets from existing endpoints:
   * - /api/me (user profile, name, level, timezone, freezes)
   * - /api/habits (habits, streaks, today's schedule)
   * - /api/freezes/status (streak freeze uses, restorable missed days)
   * - /api/analytics/triggers (behavioral triggers)
   * - /api/ai/insights (latest AI recommendation)
   * Replace multi-endpoint aggregation with /api/dashboard/summary once implemented.
   */

  // 1. User Profile query
  const { data: userProfile, isLoading: isUserLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      try {
        const res = await api.me.get();
        return res.user;
      } catch {
        return null;
      }
    },
  });

  // 2. Habits query
  const { data: habitsData, isLoading: isHabitsLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      try {
        const res = await api.habits.list();
        return res.habits;
      } catch {
        return null;
      }
    },
  });

  // 3. Freezes Status query (for restorable missed days)
  const { data: freezeStatus, isLoading: isFreezeLoading } = useQuery({
    queryKey: ['freeze-status'],
    queryFn: async () => {
      try {
        const res = await api.freezes.status();
        return res;
      } catch {
        return null;
      }
    },
  });

  // 4. Analytics Triggers query
  const { data: triggersData, isLoading: isTriggersLoading } = useQuery({
    queryKey: ['triggers'],
    queryFn: async () => {
      try {
        const res = await api.analytics.getTriggers();
        return res.triggers;
      } catch {
        return null;
      }
    },
  });

  // 5. AI Insight query
  const { data: aiInsightData, isLoading: isAiLoading } = useQuery({
    queryKey: ['ai-latest'],
    queryFn: async () => {
      try {
        const res = await api.ai.getLatest();
        return res.insight;
      } catch {
        return null;
      }
    },
  });

  const isLoading = isUserLoading && isHabitsLoading;

  // Global shared habits state synchronized across the whole application
  const {
    habits: sharedHabits,
    toggleHabit: toggleSharedHabit,
    incrementHabit: incrementSharedHabit,
    completedToday: sharedCompletedToday,
    maxStreak: sharedMaxStreak,
    xp: sharedXp,
    level: sharedLevel,
  } = useSharedHabits();

  // Helper to check if a habit has restorable missed days
  const isHabitRestorable = (status: any, habitId: string): boolean => {
    if (!status) return false;
    if (Array.isArray(status.restorable)) {
      return status.restorable.some((r: any) => r.habitId === habitId);
    }
    if (Array.isArray(status.habits)) {
      return status.habits.some(
        (h: any) => h.habitId === habitId && Array.isArray(h.restorableDays) && h.restorableDays.length > 0
      );
    }
    return false;
  };

  // Combine shared habits with server restorable flags
  const displayHabits = useMemo(() => {
    return sharedHabits.map((h) => ({
      ...h,
      hasRestorableMissedDay: isHabitRestorable(freezeStatus, h.id),
    }));
  }, [sharedHabits, freezeStatus]);

  // Derived user values
  const userName = userProfile?.name ? userProfile.name.split(' ')[0] : 'Riya';
  const userTimezone = userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userLevel = sharedLevel || userProfile?.level || 4;
  const userXp = typeof sharedXp === 'number' ? sharedXp : (userProfile?.xp ?? 450);
  const levelTitle = LEVEL_TITLES[userLevel] || 'Habit Champion';

  // Greeting by user local time
  const greeting = useMemo(() => {
    try {
      const now = new Date();
      const hourStr = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hourCycle: 'h23',
        timeZone: userTimezone,
      }).format(now);
      const hour = parseInt(hourStr, 10);
      if (hour >= 5 && hour < 12) {
        return 'Good morning';
      } else if (hour >= 12 && hour < 17) {
        return 'Good afternoon';
      } else {
        return 'Good evening';
      }
    } catch {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        return 'Good morning';
      } else if (hour >= 12 && hour < 17) {
        return 'Good afternoon';
      } else {
        return 'Good evening';
      }
    }
  }, [userTimezone]);

  // Formatted date in user timezone (e.g. "Sat, 10 Oct 2026")
  const formattedDate = useMemo(() => {
    try {
      return new Date().toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: userTimezone,
      });
    } catch {
      return 'Tue, 22 Sep 2025';
    }
  }, [userTimezone]);

  // Derived summary numbers
  const maxDayStreak = useMemo(() => {
    if (habitsData && habitsData.length > 0) {
      const streaks = habitsData.map((h) => h.streak?.current ?? 0);
      const max = Math.max(...streaks);
      return max > 0 ? max : sharedMaxStreak;
    }
    return sharedMaxStreak;
  }, [habitsData, sharedMaxStreak]);

  const completedToday = sharedCompletedToday;

  // Streak Freezes used (max 3 standard - remaining)
  const freezesUsed = useMemo(() => {
    if (userProfile && typeof userProfile.freezesRemaining === 'number') {
      return Math.max(0, 3 - userProfile.freezesRemaining);
    }
    if (freezeStatus && typeof freezeStatus.freezesRemaining === 'number') {
      return Math.max(0, 3 - freezeStatus.freezesRemaining);
    }
    return 2;
  }, [userProfile, freezeStatus]);

  // Trigger points computation (from API or reference defaults)
  const triggerTiles = useMemo(() => {
    if (triggersData && triggersData.length >= 3) {
      return triggersData.slice(0, 3).map((t, idx) => {
        const level = t.percentage >= 35 || idx === 0 ? 'High' : 'Medium';
        return {
          id: t.key,
          label: t.label.replace(/\s*\(.*\)/, ''),
          level,
          iconType: idx === 0 ? 'sleep' : idx === 1 ? 'screen' : 'stress',
        };
      });
    }

    return [
      { id: 'sleep', label: 'Sleep', level: 'High', iconType: 'sleep' },
      { id: 'screen', label: 'Screen Time', level: 'Medium', iconType: 'screen' },
      { id: 'stress', label: 'Stress', level: 'Medium', iconType: 'stress' },
    ];
  }, [triggersData]);

  // AI Insight text
  const aiInsightText =
    aiInsightData?.content ||
    "You've been consistent with your reading habit! Try adding short bursts of meditation in the evening to improve your sleep.";

  // Direct toggle on checkbox click
  const handleToggleHabit = async (habitId: string) => {
    const habit = displayHabits.find((h) => h.id === habitId);
    if (!habit) return;

    const willBeCompleted = !habit.isCompleted;
    toggleSharedHabit(habitId);

    showSuccessToast(
      willBeCompleted ? 'Habit completed! +10 XP' : 'Check-in reverted',
      habit.name
    );

    // Persist XP update to backend
    try {
      await api.me.addXp({
        amount: willBeCompleted ? 10 : -10,
        habitId,
        action: willBeCompleted ? 'CHECK_IN' : 'REVERT',
      });
    } catch (err: any) {
      console.warn('Backend XP update error', err);
    }

    // Refresh user profile, habits, and heatmap
    queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    queryClient.invalidateQueries({ queryKey: ['habits'] });
    queryClient.invalidateQueries({ queryKey: ['habit-heatmap'] });
    queryClient.invalidateQueries({ queryKey: ['triggers'] });

    // If real server habit, also sync checkin
    if (!habitId.startsWith('demo-')) {
      try {
        await api.checkins.create(habitId);
      } catch (err: any) {
        console.warn('Backend checkin sync failed', err);
      }
    }
  };

  // Step-by-step progress increment (clicking progress bar or number)
  const handleIncrementHabit = async (habitId: string) => {
    const habit = displayHabits.find((h) => h.id === habitId);
    if (!habit) return;

    incrementSharedHabit(habitId);
    const nextCount = habit.currentCount >= habit.targetCount ? 0 : habit.currentCount + 1;
    const isNowComplete = nextCount >= habit.targetCount;

    showSuccessToast(
      isNowComplete
        ? `${habit.name} completed! (${nextCount}/${habit.targetCount}) +10 XP`
        : nextCount === 0
          ? `${habit.name} count reset`
          : `Logged 1 session for ${habit.name} (${nextCount}/${habit.targetCount})`,
      'Progress Updated'
    );

    if (isNowComplete && !habit.isCompleted) {
      try {
        await api.me.addXp({ amount: 10, habitId, action: 'CHECK_IN' });
      } catch (err: any) {
        console.warn('Backend XP update error', err);
      }
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit-heatmap'] });
    } else if (!isNowComplete && habit.isCompleted) {
      try {
        await api.me.addXp({ amount: -10, habitId, action: 'REVERT' });
      } catch (err: any) {
        console.warn('Backend XP update error', err);
      }
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit-heatmap'] });
    }

    if (!habitId.startsWith('demo-') && isNowComplete) {
      try {
        await api.checkins.create(habitId);
      } catch (err: any) {
        console.warn('Backend sync failed', err);
      }
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] pb-12">
      {/* Full Crisp Mountain Landscape Background (No blur) */}
      <div className="fixed inset-0 lg:left-64 pointer-events-none select-none z-0 overflow-hidden">
        <img
          src="/images/home-bg.jpg"
          alt="Home scenic landscape background"
          className="w-full h-full object-cover object-center"
        />
      </div>

      <div className="relative z-10 space-y-6 sm:space-y-7">
        {/* Header: Greeting, Subtitle, and Date */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2">
          <div>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-7 w-56 rounded-lg" />
                <Skeleton className="h-3.5 w-44 rounded-md" />
              </div>
            ) : (
              <>
                <h1 className="text-xl sm:text-2xl font-bold text-navy-900 tracking-tight drop-shadow-xs">
                  {`${greeting}, ${userName}!`}
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-800/90 mt-0.5 drop-shadow-2xs">
                  Consistency builds the life you want.
                </p>
              </>
            )}
          </div>

          {/* Date formatted in user's timezone */}
          <div className="sm:text-right shrink-0">
            {isLoading ? (
              <Skeleton className="h-5 w-28 rounded-md" />
            ) : (
              <div className="inline-block text-xs font-bold text-slate-800 tracking-wide px-3.5 py-1.5 rounded-full bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_16px_rgba(31,38,135,0.06)]">
                {formattedDate}
              </div>
            )}
          </div>
        </div>

        {/* Row of 4 StatCards with High Transparency Glassmorphism */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/35 backdrop-blur-md rounded-[22px] p-5 sm:p-6 border border-white/50 shadow-[0_8px_32px_0_rgba(15,30,72,0.05)] flex items-center gap-4"
              >
                <Skeleton className="w-11 h-11 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-6 w-12 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              </div>
            ))
          ) : (
            <>
              {/* StatCard 1: Day Streak */}
              <div className="bg-white/35 backdrop-blur-md rounded-[22px] p-5 sm:p-6 border border-white/50 shadow-[0_8px_32px_0_rgba(15,30,72,0.05)] hover:bg-white/50 hover:shadow-[0_12px_40px_0_rgba(15,30,72,0.09)] transition-all duration-300 flex items-center gap-4 group cursor-default">
                <div className="w-11 h-11 rounded-full bg-[#FFF2E8]/90 text-[#F97316] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <Flame className="w-5 h-5 fill-[#F97316]" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-navy-900 leading-none">
                    {maxDayStreak}
                  </div>
                  <div className="text-xs font-bold text-slate-700 mt-1">
                    Day Streak
                  </div>
                </div>
              </div>

              {/* StatCard 2: Habits Completed today */}
              <div className="bg-white/35 backdrop-blur-md rounded-[22px] p-5 sm:p-6 border border-white/50 shadow-[0_8px_32px_0_rgba(15,30,72,0.05)] hover:bg-white/50 hover:shadow-[0_12px_40px_0_rgba(15,30,72,0.09)] transition-all duration-300 flex items-center gap-4 group cursor-default">
                <div className="w-11 h-11 rounded-full bg-[#EAF8F0]/90 text-[#16A34A] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-navy-900 leading-none">
                    {completedToday}
                  </div>
                  <div className="text-xs font-bold text-slate-700 mt-1">
                    Habits Completed
                  </div>
                </div>
              </div>

              {/* StatCard 3: Frozen Used */}
              <div className="bg-white/35 backdrop-blur-md rounded-[22px] p-5 sm:p-6 border border-white/50 shadow-[0_8px_32px_0_rgba(15,30,72,0.05)] hover:bg-white/50 hover:shadow-[0_12px_40px_0_rgba(15,30,72,0.09)] transition-all duration-300 flex items-center gap-4 group cursor-default">
                <div className="w-11 h-11 rounded-full bg-[#EAF3FE]/90 text-[#2563EB] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <Snowflake className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-navy-900 leading-none">
                    {freezesUsed}
                  </div>
                  <div className="text-xs font-bold text-slate-700 mt-1">
                    Frozen Used
                  </div>
                </div>
              </div>

              {/* StatCard 4: Level + title + XP */}
              <div className="bg-white/35 backdrop-blur-md rounded-[22px] p-5 sm:p-6 border border-white/50 shadow-[0_8px_32px_0_rgba(15,30,72,0.05)] hover:bg-white/50 hover:shadow-[0_12px_40px_0_rgba(15,30,72,0.09)] transition-all duration-300 flex items-center gap-4 group cursor-default">
                <div className="w-11 h-11 rounded-full bg-[#F3EDFD]/90 text-[#8B5CF6] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <Crown className="w-5 h-5 fill-[#8B5CF6]/30 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-navy-900 leading-none flex items-center gap-2">
                    <span>Level {userLevel}</span>
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-100/90 px-2 py-0.5 rounded-full border border-purple-200/50">
                      {userXp} XP
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-700 mt-1">
                    {levelTitle}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Main Content Grid: Today's Habits (Left) and Your Trigger Points + AI Insight (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Card: Today's Habits with High Transparency Glassmorphism */}
          <div className="bg-white/40 backdrop-blur-md rounded-[24px] p-5 sm:p-6 border border-white/50 shadow-[0_8px_32px_0_rgba(15,30,72,0.06)] hover:shadow-[0_12px_40px_0_rgba(15,30,72,0.09)] transition-all duration-300 flex flex-col justify-between min-h-[440px]">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/50">
                <h2 className="text-base font-extrabold text-navy-950 tracking-tight">
                  Today&apos;s Habits
                </h2>
              </div>

              {/* Habit rows */}
              <div className="divide-y divide-slate-200/40">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <Skeleton className="w-5 h-5 rounded-full shrink-0" />
                        <Skeleton className="h-3.5 w-32 rounded-md" />
                      </div>
                      <Skeleton className="h-3.5 w-7 rounded-md" />
                    </div>
                  ))
                ) : (
                  displayHabits.map((habit) => {
                    const hasProgress = habit.targetCount > 1;
                    const progressPercent = Math.min(
                      100,
                      Math.round((habit.currentCount / habit.targetCount) * 100)
                    );

                    return (
                      <div
                        key={habit.id}
                        className="py-3 flex items-center justify-between gap-3 group transition-colors"
                      >
                        {/* Checkbox + Name + Progress Bar */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Round Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggleHabit(habit.id)}
                            aria-label={`Toggle habit ${habit.name}`}
                            className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center transition-all duration-150 cursor-pointer ${habit.isCompleted
                              ? 'bg-[#10B981] text-white hover:bg-[#059669] shadow-xs scale-100'
                              : 'border-2 border-slate-400/80 hover:border-[#10B981] bg-white/70'
                              }`}
                          >
                            {habit.isCompleted && (
                              <Check className="w-3 h-3 stroke-[3]" />
                            )}
                          </button>

                          {/* Habit details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-xs sm:text-sm font-bold leading-snug transition-colors ${habit.isCompleted
                                  ? 'text-navy-950'
                                  : 'text-navy-900'
                                  }`}
                              >
                                {habit.name}
                              </span>

                              {/* Restore Chip for restorable missed days */}
                              {habit.hasRestorableMissedDay && (
                                <Link
                                  href={`/restore?habitId=${habit.id}`}
                                  className="inline-flex items-center text-[10px] font-bold text-blue-700 bg-blue-100/80 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full transition-colors shadow-2xs"
                                >
                                  Restore
                                </Link>
                              )}
                            </div>

                            {/* Small progress bar for multiple count habits */}
                            {hasProgress && (
                              <button
                                type="button"
                                onClick={() => handleIncrementHabit(habit.id)}
                                title="Click to log +1 count"
                                className="mt-1 w-28 sm:w-36 h-2 rounded-full bg-slate-200/60 overflow-hidden flex cursor-pointer hover:ring-2 hover:ring-[#10B981]/30 transition-all text-left"
                              >
                                <div
                                  className="h-full bg-[#10B981] rounded-full transition-all duration-300"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Habit Counts on the right */}
                        <button
                          type="button"
                          onClick={() => (hasProgress ? handleIncrementHabit(habit.id) : handleToggleHabit(habit.id))}
                          title="Click to update progress"
                          className="text-xs font-bold text-slate-600 hover:text-navy-950 font-mono shrink-0 cursor-pointer hover:bg-slate-100/70 px-1.5 py-0.5 rounded-md transition-colors"
                        >
                          {habit.currentCount}/{habit.targetCount}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom: View all link */}
            <div className="pt-3.5 flex justify-end">
              <Link
                href="/habits"
                className="inline-flex items-center gap-1 text-xs font-bold text-navy-900/80 hover:text-navy-950 transition-colors group"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Right Column: Your Trigger Points & AI Insight with High Transparency Glassmorphism */}
          <div className="space-y-5">
            {/* Top Card: Your Trigger Points */}
            <div className="bg-white/40 backdrop-blur-md rounded-[24px] p-5 sm:p-6 border border-white/50 shadow-[0_8px_32px_0_rgba(15,30,72,0.06)] hover:shadow-[0_12px_40px_0_rgba(15,30,72,0.09)] transition-all duration-300">
              <h2 className="text-base font-extrabold text-navy-950 tracking-tight mb-4">
                Your Trigger Points
              </h2>

              {/* 3 circular icon tiles */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center py-1.5">
                {isTriggersLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <Skeleton className="w-14 h-14 sm:w-16 sm:h-16 rounded-full" />
                      <Skeleton className="h-3.5 w-14 rounded-md" />
                      <Skeleton className="h-3 w-10 rounded-md" />
                    </div>
                  ))
                ) : (
                  triggerTiles.map((tile) => {
                    const isSleep = tile.iconType === 'sleep';
                    const isScreen = tile.iconType === 'screen';

                    const auraStyle = isSleep
                      ? 'bg-gradient-to-br from-blue-100/80 via-blue-50/50 to-transparent'
                      : isScreen
                        ? 'bg-gradient-to-br from-emerald-100/80 via-emerald-50/50 to-transparent'
                        : 'bg-gradient-to-br from-purple-100/80 via-purple-50/50 to-transparent';

                    const iconBg = isSleep
                      ? 'bg-blue-500/15 text-blue-700'
                      : isScreen
                        ? 'bg-emerald-500/15 text-emerald-700'
                        : 'bg-purple-500/15 text-purple-700';

                    const levelColor =
                      tile.level.toLowerCase() === 'high'
                        ? 'text-blue-600'
                        : 'text-amber-600';

                    return (
                      <div key={tile.id} className="flex flex-col items-center group">
                        {/* Outer ambient aura */}
                        <div
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center p-2 transition-transform group-hover:scale-105 duration-200 ${auraStyle}`}
                        >
                          {/* Inner Circle Tile */}
                          <div
                            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shadow-xs bg-white/80 ${iconBg}`}
                          >
                            {isSleep && <Moon className="w-4.5 h-4.5 fill-current" />}
                            {isScreen && <Laptop className="w-4.5 h-4.5 stroke-[2.2]" />}
                            {!isSleep && !isScreen && (
                              <Smile className="w-4.5 h-4.5 stroke-[2.2]" />
                            )}
                          </div>
                        </div>

                        {/* Label & Level */}
                        <div className="mt-2">
                          <div className="text-xs font-bold text-navy-950 leading-snug">
                            {tile.label}
                          </div>
                          <div
                            className={`text-[10px] sm:text-[11px] font-bold mt-0.5 ${levelColor}`}
                          >
                            ({tile.level})
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Lavender AI Insight Card with High Transparency Glassmorphism */}
            <div className="rounded-[22px] p-5 bg-[#F5EEFE]/50 hover:bg-[#F5EEFE]/65 backdrop-blur-md border border-purple-200/50 shadow-[0_8px_32px_0_rgba(139,92,246,0.06)] hover:shadow-[0_12px_40px_0_rgba(139,92,246,0.10)] transition-all duration-300 relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Lightbulb className="w-4.5 h-4.5 fill-purple-100 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-purple-950">AI Insight</div>
                  {isAiLoading ? (
                    <div className="mt-1.5 space-y-1">
                      <Skeleton className="h-3.5 w-full rounded-md bg-purple-200/50" />
                      <Skeleton className="h-3.5 w-4/5 rounded-md bg-purple-200/50" />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-800 font-medium leading-relaxed mt-1">
                      {aiInsightText}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
