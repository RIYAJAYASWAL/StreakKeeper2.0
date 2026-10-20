'use client';

import { useState, useEffect, useCallback } from 'react';

export interface SharedHabit {
  id: string;
  name: string;
  category: string;
  frequencyType: string;
  subtitle: string;
  currentCount: number;
  targetCount: number;
  isCompleted: boolean;
  streakDays: number;
  dots: ('COMPLETED' | 'FROZEN' | 'NONE')[]; // Mon -> Sun
  hasRestorableMissedDay?: boolean;
}

// Get today's index in Mon-Sun (0=Mon, 1=Tue, ..., 6=Sun)
export function getTodayDotIndex(): number {
  const day = new Date().getDay(); // 0 is Sunday, 1 is Monday
  return day === 0 ? 6 : day - 1;
}

export function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Compute the 7-day Mon-Sun dots for the current week dynamically.
 * Future days in this week are always NONE (cannot be completed yet).
 * Today's dot reflects isCompletedToday.
 * Past days in this week reflect whether the streak covered them.
 */
export function computeWeeklyDots(
  isCompletedToday: boolean,
  streakDays: number
): ('COMPLETED' | 'FROZEN' | 'NONE')[] {
  const todayIdx = getTodayDotIndex();
  const dots: ('COMPLETED' | 'FROZEN' | 'NONE')[] = [
    'NONE',
    'NONE',
    'NONE',
    'NONE',
    'NONE',
    'NONE',
    'NONE',
  ];

  for (let i = 0; i < 7; i++) {
    if (i > todayIdx) {
      dots[i] = 'NONE';
    } else if (i === todayIdx) {
      dots[i] = isCompletedToday ? 'COMPLETED' : 'NONE';
    } else {
      const daysAgo = todayIdx - i;
      const pastStreakThreshold = isCompletedToday ? streakDays - 1 : streakDays;
      if (daysAgo <= pastStreakThreshold) {
        dots[i] = 'COMPLETED';
      } else {
        dots[i] = 'NONE';
      }
    }
  }

  return dots;
}

export const INITIAL_DEMO_HABITS: SharedHabit[] = [
  {
    id: 'demo-1',
    name: 'Read a book',
    category: 'LEARNING',
    frequencyType: 'DAILY',
    subtitle: 'Daily · 30 mins',
    currentCount: 1,
    targetCount: 1,
    isCompleted: true,
    streakDays: 7,
    dots: computeWeeklyDots(true, 7),
  },
  {
    id: 'demo-2',
    name: 'Workout',
    category: 'FITNESS',
    frequencyType: 'DAILY',
    subtitle: 'Daily · 45 mins',
    currentCount: 1,
    targetCount: 1,
    isCompleted: true,
    streakDays: 6,
    dots: computeWeeklyDots(true, 6),
  },
  {
    id: 'demo-3',
    name: 'Drink 2L water',
    category: 'HEALTH',
    frequencyType: 'DAILY',
    subtitle: 'Daily · 2L',
    currentCount: 0,
    targetCount: 1,
    isCompleted: false,
    streakDays: 3,
    dots: computeWeeklyDots(false, 3),
  },
  {
    id: 'demo-4',
    name: 'Meditate',
    category: 'MINDFULNESS',
    frequencyType: 'DAILY',
    subtitle: 'Daily · 10 mins',
    currentCount: 0,
    targetCount: 1,
    isCompleted: false,
    streakDays: 2,
    dots: computeWeeklyDots(false, 2),
  },
  {
    id: 'demo-5',
    name: 'Avoid junk food',
    category: 'QUIT_BAD_HABIT',
    frequencyType: 'DAILY',
    subtitle: 'Daily',
    currentCount: 0,
    targetCount: 1,
    isCompleted: false,
    streakDays: 1,
    dots: computeWeeklyDots(false, 1),
  },
];
const HABITS_STORAGE_KEY = 'streakkeeper_habits_v3';
const XP_STORAGE_KEY = 'streakkeeper_xp_v3';
const DATES_STORAGE_KEY = 'streakkeeper_dates_v3';
const EVENT_NAME = 'streakkeeper-habits-sync-v3';

export const LEVEL_THRESHOLDS = [0, 150, 350, 600, 850, 1150, 1500, 1900, 2350, 2850];

export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  let level = 1;
  while (level < LEVEL_THRESHOLDS.length && LEVEL_THRESHOLDS[level] <= xp) {
    level++;
  }
  return level;
}

