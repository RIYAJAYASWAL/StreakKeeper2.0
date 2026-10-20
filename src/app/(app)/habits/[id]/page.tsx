'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Flame,
  Trophy,
  Calendar,
  Archive,
  Edit2,
  CheckCircle2,
  Snowflake,
  AlertTriangle,
  Clock,
  Trash2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, HabitItem, HabitCategory, FrequencyType } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  getCategoryConfig,
  HistoryHeatmap,
  generateMockHeatmapData,
  HeatmapDay,
  HeatmapStatus,
} from '@/components/habits';
import { useSharedHabits, getTodayDateStr } from '@/lib/habitsStore';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Fallback demo habits dictionary ensuring distinct profiles per habit
const DEMO_HABIT_DETAILS: Record<string, HabitItem & { subtitle?: string }> = {
  'demo-1': {
    id: 'demo-1',
    userId: 'demo-user',
    name: 'Read a book',
    category: 'LEARNING',
    frequencyType: 'DAILY',
    daysOfWeek: [],
    startDate: '2026-06-01',
    createdAt: '2026-06-01',
    description: 'Read 20-30 pages of non-fiction or educational literature daily.',
    streak: {
      current: 7,
      longest: 14,
      lastCountedDate: '2026-10-09',
    },
  },
  'demo-2': {
    id: 'demo-2',
    userId: 'demo-user',
    name: 'Workout',
    category: 'FITNESS',
    frequencyType: 'DAILY',
    daysOfWeek: [],
    startDate: '2026-06-01',
    createdAt: '2026-06-01',
    description: 'Strength training, cardio, or mobility work for at least 45 minutes.',
    streak: {
      current: 5,
      longest: 10,
      lastCountedDate: '2026-10-08',
    },
  },
  'demo-3': {
    id: 'demo-3',
    userId: 'demo-user',
    name: 'Drink 2L water',
    category: 'HEALTH',
    frequencyType: 'DAILY',
    daysOfWeek: [],
    startDate: '2026-06-01',
    createdAt: '2026-06-01',
    description: 'Hydrate consistently throughout the day to reach 2 liters.',
    streak: {
      current: 3,
      longest: 8,
      lastCountedDate: '2026-10-07',
    },
  },
  'demo-4': {
    id: 'demo-4',
    userId: 'demo-user',
    name: 'Meditate',
    category: 'MINDFULNESS',
    frequencyType: 'DAILY',
    daysOfWeek: [],
    startDate: '2026-06-01',
    createdAt: '2026-06-01',
    description: '10 minutes of guided mindfulness breathing and morning calm.',
    streak: {
      current: 2,
      longest: 5,
      lastCountedDate: '2026-10-06',
    },
  },
  'demo-5': {
    id: 'demo-5',
    userId: 'demo-user',
    name: 'Avoid junk food',
    category: 'QUIT_BAD_HABIT',
    frequencyType: 'DAILY',
    daysOfWeek: [],
    startDate: '2026-06-01',
    createdAt: '2026-06-01',
    description: 'Cut out processed snacks, sugar bombs, and late-night junk food.',
    streak: {
      current: 1,
      longest: 3,
      lastCountedDate: '2026-10-05',
    },
  },
};

