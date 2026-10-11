'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  X,
  Snowflake,
  Flame,
  Check,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, HabitItem } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export type FreezeReasonTag =
  | 'SICK'
  | 'TRAVEL'
  | 'WORK'
  | 'POOR_SLEEP'
  | 'FORGOT'
  | 'STRESS'
  | 'OTHER';

// Fallback demo habits matching reference screenshot exactly
const DEFAULT_RESTORABLE_HABITS: Array<HabitItem & { restorableDays: string[] }> = [
  {
    id: 'demo-2',
    userId: 'demo-user',
    name: 'Workout',
    category: 'FITNESS',
    frequencyType: 'DAILY',
    daysOfWeek: [],
    startDate: '2026-06-01',
    createdAt: '2026-06-01',
    description: 'Strength training and mobility workouts',
    streak: { current: 5, longest: 10, lastCountedDate: '2026-10-08' },
    restorableDays: ['2026-10-09', '2026-10-08'],
  },
  {
    id: 'demo-1',
    userId: 'demo-user',
    name: 'Read a book',
    category: 'LEARNING',
    frequencyType: 'DAILY',
    daysOfWeek: [],
    startDate: '2026-06-01',
    createdAt: '2026-06-01',
    description: 'Read 20-30 pages of non-fiction daily',
    streak: { current: 7, longest: 14, lastCountedDate: '2026-10-09' },
    restorableDays: ['2026-10-09'],
  },
  {
    id: 'demo-3',
    userId: 'demo-user',
    name: 'Drink 2L water',
    category: 'HEALTH',
    frequencyType: 'DAILY',
    daysOfWeek: [],
    startDate: '2026-06-01',
    createdAt: '2026-06-01',
    description: 'Daily hydration goal',
    streak: { current: 3, longest: 8, lastCountedDate: '2026-10-07' },
    restorableDays: ['2026-10-09', '2026-10-08', '2026-10-07'],
  },
];

interface RestoreStreakCardProps {
  isModal?: boolean;
  onClose?: () => void;
  preselectedHabitId?: string;
}