export function loadStoredHabits(): SharedHabit[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_HABITS;
  try {
    const raw = localStorage.getItem(HABITS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_HABITS));
      return INITIAL_DEMO_HABITS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      let changed = false;
      const normalized = parsed.map((h: SharedHabit) => {
        const isDemo2 = h.id === 'demo-2';
        const targetCount = isDemo2 ? 1 : (h.targetCount ?? 1);
        const currentCount = isDemo2
          ? (h.isCompleted || h.currentCount >= 1 ? 1 : 0)
          : h.currentCount;
        const isCompleted = isDemo2
          ? (h.isCompleted || h.currentCount >= 1)
          : h.isCompleted;
        const streakDays = isDemo2 && h.streakDays === 5 ? 6 : h.streakDays;
        const freshDots = computeWeeklyDots(isCompleted, streakDays);

        if (
          h.targetCount !== targetCount ||
          h.currentCount !== currentCount ||
          h.isCompleted !== isCompleted ||
          h.streakDays !== streakDays ||
          JSON.stringify(h.dots) !== JSON.stringify(freshDots)
        ) {
          changed = true;
        }

        return {
          ...h,
          targetCount,
          currentCount,
          isCompleted,
          streakDays,
          dots: freshDots,
        };
      });
      if (changed) {
        localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(normalized));
      }
      return normalized;
    }
  } catch (err) {
    console.warn('Failed to parse stored habits', err);
  }
  return INITIAL_DEMO_HABITS;
}

export function loadStoredXp(): number {
  if (typeof window === 'undefined') return 450;
  try {
    const raw = localStorage.getItem(XP_STORAGE_KEY);
    if (raw !== null) {
      const val = parseInt(raw, 10);
      if (!isNaN(val)) return Math.max(0, val);
    }
    localStorage.setItem(XP_STORAGE_KEY, '450');
  } catch {}
  return 450;
}

export function loadStoredDates(): Record<string, string[]> {
  const todayStr = getTodayDateStr();
  const initial: Record<string, string[]> = {
    'demo-1': [todayStr],
  };

  if (typeof window === 'undefined') return initial;
  try {
    const raw = localStorage.getItem(DATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
    localStorage.setItem(DATES_STORAGE_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
}

export function saveState(
  habits: SharedHabit[],
  xp: number,
  dates: Record<string, string[]>
) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
    localStorage.setItem(XP_STORAGE_KEY, String(xp));
    localStorage.setItem(DATES_STORAGE_KEY, JSON.stringify(dates));

    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, {
        detail: {
          habits,
          xp,
          level: levelFromXp(xp),
          dates,
        },
      })
    );
  } catch (err) {
    console.warn('Failed to save habits state', err);
  }
}

/**
 * Hook to read and interact with synchronized habits, XP, level, and heatmap dates
 */