export default function HabitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  const habitId = String(params?.id ?? '');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  // Synchronized shared habits state across the app
  const {
    habits: sharedHabits,
    toggleHabit: toggleSharedHabit,
    isHabitCompletedOnDate,
  } = useSharedHabits();

  const sharedHabit = sharedHabits.find((h) => h.id === habitId);
  const todayStr = getTodayDateStr();
  const isCompletedToday = sharedHabit
    ? sharedHabit.isCompleted
    : isHabitCompletedOnDate(habitId, todayStr);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'HEALTH' as HabitCategory,
    description: '',
    targetPerPeriod: 3,
    daysOfWeek: [1, 2, 3, 4, 5],
    intervalDays: 2,
  });

  // 1. Fetch Habit Details
  const { data: habit, isLoading: isHabitLoading } = useQuery({
    queryKey: ['habit-detail', habitId],
    queryFn: async () => {
      // If it's a known demo habit ID, provide tailored demo data
      if (DEMO_HABIT_DETAILS[habitId]) {
        return DEMO_HABIT_DETAILS[habitId];
      }
      if (habitId.startsWith('demo-')) {
        return {
          id: habitId,
          name: 'Custom Demo Habit',
          category: 'LEARNING' as HabitCategory,
          frequencyType: 'DAILY' as FrequencyType,
          startDate: '2026-06-01',
          createdAt: '2026-06-01',
          description: 'Focus on personal growth and deep consistency.',
          streak: {
            current: 4,
            longest: 10,
            lastCountedDate: '2026-10-09',
          },
        } as HabitItem;
      }

      try {
        const res = await api.habits.get(habitId);
        return res.habit;
      } catch {
        return null;
      }
    },
  });

  // 2. Fetch 52-Week Heatmap for this specific habit from backend
  const { data: heatmapData, isLoading: isHeatmapLoading } = useQuery({
    queryKey: ['habit-heatmap', habitId],
    queryFn: async () => {
      if (habitId.startsWith('demo-')) {
        return null;
      }
      try {
        const res = await api.analytics.getHeatmap(52, habitId);
        return res;
      } catch {
        return null;
      }
    },
    enabled: !habitId.startsWith('demo-'),
  });

  // Populate edit form on habit load
  React.useEffect(() => {
    if (habit) {
      setEditForm({
        name: habit.name,
        category: habit.category,
        description: habit.description || '',
        targetPerPeriod: habit.targetPerPeriod || 3,
        daysOfWeek: habit.daysOfWeek || [1, 2, 3, 4, 5],
        intervalDays: habit.intervalDays || 2,
      });
    }
  }, [habit]);

  // Update Habit Mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (habitId.startsWith('demo-')) {
        return { habit: { ...habit, ...editForm } as HabitItem };
      }

      const payload: any = {
        name: editForm.name.trim(),
        category: editForm.category,
        description: editForm.description.trim() || null,
      };

      if (habit?.frequencyType === 'WEEKLY') {
        payload.targetPerPeriod = Number(editForm.targetPerPeriod);
      } else if (habit?.frequencyType === 'CUSTOM') {
        if (habit.intervalDays) {
          payload.intervalDays = Number(editForm.intervalDays);
        } else {
          payload.daysOfWeek = editForm.daysOfWeek;
        }
      }

      return api.habits.update(habitId, payload);
    },
    onSuccess: (data) => {
      showSuccessToast('Habit updated successfully', data.habit?.name);
      queryClient.invalidateQueries({ queryKey: ['habit-detail', habitId] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setIsEditModalOpen(false);
    },
    onError: (err: any) => {
      showErrorToast(err?.message || 'Failed to update habit');
    },
  });

  // Archive Habit Mutation
  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (habitId.startsWith('demo-')) {
        return { success: true };
      }
      return api.habits.archive(habitId);
    },
    onSuccess: () => {
      showSuccessToast('Habit archived', 'Removed from active dashboard');
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setIsArchiveModalOpen(false);
      router.push('/habits');
    },
    onError: (err: any) => {
      showErrorToast(err?.message || 'Failed to archive habit');
    },
  });

  // Prepare Heatmap Days synced with actual habit data
  const heatmapDays = useMemo<HeatmapDay[]>(() => {
    const curStreak = habit?.streak?.current ?? 7;
    const bestStreak = habit?.streak?.longest ?? 14;
    const startStr = habit?.startDate ? String(habit.startDate).slice(0, 10) : '2026-06-01';

    if (habitId.startsWith('demo-') || !heatmapData?.days || heatmapData.days.length === 0) {
      return generateMockHeatmapData(
        52,
        habit?.frequencyType === 'CUSTOM' ? habit?.daysOfWeek : undefined,
        habitId,
        curStreak,
        bestStreak,
        startStr
      );
    }

    return heatmapData.days.map((d) => {
      let status: HeatmapStatus = 'not_scheduled';
      if (d.status === 'COMPLETED') status = 'kept';
      else if (d.status === 'FROZEN') status = 'frozen';
      else if (d.status === 'MISSED') status = 'missed';
      else status = 'not_scheduled';

      return {
        date: d.date,
        status,
        freezeReason: d.freezeReason,
        freezeNote: d.freezeNote,
        note: d.note,
      };
    });
  }, [habitId, heatmapData, habit]);

  const config = getCategoryConfig(habit?.category || 'HEALTH');

  if (isHabitLoading) {
    return (
      <div className="space-y-6 pb-12 animate-in fade-in duration-200">
        <Skeleton className="h-6 w-32 rounded-md" />
        <div className="bg-white rounded-[22px] p-6 border border-slate-100 flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-[22px]" />
      </div>
    );
  }

  if (!habit) {
    return (
      <div className="p-12 text-center bg-white rounded-[22px] border border-slate-200">
        <h3 className="text-lg font-bold text-navy-900">Habit not found</h3>
        <p className="text-sm text-slate-500 mt-1">This habit may have been deleted or archived.</p>
        <Link href="/habits">
          <Button variant="primary" size="sm" className="mt-4 bg-navy-900 text-white">
            Back to Habits
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Back Nav & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/habits"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-navy-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Habits</span>
        </Link>

        {/* Action Buttons: Edit & Archive */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
          >
            Edit Habit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsArchiveModalOpen(true)}
            leftIcon={<Archive className="w-3.5 h-3.5" />}
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            Archive
          </Button>
        </div>
      </div>

      {/* Habit Overview Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-[22px] p-6 border border-slate-100 shadow-[0_4px_24px_-2px_rgba(15,30,72,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left Details */}
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0 shadow-xs ${config.bgClass}`}
            >
              {React.cloneElement(config.icon, { className: 'w-7 h-7' })}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-navy-900 tracking-tight">
                  {habit.name}
                </h1>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {config.label}
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                  {habit.frequencyType}
                </span>
              </div>
              {habit.description && (
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
                  {habit.description}
                </p>
              )}
            </div>
          </div>

          {/* Right Streak Stats */}
          <div className="flex items-center gap-4 self-start md:self-auto shrink-0">
            {/* Current Streak */}
            <div className="p-3.5 px-5 rounded-2xl bg-[#FFF2E8]/80 border border-orange-100 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-orange-600">
                <Flame className="w-4 h-4 fill-orange-500" />
                <span>Current</span>
              </div>
              <div className="text-2xl font-extrabold text-navy-900 mt-0.5">
                {habit.streak?.current ?? 0}
                <span className="text-xs font-semibold text-slate-400 ml-1">days</span>
              </div>
            </div>

            {/* Longest Streak */}
            <div className="p-3.5 px-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600">
                <Trophy className="w-4 h-4" />
                <span>Best</span>
              </div>
              <div className="text-2xl font-extrabold text-navy-900 mt-0.5">
                {habit.streak?.longest ?? 0}
                <span className="text-xs font-semibold text-slate-400 ml-1">days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive History Heatmap (26w/52w, Streak Freeze Details, Habit Score) */}
      <HistoryHeatmap
        days={heatmapDays}
        habitId={habit.id}
        habitName={habit.name}
        scheduledDaysOfWeek={habit.frequencyType === 'CUSTOM' ? habit.daysOfWeek : undefined}
        isLoading={isHeatmapLoading}
      />

      {/* Edit Habit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Habit"
        description="Update habit name, category, or notes."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => updateMutation.mutate()}
              isLoading={updateMutation.isPending}
              className="bg-navy-900 text-white hover:bg-navy-800"
            >
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Habit Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />

          <Select
            label="Category"
            value={editForm.category}
            onChange={(e) =>
              setEditForm({ ...editForm, category: e.target.value as HabitCategory })
            }
            options={[
              { value: 'HEALTH', label: 'Health' },
              { value: 'FITNESS', label: 'Fitness' },
              { value: 'LEARNING', label: 'Learning' },
              { value: 'MINDFULNESS', label: 'Mindfulness' },
              { value: 'PRODUCTIVITY', label: 'Productivity' },
              { value: 'QUIT_BAD_HABIT', label: 'Quit Bad Habit' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />

          {habit.frequencyType === 'WEEKLY' && (
            <Input
              label="Days per week (1 - 7)"
              type="number"
              min={1}
              max={7}
              value={editForm.targetPerPeriod}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  targetPerPeriod: parseInt(e.target.value, 10) || 1,
                })
              }
            />
          )}

          <Textarea
            label="Description"
            rows={3}
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />
        </div>
      </Modal>

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title="Archive Habit"
        description="Are you sure you want to archive this habit?"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsArchiveModalOpen(false)}
              disabled={archiveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => archiveMutation.mutate()}
              isLoading={archiveMutation.isPending}
            >
              Archive Habit
            </Button>
          </>
        }
      >
        <div className="p-3 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            Archiving will stop reminders and remove this habit from your active daily schedule. Your streak history and check-ins will be preserved.
          </p>
        </div>
      </Modal>
    </div>
  );
}