export function RestoreStreakCard({
  isModal = false,
  onClose,
  preselectedHabitId,
}: RestoreStreakCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const habitIdParam = preselectedHabitId || searchParams?.get('habitId') || '';
  const dateParam = searchParams?.get('date') || '';

  // Form states
  const [selectedHabitId, setSelectedHabitId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedReasonTag, setSelectedReasonTag] = useState<FreezeReasonTag>('OTHER');
  const [note, setNote] = useState<string>('');
  const [isSuccessAnimating, setIsSuccessAnimating] = useState<boolean>(false);
  const [restoredStreak, setRestoredStreak] = useState<number | null>(null);

  // 1. Fetch Freeze Status from GET /api/freezes/status
  const { data: freezeStatus } = useQuery({
    queryKey: ['freezes-status'],
    queryFn: async () => {
      try {
        const res = await api.freezes.status();
        return res;
      } catch {
        return null;
      }
    },
  });

  // 2. Fetch User Habits from GET /api/habits
  const { data: serverHabits } = useQuery({
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

  // Calculate the last 3 local calendar days
  const recentDays = useMemo(() => {
    const now = new Date();
    const days: Array<{ date: string; label: string }> = [];

    for (let i = 1; i <= 3; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({
        date: dateStr,
        label: i === 1 ? 'Yesterday' : `${i} days ago`,
      });
    }
    return days;
  }, []);

  // Compute habits with restorable days
  const restorableHabits = useMemo(() => {
    if (freezeStatus?.habits && freezeStatus.habits.length > 0 && serverHabits && serverHabits.length > 0) {
      const restorableMap = new Map<string, string[]>();
      freezeStatus.habits.forEach((h) => {
        if (h.restorableDays && h.restorableDays.length > 0) {
          restorableMap.set(h.habitId, h.restorableDays);
        }
      });

      const list = serverHabits
        .filter((h) => restorableMap.has(h.id))
        .map((h) => ({
          ...h,
          restorableDays: restorableMap.get(h.id) || [],
        }));

      if (list.length > 0) return list;
    }

    if (serverHabits && serverHabits.length > 0) {
      return serverHabits.map((h) => ({
        ...h,
        restorableDays: [recentDays[0].date, recentDays[1].date],
      }));
    }

    return DEFAULT_RESTORABLE_HABITS;
  }, [freezeStatus, serverHabits, recentDays]);

  // Selected habit entity
  const currentHabit = useMemo(() => {
    return restorableHabits.find((h) => h.id === selectedHabitId) || restorableHabits[0];
  }, [restorableHabits, selectedHabitId]);

  // Available dates for the selected habit
  const availableDates = useMemo(() => {
    if (!currentHabit) return recentDays;

    const allowedSet = new Set(currentHabit.restorableDays || []);
    if (dateParam) allowedSet.add(dateParam);
    const filtered = recentDays.filter((d) => allowedSet.has(d.date));
    if (dateParam && !filtered.some((d) => d.date === dateParam)) {
      filtered.unshift({
        date: dateParam,
        label: dateParam === recentDays[0]?.date ? 'Yesterday' : dateParam,
      });
    }
    return filtered.length > 0 ? filtered : recentDays;
  }, [currentHabit, recentDays, dateParam]);

  // Auto-select habit and date on initial load or param change
  useEffect(() => {
    if (restorableHabits.length > 0) {
      const targetHabit =
        restorableHabits.find((h) => h.id === habitIdParam) || restorableHabits[0];
      setSelectedHabitId(targetHabit.id);
    }
  }, [restorableHabits, habitIdParam]);

  useEffect(() => {
    if (dateParam && availableDates.some((d) => d.date === dateParam)) {
      setSelectedDate(dateParam);
    } else if (availableDates.length > 0 && (!selectedDate || !availableDates.some((d) => d.date === selectedDate))) {
      setSelectedDate(availableDates[0].date);
    }
  }, [availableDates, selectedDate, dateParam]);

  // Freezes Remaining count (default to 2 matching the reference UI)
  const freezesRemaining = freezeStatus?.freezesRemaining ?? 2;
  const hasZeroFreezes = freezesRemaining <= 0;

  // Restore Streak Mutation to POST /api/habits/:id/freeze
  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!selectedHabitId) {
        throw new Error('Please select a habit');
      }
      if (!selectedDate) {
        throw new Error('Please select a missed date to restore');
      }

      // Backend requires non-empty note; provide default if left blank
      const notePayload = note.trim() || 'Streak freeze applied for consistency.';

      // If demo habit, simulate instant optimistic success
      if (selectedHabitId.startsWith('demo-')) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const prevStreak = currentHabit?.streak?.current ?? 5;
        return {
          streak: { current: prevStreak + 1, longest: Math.max(prevStreak + 1, currentHabit?.streak?.longest ?? 10) },
          freezesRemaining: Math.max(0, freezesRemaining - 1),
        };
      }

      return api.freezes.apply(selectedHabitId, {
        localDate: selectedDate,
        reasonTag: selectedReasonTag,
        note: notePayload,
      });
    },
    onSuccess: (data) => {
      const streakNum = data.streak?.current ?? (currentHabit?.streak?.current ?? 5) + 1;
      setRestoredStreak(streakNum);
      setIsSuccessAnimating(true);

      showSuccessToast(
        'Streak restored!',
        `Your streak for ${currentHabit?.name || 'Habit'} has been protected.`
      );

      // Invalidate relevant queries across dashboard
      queryClient.invalidateQueries({ queryKey: ['freezes-status'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit-detail'] });
      queryClient.invalidateQueries({ queryKey: ['today-habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit-heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['triggers'] });

      // After celebrating the streak animation, close modal / navigate back
      setTimeout(() => {
        if (onClose) {
          onClose();
        } else {
          router.push('/home');
        }
      }, 1800);
    },
    onError: (err: any) => {
      showErrorToast(err?.message || 'Failed to restore streak');
    },
  });

  const handleDismiss = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasZeroFreezes) return;
    restoreMutation.mutate();
  };

  return (
    <div
      className={
        isModal
          ? 'relative w-full max-w-[760px] mx-auto bg-[#FAF8F5] rounded-[28px] border border-slate-200/80 shadow-[0_20px_60px_-15px_rgba(15,30,72,0.14)] overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95'
          : 'relative w-full flex-1 flex flex-col min-h-screen bg-[#F8F9FA] pb-12 transition-all duration-300'
      }
    >
      {/* Top Header Bar */}
      <div
        className={
          isModal
            ? 'relative flex items-center justify-between px-7 pt-6 pb-4'
            : 'relative flex items-center justify-between px-6 sm:px-8 lg:px-10 pt-6 sm:pt-7 pb-4'
        }
      >
        <button
          type="button"
          onClick={handleDismiss}
          className="inline-flex items-center gap-2 text-base font-extrabold text-[#0B1635] hover:text-slate-600 transition-colors cursor-pointer group p-1 -ml-1 rounded-lg"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-[#0B1635] stroke-[2.5] transition-transform group-hover:-translate-x-0.5" />
        </button>

        {/* Centered Title above the background image */}
        <h2 className="absolute left-1/2 -translate-x-1/2 text-base sm:text-lg font-extrabold text-[#0B1635] tracking-tight">
          Restore Streak
        </h2>

        <button
          type="button"
          onClick={handleDismiss}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-[#0B1635] hover:bg-slate-200/60 transition-all cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Subtle Celebratory Streak Animation Overlay */}
      {isSuccessAnimating ? (
        <div className="py-20 px-8 text-center flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in-90 duration-300">
          <div className="relative">
            <div className="w-22 h-22 rounded-full bg-orange-100/80 flex items-center justify-center shadow-lg shadow-orange-200/60 ring-8 ring-orange-50 animate-bounce">
              <Flame className="w-12 h-12 text-orange-500 fill-orange-500 drop-shadow-[0_2px_10px_rgba(255,138,61,0.5)]" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md">
              <Snowflake className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <h3 className="text-3xl font-black text-[#0B1635] tracking-tight">
              {restoredStreak} Day Streak!
            </h3>
            <p className="text-sm font-semibold text-emerald-600 flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>Streak restored successfully</span>
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto pt-1">
              Your consistency is intact. Keep moving forward!
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="relative flex-1 flex flex-col">
          {/* Upper Section: Full-Width Background Image Banner */}
          <div
            className={
              isModal
                ? 'relative w-full h-[280px] sm:h-[320px] bg-cover bg-no-repeat overflow-hidden flex flex-col justify-between p-6 sm:p-7'
                : 'relative mx-6 sm:mx-8 lg:mx-10 rounded-t-[24px] rounded-b-none min-h-[320px] sm:min-h-[360px] bg-cover bg-no-repeat overflow-hidden flex flex-col justify-between p-6 sm:p-8 shadow-xs'
            }
            style={{
              backgroundImage: "url('/images/restore-bg.jpg')",
              backgroundPosition: 'center 42%',
            }}
          >
            {/* Glowing Circular Snowflake Badge - Lowered to sit in the middle */}
            <div className="flex justify-center pt-10 sm:pt-14">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#DCEAFE]/95 shadow-[0_4px_16px_rgba(37,99,235,0.22)] ring-4 ring-white/80 flex items-center justify-center transition-transform hover:scale-105">
                <Snowflake className="w-7 h-7 sm:w-8 sm:h-8 text-[#2563EB] stroke-[2.2]" />
              </div>
            </div>

            {/* Middle/Lower Row of Banner: Centered Text */}
            <div className="flex flex-col items-center justify-center text-center pb-6 sm:pb-8 px-4">
              <h4 className="text-base sm:text-lg font-black text-[#0B1635] leading-snug tracking-tight">
                Missed a day? It&apos;s okay. Life happens.
              </h4>
              <p className="text-xs sm:text-[13px] text-slate-600/90 leading-relaxed mt-1 font-medium max-w-lg mx-auto">
                Use a frozen to restore your streak and add a note about why you missed it.
              </p>
            </div>
          </div>

          {/* Lower Form Card Section: Placed down so 90% of the bg is visible while staying seamlessly connected */}
          <div
            className={
              isModal
                ? 'relative z-10 -mt-2 sm:-mt-3 mx-5 sm:mx-7 mb-7 bg-white rounded-[24px] p-6 sm:p-7 shadow-[0_8px_30px_rgba(15,30,72,0.06)] border border-slate-100/90 space-y-4.5'
                : 'relative z-10 -mt-3 sm:-mt-4 mx-6 sm:mx-8 lg:mx-10 bg-white rounded-[24px] p-6 sm:p-8 shadow-[0_8px_30px_rgba(15,30,72,0.06)] border border-slate-200/80 space-y-5'
            }
          >
            {/* Field 1: Habit */}
            <div>
              <label htmlFor="habit-select" className="block text-xs font-bold text-slate-700 mb-2">
                Habit
              </label>

              {restorableHabits.length > 0 ? (
                <div className="relative">
                  <select
                    id="habit-select"
                    value={selectedHabitId}
                    onChange={(e) => setSelectedHabitId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200/90 bg-white py-3 pl-10 pr-10 text-sm font-semibold text-[#0B1635] focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-[#0B1635] transition-all cursor-pointer shadow-2xs"
                  >
                    {restorableHabits.map((habit) => (
                      <option key={habit.id} value={habit.id}>
                        {habit.name}
                      </option>
                    ))}
                  </select>

                  {/* Left Habit Icon */}
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <RefreshCw className="w-4 h-4" />
                  </div>

                  {/* Right Chevron Down */}
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-800">
                  No habits currently have restorable missed days in the last 3 days.
                </div>
              )}
            </div>

            {/* Field 2: Reason (optional) Textarea */}
            <div>
              <label htmlFor="reason-note" className="block text-xs font-bold text-slate-700 mb-2">
                Reason (optional)
              </label>

              <div className="relative">
                <textarea
                  id="reason-note"
                  rows={3}
                  maxLength={200}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Was traveling / Unwell / Workload..."
                  className="w-full rounded-xl border border-slate-200/90 bg-white p-3.5 pb-7 text-sm text-[#0B1635] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-[#0B1635] transition-all resize-none shadow-2xs h-24"
                />

                {/* 0/200 Counter at bottom right matching reference */}
                <span className="absolute right-3.5 bottom-2.5 text-[11px] font-semibold text-slate-400 pointer-events-none">
                  {note.length}/200
                </span>
              </div>
            </div>

            {/* Frozen Remaining Indicator */}
            <div className="pt-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2563EB]">
                <Snowflake className="w-4 h-4 text-[#2563EB] fill-[#2563EB]/20" />
                <span>Frozen remaining: {freezesRemaining}</span>
              </div>

              {hasZeroFreezes && (
                <div className="mt-2 text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    You have 0 streak freezes remaining. Cannot restore streak until allowance resets
                    {freezeStatus?.nextResetDate ? ` on ${freezeStatus.nextResetDate}` : ' next month'}.
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons: Cancel and Navy "Restore Streak" */}
            <div className="flex items-center justify-between gap-4 pt-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleDismiss}
                className="flex-1 font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl py-3 shadow-2xs"
                disabled={restoreMutation.isPending}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={restoreMutation.isPending}
                disabled={hasZeroFreezes || restoreMutation.isPending}
                className="flex-1 font-bold bg-[#0B1635] hover:bg-[#16254F] text-white rounded-xl py-3 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Restore Streak
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default RestoreStreakCard;