export function useSharedHabits() {
  const [habits, setHabits] = useState<SharedHabit[]>(INITIAL_DEMO_HABITS);
  const [xp, setXp] = useState<number>(450);
  const [completedDates, setCompletedDates] = useState<Record<string, string[]>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Initial load
    setHabits(loadStoredHabits());
    setXp(loadStoredXp());
    setCompletedDates(loadStoredDates());
    setIsLoaded(true);

    const handleSync = (e: any) => {
      if (e.detail) {
        if (e.detail.habits) setHabits(e.detail.habits);
        if (typeof e.detail.xp === 'number') setXp(e.detail.xp);
        if (e.detail.dates) setCompletedDates(e.detail.dates);
      } else {
        setHabits(loadStoredHabits());
        setXp(loadStoredXp());
        setCompletedDates(loadStoredDates());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === HABITS_STORAGE_KEY ||
        e.key === XP_STORAGE_KEY ||
        e.key === DATES_STORAGE_KEY
      ) {
        setHabits(loadStoredHabits());
        setXp(loadStoredXp());
        setCompletedDates(loadStoredDates());
      }
    };

    window.addEventListener(EVENT_NAME, handleSync);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(EVENT_NAME, handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  /**
   * Toggle completion directly (clicking the checkbox)
   * Automatically adds +10 XP and marks today in the heatmap
   */
  const toggleHabit = useCallback((habitId: string) => {
    const todayIdx = getTodayDotIndex();
    const todayStr = getTodayDateStr();

    setHabits((current) => {
      let xpDelta = 0;
      const targetHabit = current.find((h) => h.id === habitId);
      const willBeCompleted = targetHabit ? !targetHabit.isCompleted : true;
      xpDelta = willBeCompleted ? 10 : -10;

      const nextHabits = current.map((h) => {
        if (h.id !== habitId) return h;

        const newCount = willBeCompleted ? h.targetCount : 0;
        const newStreak = willBeCompleted
          ? h.streakDays + (h.isCompleted ? 0 : 1)
          : Math.max(0, h.streakDays - 1);

        const newDots = computeWeeklyDots(willBeCompleted, newStreak);

        return {
          ...h,
          isCompleted: willBeCompleted,
          currentCount: newCount,
          streakDays: newStreak,
          dots: newDots,
        };
      });

      // Update XP & completed dates
      const currentXp = loadStoredXp();
      const nextXp = Math.max(0, currentXp + xpDelta);

      const currentDates = loadStoredDates();
      const habitDates = currentDates[habitId] ? [...currentDates[habitId]] : [];
      let nextHabitDates = habitDates;
      if (willBeCompleted) {
        if (!habitDates.includes(todayStr)) {
          nextHabitDates = [...habitDates, todayStr];
        }
      } else {
        nextHabitDates = habitDates.filter((d) => d !== todayStr);
      }
      const nextDates = { ...currentDates, [habitId]: nextHabitDates };

      setXp(nextXp);
      setCompletedDates(nextDates);
      saveState(nextHabits, nextXp, nextDates);

      return nextHabits;
    });
  }, []);

  /**
   * Increment count step by step (clicking progress bar or count)
   */
  const incrementHabit = useCallback((habitId: string) => {
    const todayIdx = getTodayDotIndex();
    const todayStr = getTodayDateStr();

    setHabits((current) => {
      let xpDelta = 0;
      const targetHabit = current.find((h) => h.id === habitId);
      if (!targetHabit) return current;

      const nextCount = targetHabit.currentCount >= targetHabit.targetCount ? 0 : targetHabit.currentCount + 1;
      const willBeCompleted = nextCount >= targetHabit.targetCount;

      if (willBeCompleted && !targetHabit.isCompleted) {
        xpDelta = 10;
      } else if (!willBeCompleted && targetHabit.isCompleted) {
        xpDelta = -10;
      }

      const nextHabits = current.map((h) => {
        if (h.id !== habitId) return h;

        const newStreak = willBeCompleted && !h.isCompleted
          ? h.streakDays + 1
          : !willBeCompleted && h.isCompleted
            ? Math.max(0, h.streakDays - 1)
            : h.streakDays;

        const newDots = computeWeeklyDots(willBeCompleted, newStreak);

        return {
          ...h,
          currentCount: nextCount,
          isCompleted: willBeCompleted,
          streakDays: newStreak,
          dots: newDots,
        };
      });

      const currentXp = loadStoredXp();
      const nextXp = Math.max(0, currentXp + xpDelta);

      const currentDates = loadStoredDates();
      const habitDates = currentDates[habitId] ? [...currentDates[habitId]] : [];
      let nextHabitDates = habitDates;
      if (willBeCompleted) {
        if (!habitDates.includes(todayStr)) {
          nextHabitDates = [...habitDates, todayStr];
        }
      } else {
        nextHabitDates = habitDates.filter((d) => d !== todayStr);
      }
      const nextDates = { ...currentDates, [habitId]: nextHabitDates };

      setXp(nextXp);
      setCompletedDates(nextDates);
      saveState(nextHabits, nextXp, nextDates);

      return nextHabits;
    });
  }, []);

  const isHabitCompletedOnDate = useCallback(
    (habitId: string, dateStr: string): boolean => {
      const dates = completedDates[habitId] || [];
      return dates.includes(dateStr);
    },
    [completedDates]
  );

  const addXp = useCallback((amount: number) => {
    const currentXp = loadStoredXp();
    const nextXp = Math.max(0, currentXp + amount);
    setXp(nextXp);
    saveState(loadStoredHabits(), nextXp, loadStoredDates());
  }, []);

  // Summary computed values
  const completedToday = habits.filter((h) => h.isCompleted).length;
  const totalHabits = habits.length;
  const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;
  const maxStreak = habits.length > 0 ? Math.max(...habits.map((h) => h.streakDays)) : 7;
  const level = levelFromXp(xp);

  return {
    habits,
    isLoaded,
    toggleHabit,
    incrementHabit,
    completedToday,
    totalHabits,
    completionRate,
    maxStreak,
    xp,
    level,
    isHabitCompletedOnDate,
    addXp,
  };
}
