'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  ChevronRight,
  BookOpen,
  Dumbbell,
  Droplets,
  Smile,
  Ban,
  Target,
  Calendar,
  Flame,
  CheckCircle2,
  Snowflake,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, HabitItem, HabitCategory, FrequencyType } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { getCategoryConfig } from '@/components/habits';
import { useSharedHabits } from '@/lib/habitsStore';

// Fallback demo habits matching the reference screenshot exactly
const DEFAULT_DEMO_HABITS: Array<HabitItem & { subtitle: string; streakDays: number; dots: ('COMPLETED' | 'FROZEN' | 'NONE')[] }> = [
  {
    id: 'demo-1',
    userId: 'u1',
    name: 'Read a book',
    category: 'LEARNING',
    frequencyType: 'DAILY',
    daysOfWeek: [],
    startDate: '2026-09-01',
    createdAt: '2026-09-01',
    subtitle: 'Daily · 30 mins',
    streakDays: 7,
    dots: ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'NONE', 'NONE'],
  },
  {
    id: 'demo-2',
    userId: 'u1',
    name: 'Workout',
    category: 'FITNESS',
    frequencyType: 'DAILY',
    daysOfWeek: [],
    startDate: '2026-09-01',
    createdAt: '2026-09-01',
    subtitle: 'Daily · 45 mins',
    streakDays: 5,
    dots: ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'NONE', 'NONE', 'NONE'],
  },
  {
    id: 'demo-3',
    userId: 'u1',
    name: 'Drink 2L water',
    category: 'HEALTH',
    frequencyType: 'DAILY',
    daysOfWeek: [],
    startDate: '2026-09-01',
    createdAt: '2026-09-01',
    subtitle: 'Daily · 2L',
    streakDays: 3,
    dots: ['COMPLETED', 'COMPLETED', 'COMPLETED', 'NONE', 'NONE', 'NONE', 'NONE'],
  },
  {
    id: 'demo-4',
    userId: 'u1',
    name: 'Meditate',
    category: 'MINDFULNESS',
    frequencyType: 'DAILY',
    daysOfWeek: [],
    startDate: '2026-09-01',
    createdAt: '2026-09-01',
    subtitle: 'Daily · 10 mins',
    streakDays: 2,
    dots: ['COMPLETED', 'COMPLETED', 'NONE', 'NONE', 'NONE', 'NONE', 'NONE'],
  },
  {
    id: 'demo-5',
    userId: 'u1',
    name: 'Avoid junk food',
    category: 'QUIT_BAD_HABIT',
    frequencyType: 'DAILY',
    daysOfWeek: [],
    startDate: '2026-09-01',
    createdAt: '2026-09-01',
    subtitle: 'Daily',
    streakDays: 1,
    dots: ['COMPLETED', 'NONE', 'NONE', 'NONE', 'NONE', 'NONE', 'NONE'],
  },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HabitsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  const [filter, setFilter] = useState<'ALL' | 'DAILY' | 'WEEKLY' | 'CUSTOM'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { habits: sharedHabits } = useSharedHabits();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'HEALTH' as HabitCategory,
    frequencyType: 'DAILY' as FrequencyType,
    targetPerPeriod: 3,
    customMode: 'DAYS' as 'DAYS' | 'INTERVAL',
    daysOfWeek: [1, 2, 3, 4, 5] as number[], // default Mon-Fri
    intervalDays: 2,
    startDate: new Date().toISOString().slice(0, 10),
    description: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 1. Fetch habits list
  const { data: serverHabits, isLoading } = useQuery({
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

  // Calculate current week date range (Mon - Sun)
  const currentWeekRange = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }

    return {
      from: monday.toISOString().slice(0, 10),
      to: sunday.toISOString().slice(0, 10),
      dates,
    };
  }, []);

  // Filtered habits list
  const displayedHabits = useMemo(() => {
    const list = serverHabits && serverHabits.length > 0 ? serverHabits : sharedHabits;

    return list.filter((h: any) => {
      if (filter === 'ALL') return true;
      return h.frequencyType === filter;
    });
  }, [serverHabits, sharedHabits, filter]);

  // Handle Form Validation matching backend rules
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Habit name is required';
    } else if (formData.name.length > 100) {
      errors.name = 'Name must be at most 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description must be at most 500 characters';
    }

    if (formData.frequencyType === 'WEEKLY') {
      if (formData.targetPerPeriod < 1 || formData.targetPerPeriod > 7) {
        errors.targetPerPeriod = 'Weekly target must be between 1 and 7 days';
      }
    } else if (formData.frequencyType === 'CUSTOM') {
      if (formData.customMode === 'DAYS') {
        if (!formData.daysOfWeek || formData.daysOfWeek.length === 0) {
          errors.daysOfWeek = 'Please select at least one day of the week';
        }
      } else {
        if (!formData.intervalDays || formData.intervalDays < 2) {
          errors.intervalDays = 'Interval must be at least 2 days';
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create Habit Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: formData.name.trim(),
        category: formData.category,
        frequencyType: formData.frequencyType,
        description: formData.description.trim() || undefined,
        startDate: formData.startDate || undefined,
      };

      if (formData.frequencyType === 'WEEKLY') {
        payload.targetPerPeriod = Number(formData.targetPerPeriod);
      } else if (formData.frequencyType === 'CUSTOM') {
        if (formData.customMode === 'DAYS') {
          payload.daysOfWeek = formData.daysOfWeek;
        } else {
          payload.intervalDays = Number(formData.intervalDays);
        }
      }

      return api.habits.create(payload);
    },
    onSuccess: (data) => {
      showSuccessToast('Habit created successfully!', data.habit?.name);
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setIsAddModalOpen(false);
      // Reset form
      setFormData({
        name: '',
        category: 'HEALTH',
        frequencyType: 'DAILY',
        targetPerPeriod: 3,
        customMode: 'DAYS',
        daysOfWeek: [1, 2, 3, 4, 5],
        intervalDays: 2,
        startDate: new Date().toISOString().slice(0, 10),
        description: '',
      });
      setFormErrors({});
    },
    onError: (err: any) => {
      showErrorToast(err?.message || 'Failed to create habit', 'Validation Error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      createMutation.mutate();
    }
  };

  const toggleDayOfWeek = (dayNumber: number) => {
    setFormData((prev) => {
      const exists = prev.daysOfWeek.includes(dayNumber);
      const updated = exists
        ? prev.daysOfWeek.filter((d) => d !== dayNumber)
        : [...prev.daysOfWeek, dayNumber];
      return { ...prev, daysOfWeek: updated };
    });
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
            My Habits
          </h1>
        </div>

        {/* Right Header Actions: Add Habit Button */}
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-sm font-bold bg-navy-900 hover:bg-navy-800 text-white"
          >
            Add Habit
          </Button>
        </div>
      </div>

      {/* Pill Filters Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['ALL', 'DAILY', 'WEEKLY', 'CUSTOM'] as const).map((type) => {
          const isActive = filter === type;
          const label =
            type === 'ALL'
              ? 'All'
              : type === 'DAILY'
                ? 'Daily'
                : type === 'WEEKLY'
                  ? 'Weekly'
                  : 'Custom';

          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${isActive
                ? 'bg-navy-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-navy-900 hover:bg-slate-50 border border-slate-200/80'
                }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Habits List */}
      <div className="space-y-3.5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/80 rounded-[20px] p-5 border border-slate-100 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-36 rounded-md" />
            </div>
          ))
        ) : displayedHabits.length === 0 ? (
          /* Empty State */
          <div className="bg-white/80 backdrop-blur-md rounded-[22px] border border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-pastel-blue text-pastel-blue-text flex items-center justify-center mb-4 shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-navy-900">Add your first habit</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm">
              Start small, stay consistent, and unlock achievements as you build daily momentum.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="mt-5 bg-navy-900 hover:bg-navy-800 text-white"
            >
              Add Habit
            </Button>
          </div>
        ) : (
          displayedHabits.map((habit) => (
            <HabitCardItem
              key={habit.id}
              habit={habit}
              weekRange={currentWeekRange}
              onClick={() => router.push(`/habits/${habit.id}`)}
            />
          ))
        )}
      </div>

      {/* Add Habit Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Habit"
        description="Configure your habit frequency, target, and category."
        maxWidth="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              isLoading={createMutation.isPending}
              className="bg-navy-900 hover:bg-navy-800 text-white"
            >
              Create Habit
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <Input
            label="Habit Name *"
            placeholder="e.g. Read 20 pages"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
          />

          {/* Category */}
          <Select
            label="Category *"
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value as HabitCategory })
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

          {/* Frequency Type */}
          <Select
            label="Frequency Type *"
            value={formData.frequencyType}
            onChange={(e) =>
              setFormData({
                ...formData,
                frequencyType: e.target.value as FrequencyType,
              })
            }
            options={[
              { value: 'DAILY', label: 'Daily (Every day)' },
              { value: 'WEEKLY', label: 'Weekly (Target days per week)' },
              { value: 'CUSTOM', label: 'Custom (Specific days or interval)' },
            ]}
          />

          {/* Conditional Weekly Field */}
          {formData.frequencyType === 'WEEKLY' && (
            <div>
              <Input
                label="Days per week (1 - 7) *"
                type="number"
                min={1}
                max={7}
                value={formData.targetPerPeriod}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    targetPerPeriod: parseInt(e.target.value, 10) || 1,
                  })
                }
                error={formErrors.targetPerPeriod}
                helperText="How many days per calendar week do you aim to complete this?"
              />
            </div>
          )}

          {/* Conditional Custom Fields */}
          {formData.frequencyType === 'CUSTOM' && (
            <div className="space-y-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-4 text-xs font-semibold text-navy-900">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="customMode"
                    checked={formData.customMode === 'DAYS'}
                    onChange={() => setFormData({ ...formData, customMode: 'DAYS' })}
                    className="accent-navy-900"
                  />
                  <span>Specific Days of Week</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="customMode"
                    checked={formData.customMode === 'INTERVAL'}
                    onChange={() => setFormData({ ...formData, customMode: 'INTERVAL' })}
                    className="accent-navy-900"
                  />
                  <span>Interval (Every N days)</span>
                </label>
              </div>

              {formData.customMode === 'DAYS' ? (
                <div>
                  <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                    Select Days *
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[
                      { num: 1, label: 'Mon' },
                      { num: 2, label: 'Tue' },
                      { num: 3, label: 'Wed' },
                      { num: 4, label: 'Thu' },
                      { num: 5, label: 'Fri' },
                      { num: 6, label: 'Sat' },
                      { num: 0, label: 'Sun' },
                    ].map((d) => {
                      const selected = formData.daysOfWeek.includes(d.num);
                      return (
                        <button
                          key={d.num}
                          type="button"
                          onClick={() => toggleDayOfWeek(d.num)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${selected
                            ? 'bg-navy-900 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                  {formErrors.daysOfWeek && (
                    <p className="text-xs text-rose-500 mt-1">{formErrors.daysOfWeek}</p>
                  )}
                </div>
              ) : (
                <div>
                  <Input
                    label="Interval Days (at least 2) *"
                    type="number"
                    min={2}
                    value={formData.intervalDays}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        intervalDays: parseInt(e.target.value, 10) || 2,
                      })
                    }
                    error={formErrors.intervalDays}
                    helperText="e.g. 2 for every other day, 3 for every 3 days"
                  />
                </div>
              )}
            </div>
          )}

          {/* Start Date */}
          <Input
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />

          {/* Description */}
          <Textarea
            label="Description (Optional)"
            placeholder="Add details, cues, or notes for this habit..."
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            error={formErrors.description}
          />
        </form>
      </Modal>
    </div>
  );
}

// Individual Habit Card Item with 7-Day Dots
interface HabitCardItemProps {
  habit: any;
  weekRange: { from: string; to: string; dates: string[] };
  onClick: () => void;
}

function HabitCardItem({ habit, weekRange, onClick }: HabitCardItemProps) {
  const config = getCategoryConfig(habit.category);

  // Fetch checkins for this habit for the current week if real habit
  const isDemo = String(habit.id).startsWith('demo-');

  const { data: checkInsData } = useQuery({
    queryKey: ['habit-checkins', habit.id, weekRange.from, weekRange.to],
    queryFn: async () => {
      if (isDemo) return null;
      try {
        const res = await api.checkins.list(habit.id, {
          from: weekRange.from,
          to: weekRange.to,
        });
        return res.checkIns;
      } catch {
        return null;
      }
    },
    enabled: !isDemo,
  });

  // Calculate the 7 dots status: COMPLETED, FROZEN, or NONE
  const dots = useMemo(() => {
    if (habit.dots) return habit.dots;

    const checkInsMap = new Map<string, string>();
    if (checkInsData) {
      checkInsData.forEach((c) => {
        const dateStr = typeof c.localDate === 'string' ? c.localDate.slice(0, 10) : '';
        if (dateStr) checkInsMap.set(dateStr, c.status);
      });
    }

    return weekRange.dates.map((dateStr) => {
      const status = checkInsMap.get(dateStr);
      if (status === 'COMPLETED') return 'COMPLETED';
      if (status === 'FROZEN') return 'FROZEN';
      return 'NONE';
    });
  }, [habit.dots, checkInsData, weekRange.dates]);

  const streakCount = habit.streak?.current ?? habit.streakDays ?? 0;
  const subtitle =
    habit.subtitle ||
    `${habit.frequencyType === 'DAILY' ? 'Daily' : habit.frequencyType === 'WEEKLY' ? `${habit.targetPerPeriod}x / week` : 'Custom'} · ${config.label}`;

  return (
    <div
      onClick={onClick}
      className="bg-white/95 backdrop-blur-md rounded-[20px] p-4.5 sm:p-5 border border-slate-100/90 shadow-[0_4px_20px_-2px_rgba(15,30,72,0.03)] hover:shadow-md hover:border-slate-200 transition-all duration-150 flex items-center justify-between gap-4 cursor-pointer group"
    >
      {/* Left: Icon Tile + Name + Subtitle + Streak */}
      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
        {/* Category Circular Pastel Tile */}
        <div
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform ${config.bgClass}`}
        >
          {config.icon}
        </div>

        {/* Text Details */}
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-navy-900 tracking-tight truncate group-hover:text-blue-600 transition-colors">
            {habit.name}
          </h3>
          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
            {subtitle}
          </p>
          <div className="flex items-center gap-1 text-xs font-semibold text-orange-500 mt-0.5">
            <Flame className="w-3.5 h-3.5 fill-orange-500" />
            <span>{streakCount} day streak</span>
          </div>
        </div>
      </div>

      {/* Right: Mon-Sun 7 Dots + Chevron */}
      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
        {/* 7 Small Dots with Mon-Sun Headers */}
        <div className="flex items-center gap-1 sm:gap-2">
          {DAY_LABELS.map((dayLabel, idx) => {
            const dotStatus = dots[idx] ?? 'NONE';
            return (
              <div key={dayLabel} className="flex flex-col items-center gap-1.5 w-4 sm:w-5">
                <span className="text-[10px] font-medium text-slate-400 select-none">
                  {dayLabel}
                </span>
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${dotStatus === 'COMPLETED'
                    ? 'bg-[#10B981] ring-2 ring-emerald-100'
                    : dotStatus === 'FROZEN'
                      ? 'bg-[#3B82F6] ring-2 ring-blue-100'
                      : 'bg-slate-200'
                    }`}
                />
              </div>
            );
          })}
        </div>

        {/* Chevron arrow */}
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-navy-900 group-hover:translate-x-0.5 transition-all ml-1" />
      </div>
    </div>
  );
}
