'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Snowflake,
  TrendingUp,
  ShieldCheck,
  Plane,
  HeartPulse,
  GraduationCap,
  Users,
  Briefcase,
  Moon,
  AlertCircle,
  X,
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export type HeatmapStatus = 'kept' | 'frozen' | 'missed' | 'not_scheduled';

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  status: HeatmapStatus;
  freezeReason?: string;
  freezeNote?: string;
  note?: string;
  isLargeBlock?: boolean;
}

export interface HistoryHeatmapProps {
  days?: HeatmapDay[];
  habitId?: string;
  habitName?: string;
  userName?: string;
  title?: string;
  scheduledDaysOfWeek?: number[];
  className?: string;
  isLoading?: boolean;
  onToggleToday?: () => void;
  isCompletedToday?: boolean;
}

// Preset Freeze Reasons & Badges
const FREEZE_REASON_META: Record<
  string,
  { label: string; bg: string; text: string; icon: React.ReactNode }
> = {
  Sick: {
    label: 'Sick',
    bg: 'bg-rose-100 dark:bg-rose-950/60',
    text: 'text-rose-700 dark:text-rose-300',
    icon: <HeartPulse className="w-3.5 h-3.5" />,
  },
  Travel: {
    label: 'Travel',
    bg: 'bg-blue-100 dark:bg-blue-950/60',
    text: 'text-blue-700 dark:text-blue-300',
    icon: <Plane className="w-3.5 h-3.5" />,
  },
  Exams: {
    label: 'Exams',
    bg: 'bg-amber-100 dark:bg-amber-950/60',
    text: 'text-amber-700 dark:text-amber-300',
    icon: <GraduationCap className="w-3.5 h-3.5" />,
  },
  'Family event': {
    label: 'Family event',
    bg: 'bg-purple-100 dark:bg-purple-950/60',
    text: 'text-purple-700 dark:text-purple-300',
    icon: <Users className="w-3.5 h-3.5" />,
  },
  Work: {
    label: 'Work emergency',
    bg: 'bg-indigo-100 dark:bg-indigo-950/60',
    text: 'text-indigo-700 dark:text-indigo-300',
    icon: <Briefcase className="w-3.5 h-3.5" />,
  },
  'Poor sleep': {
    label: 'Poor sleep',
    bg: 'bg-sky-100 dark:bg-sky-950/60',
    text: 'text-sky-700 dark:text-sky-300',
    icon: <Moon className="w-3.5 h-3.5" />,
  },
  Forgot: {
    label: 'Forgot',
    bg: 'bg-amber-100 dark:bg-amber-950/60',
    text: 'text-amber-700 dark:text-amber-300',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  Stress: {
    label: 'High stress',
    bg: 'bg-violet-100 dark:bg-violet-950/60',
    text: 'text-violet-700 dark:text-violet-300',
    icon: <HeartPulse className="w-3.5 h-3.5" />,
  },
  Other: {
    label: 'Other',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
  },
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Generate dummy heatmap data matching the reference mockup layout and habit streak metrics
export function generateMockHeatmapData(
  weeksCount: number = 52,
  scheduledDaysOfWeek?: number[],
  seedString: string = 'habit',
  currentStreak: number = 7,
  longestStreak: number = 14,
  startDateStr: string = '2026-06-01'
): HeatmapDay[] {
  const result: HeatmapDay[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayStr = now.toISOString().slice(0, 10);

  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31);

  // Best streak window in September (Sep 4 to Sep 17 for 14 days)
  const bestDays = Math.max(1, longestStreak);
  const bestStart = new Date(now.getFullYear(), 8, 4);
  const bestEnd = new Date(bestStart);
  bestEnd.setDate(bestStart.getDate() + bestDays - 1);
  const bestStartStr = bestStart.toISOString().slice(0, 10);
  const bestEndStr = bestEnd.toISOString().slice(0, 10);

  // Current streak window leading up to today
  const curDays = Math.max(0, currentStreak);
  const curStart = new Date(now);
  curStart.setDate(now.getDate() - curDays + 1);
  const curStartStr = curStart.toISOString().slice(0, 10);

  for (let d = new Date(startOfYear); d <= endOfYear; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);

    // 1. Future dates
    if (d > now) {
      result.push({
        date: dateStr,
        status: 'not_scheduled',
        note: 'Future scheduled date.',
      });
      continue;
    }

    // 2. Before habit start date (Jan - May)
    if (startDateStr && dateStr < startDateStr) {
      result.push({
        date: dateStr,
        status: 'not_scheduled',
        note: 'Habit not started yet (started June 1, 2026).',
      });
      continue;
    }

    // 3. Current active streak window ending today
    if (curDays > 0 && dateStr >= curStartStr && dateStr <= todayStr) {
      result.push({
        date: dateStr,
        status: 'kept',
        note: dateStr === todayStr ? 'Completed today! +10 XP' : 'Completed scheduled habit session.',
      });
      continue;
    }

    // 4. Days immediately preceding the current streak (missed days that reset previous streak)
    const daysBeforeCur = Math.round((curStart.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (daysBeforeCur >= 1 && daysBeforeCur <= 2) {
      result.push({
        date: dateStr,
        status: 'missed',
        note: 'Goal not met. Missed session is eligible for Streak Freeze restore!',
      });
      continue;
    }

    // 5. Personal Best streak window in September (Sep 4 to Sep 17 = 14 days)
    if (dateStr >= bestStartStr && dateStr <= bestEndStr) {
      result.push({
        date: dateStr,
        status: 'kept',
        note: `Part of personal best ${longestStreak}-day streak!`,
      });
      continue;
    }

    const daysBeforeBest = Math.round((bestStart.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    const daysAfterBest = Math.round((d.getTime() - bestEnd.getTime()) / (1000 * 60 * 60 * 24));
    if (daysBeforeBest === 1 || daysAfterBest === 1) {
      result.push({
        date: dateStr,
        status: 'missed',
        note: 'Goal not met. Rest day / streak reset.',
      });
      continue;
    }

    // 6. Streak Freeze event in July (July 15)
    if (d.getMonth() === 6 && d.getDate() === 15) {
      result.push({
        date: dateStr,
        status: 'frozen',
        freezeReason: 'Travel',
        freezeNote: 'Cross-country flight without reading access. Protected by Streak Freeze.',
      });
      continue;
    }

    // 7. General active cadence (June to early October): 2-3 day runs
    const hash = (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) % 100;
    if (hash < 48) {
      result.push({
        date: dateStr,
        status: 'kept',
        note: 'Completed scheduled habit session.',
      });
    } else if (hash < 76) {
      result.push({
        date: dateStr,
        status: 'missed',
        note: 'Goal not met.',
      });
    } else {
      result.push({
        date: dateStr,
        status: 'not_scheduled',
        note: 'Rest day / off-schedule.',
      });
    }
  }

  return result;
}

export function HistoryHeatmap({
  days: userDays,
  habitId,
  habitName = 'Daily Habit',
  userName = 'Riya',
  title,
  scheduledDaysOfWeek,
  className = '',
  isLoading = false,
  onToggleToday,
  isCompletedToday,
}: HistoryHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);

  // Generate or derive days synced with habit
  const allDays = useMemo(() => {
    if (userDays && userDays.length > 0) {
      return userDays;
    }
    return generateMockHeatmapData(52, scheduledDaysOfWeek, habitId || habitName || 'habit', 7, 14, '2026-06-01');
  }, [userDays, scheduledDaysOfWeek, habitId, habitName]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todayDay = useMemo(() => {
    return allDays.find((d) => d.date === todayStr);
  }, [allDays, todayStr]);

  const habitScore = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const cutoffStr = thirtyDaysAgo.toISOString().slice(0, 10);

    const recentDays = allDays.filter(
      (d) => d.date >= cutoffStr && d.date <= todayStr && d.status !== 'not_scheduled'
    );

    let weightedKept = 0;
    let totalScheduledWeight = 0;
    const lambda = 0.05;

    recentDays.forEach((d, idx) => {
      const weight = Math.exp(lambda * idx);
      if (d.status === 'kept') {
        weightedKept += weight;
        totalScheduledWeight += weight;
      } else if (d.status === 'missed') {
        totalScheduledWeight += weight;
      }
    });

    if (totalScheduledWeight === 0) return 82;
    return Math.round((weightedKept / totalScheduledWeight) * 100);
  }, [allDays, todayStr]);

  const rowGroupsConfig = [
    { label: 'Sun', rowCount: 3 },
    { label: 'Tue', rowCount: 3 },
    { label: 'Thu', rowCount: 3 },
    { label: 'Fri', rowCount: 3 },
    { label: 'Sat', rowCount: 2 },
  ];

  const monthBlocks = useMemo(() => {
    const dayMap = new Map<string, HeatmapDay>();
    allDays.forEach((d) => dayMap.set(d.date, d));

    return MONTH_NAMES.map((mName, mIdx) => {
      // Future months: Nov (10) and Dec (11) are future placeholders
      const isFuturePlaceholder = mIdx >= 10;
      const monthNum = mIdx + 1; // 1 = Jan, ..., 10 = Oct, 11 = Nov, 12 = Dec
      const daysInMonth = new Date(2026, monthNum, 0).getDate();
      let dayOfMonth = 1;

      const groups = rowGroupsConfig.map((grp, gIdx) => {
        const isGroup4 = gIdx === 4; // Sat row group
        const rows: HeatmapDay[][] = [];

        for (let r = 0; r < grp.rowCount; r++) {
          const cols: HeatmapDay[] = [];
          for (let c = 0; c < 3; c++) {
            let day: HeatmapDay;

            if (isFuturePlaceholder && !isGroup4) {
              day = {
                date: `future-${mIdx}-${gIdx}-${r}-${c}`,
                status: 'not_scheduled',
                isLargeBlock: true,
              };
            } else if (isFuturePlaceholder && isGroup4) {
              day = {
                date: `future-${mIdx}-${gIdx}-${r}-${c}`,
                status: 'not_scheduled',
                isLargeBlock: true,
              };
            } else {
              if (dayOfMonth <= daysInMonth) {
                const dateKey = `2026-${String(monthNum).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
                day = dayMap.get(dateKey) || {
                  date: dateKey,
                  status: 'not_scheduled',
                  note: 'Not scheduled.',
                };
                dayOfMonth++;
              } else {
                day = {
                  date: `pad-${mIdx}-${gIdx}-${r}-${c}`,
                  status: 'not_scheduled',
                  note: 'Off-schedule.',
                };
              }
            }
            cols.push(day);
          }
          rows.push(cols);
        }
        return { groupLabel: grp.label, rows, isFuturePlaceholder: isFuturePlaceholder && !isGroup4 };
      });

      return { monthName: mName, groups };
    });
  }, [allDays, rowGroupsConfig]);

  const formatDayDate = (dateStr: string) => {
    try {
      if (dateStr.startsWith('future-') || dateStr.startsWith('rest-') || dateStr.startsWith('synth-')) {
        return 'Scheduled Day';
      }
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const displayTitle = title || (habitName ? `StreakKeeper: ${habitName}` : `StreakKeeper: Review & Build Plan for ${userName}`);

  return (
    <div
      className={`rounded-[28px] p-6 sm:p-8 bg-white/90 hover:bg-white backdrop-blur-md border border-white/80 shadow-[0_8px_32px_0_rgba(11,22,53,0.06)] transition-all duration-300 text-slate-800 ${className}`}
    >
      {/* ==================== CARD HEADER (Matching Reference Mockup) ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0B1635] tracking-tight">
            {displayTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Consistency history and streak freeze audit for <strong className="text-[#0B1635]">{habitName}</strong>.
          </p>
        </div>

        {/* Badges: Today's Status & 30-Day Habit Score */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {todayDay && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                todayDay.status === 'kept'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {todayDay.status === 'kept' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Today: Kept (+10 XP)</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Today: Pending</span>
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-black">{habitScore}% Habit Score</span>
          </div>
        </div>
      </div>

      {/* ==================== HEATMAP & LEGEND CONTAINER ==================== */}
      <div className="pt-6 flex flex-col xl:flex-row items-start justify-between gap-8">
        {/* LEFT / CENTER: THE HEATMAP GRID */}
        <div className="overflow-x-auto w-full max-w-full pb-2 select-none">
          <div className="inline-block min-w-[680px]">
            {/* 1. Month Labels Row along top */}
            <div className="flex items-center pl-10 sm:pl-12 gap-3 text-xs font-bold text-slate-400 mb-2.5">
              {MONTH_NAMES.map((mName, mIdx) => (
                <div key={mIdx} className="w-[50px] sm:w-[58px] text-center shrink-0">
                  {mName}
                </div>
              ))}
            </div>

            {/* 2. Grid Body: Day Labels on left + 5 Row Groups */}
            <div className="space-y-3 sm:space-y-3.5">
              {rowGroupsConfig.map((grp, gIdx) => (
                <div key={gIdx} className="flex items-center gap-2.5">
                  {/* Row Label (Sun, Tue, Thu, Thu, Sat) */}
                  <span className="w-8 sm:w-9 text-xs font-bold text-slate-400 text-right shrink-0">
                    {grp.label}
                  </span>

                  {/* Month Blocks in this Row Group */}
                  <div className="flex items-center gap-3">
                    {monthBlocks.map((mBlock, mIdx) => {
                      const grpData = mBlock.groups[gIdx];

                      // Future months (Nov, Dec, Sat) in row groups 0-3 render as large blank placeholder blocks
                      if (grpData.isFuturePlaceholder) {
                        return (
                          <div
                            key={mIdx}
                            className="w-[50px] sm:w-[58px] h-[58px] sm:h-[68px] rounded-[10px] sm:rounded-xl bg-[#F4F6FB] border border-slate-200/40 shrink-0"
                            title="Future scheduling period"
                          />
                        );
                      }

                      // Normal 3-column miniature grid of cells
                      return (
                        <div
                          key={mIdx}
                          className="w-[50px] sm:w-[58px] flex flex-col gap-1 sm:gap-1.5 shrink-0"
                        >
                          {grpData.rows.map((rowCells, rIdx) => (
                            <div key={rIdx} className="flex items-center gap-1 sm:gap-1.5 justify-center">
                              {rowCells.map((cell, cIdx) => {
                                const isFrozen = cell.status === 'frozen';
                                const isKept = cell.status === 'kept';
                                const isMissed = cell.status === 'missed';
                                const isSelected = selectedDay?.date === cell.date;
                                const isToday = cell.date === todayStr;

                                return (
                                  <button
                                    key={cIdx}
                                    type="button"
                                    onClick={() => setSelectedDay(cell)}
                                    title={`${formatDayDate(cell.date)}${isToday ? ' (Today)' : ''} · ${
                                      isKept ? 'Kept (+10 XP)' : isFrozen ? 'Frozen' : isMissed ? 'Missed' : 'Scheduled'
                                    }`}
                                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] sm:rounded-[5px] flex items-center justify-center transition-all duration-150 cursor-pointer relative ${
                                      isSelected
                                        ? 'ring-2 ring-[#0B1635] scale-125 z-20 shadow-md'
                                        : isToday
                                        ? 'ring-2 ring-emerald-500 scale-110 z-10 shadow-xs'
                                        : ''
                                    } ${
                                      isKept
                                        ? isToday
                                          ? 'bg-emerald-400 hover:brightness-95 hover:scale-115 shadow-[0_0_8px_rgba(16,185,129,0.45)]'
                                          : 'bg-[#85E0D5] hover:brightness-95 hover:scale-110 shadow-2xs'
                                        : isFrozen
                                        ? 'bg-[#50B8AC] hover:brightness-95 hover:scale-110 shadow-2xs text-white'
                                        : isMissed
                                        ? 'bg-white border-2 border-slate-200/90 hover:border-slate-400 hover:scale-110 shadow-2xs'
                                        : isToday
                                        ? 'bg-white border-2 border-emerald-400 hover:scale-110'
                                        : 'bg-[#EEF1F7] hover:bg-slate-200/70 border border-slate-200/30'
                                    }`}
                                  >
                                    {isFrozen && (
                                      <Snowflake className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white stroke-[2.5]" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: DEDICATED VERTICAL LEGEND (Matching Reference Mockup Exactly) */}
        <div className="shrink-0 xl:w-56 space-y-4 pt-1 border-t xl:border-t-0 xl:border-l border-slate-100 xl:pl-6 w-full">
          {/* Kept */}
          <div>
            <h4 className="text-sm font-black text-[#0B1635]">Kept</h4>
            <div className="flex items-center gap-2.5 mt-1.5">
              <span className="w-5 h-5 rounded-[6px] bg-[#85E0D5] shadow-2xs shrink-0" />
              <span className="text-xs font-semibold text-slate-500">Goal achieved</span>
            </div>
          </div>

          {/* Frozen */}
          <div>
            <h4 className="text-sm font-black text-[#0B1635]">Frozen</h4>
            <div className="flex items-center gap-2.5 mt-1.5">
              <span className="w-5 h-5 rounded-[6px] bg-[#50B8AC] text-white flex items-center justify-center shadow-2xs shrink-0">
                <Snowflake className="w-3 h-3 stroke-[2.5]" />
              </span>
              <span className="text-xs font-semibold text-slate-500">Paused & restored</span>
            </div>
          </div>

          {/* Missed */}
          <div>
            <h4 className="text-sm font-black text-[#0B1635]">Missed</h4>
            <div className="flex items-center gap-2.5 mt-1.5">
              <span className="w-5 h-5 rounded-[6px] bg-white border-2 border-slate-200/90 shadow-2xs shrink-0" />
              <span className="text-xs font-semibold text-slate-500">Goal not met</span>
            </div>
          </div>

          {/* Not Scheduled */}
          <div>
            <h4 className="text-sm font-black text-[#0B1635]">Not Scheduled</h4>
            <div className="flex items-center gap-2.5 mt-1.5">
              <span className="w-5 h-5 rounded-[6px] bg-[#EEF1F7] border border-slate-200/30 shrink-0" />
              <span className="text-xs font-semibold text-slate-500">Rest day or off-plan</span>
            </div>
          </div>

          {/* Direct Restore Streak Action Tile */}
          <div className="pt-3 border-t border-slate-100">
            <Link
              href={`/restore?habitId=${habitId || 'demo-2'}`}
              className="inline-flex items-center justify-between w-full p-2.5 rounded-xl bg-blue-50/80 hover:bg-blue-100/90 border border-blue-200/80 text-blue-800 text-xs font-bold transition-all shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Snowflake className="w-3.5 h-3.5 text-blue-600 group-hover:rotate-45 transition-transform" />
                <span>Test Restore Streak</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* ==================== SELECTED DAY DETAILS POPOVER / DRAWER ==================== */}
      {selectedDay && (
        <div className="mt-6 pt-5 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
          {selectedDay.status === 'frozen' ? (
            <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200/80 shadow-xs relative flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#50B8AC] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Snowflake className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold text-[#0B1635]">
                    {formatDayDate(selectedDay.date)}
                  </span>
                  {selectedDay.freezeReason && (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        FREEZE_REASON_META[selectedDay.freezeReason]?.bg || 'bg-teal-100 text-teal-800'
                      } ${FREEZE_REASON_META[selectedDay.freezeReason]?.text || 'text-teal-800'}`}
                    >
                      {FREEZE_REASON_META[selectedDay.freezeReason]?.icon || <ShieldCheck className="w-3.5 h-3.5" />}
                      <span>{selectedDay.freezeReason}</span>
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-md border border-teal-200">
                    Streak Protected
                  </span>
                </div>
                {selectedDay.freezeNote && (
                  <p className="mt-2 text-xs text-slate-600 italic">
                    &quot;{selectedDay.freezeNote}&quot;
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-slate-400 hover:text-[#0B1635] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : selectedDay.status === 'missed' ? (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 shadow-xs flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border-2 border-slate-300 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs font-black text-sm">
                  !
                </div>
                <div>
                  <div className="text-xs font-extrabold text-[#0B1635]">
                    {formatDayDate(selectedDay.date)}: Goal not met
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    This day broke your streak. Use an available Streak Freeze to retroactively restore it!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/restore?habitId=${habitId || 'demo-2'}&date=${
                    selectedDay.date.startsWith('future-') || selectedDay.date.startsWith('rest-')
                      ? '2026-10-09'
                      : selectedDay.date
                  }`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#50B8AC] hover:bg-[#3FA095] text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  <span>Restore This Day</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="text-slate-400 hover:text-[#0B1635] p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#E6F8F5] border border-teal-200/80 flex items-center justify-between gap-3 text-xs font-bold text-teal-950 flex-wrap">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    selectedDay.status === 'kept' ? 'bg-[#10B981]' : 'bg-slate-300'
                  }`}
                />
                <span>
                  <strong>
                    {formatDayDate(selectedDay.date)}
                    {selectedDay.date === todayStr ? ' (Today)' : ''}
                  </strong>
                  :{' '}
                  {selectedDay.status === 'kept'
                    ? 'Completed on time (+10 XP) · Maintained streak'
                    : 'Scheduled for today. Check in to earn +10 XP!'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedDay.date === todayStr && onToggleToday && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleToday();
                      setSelectedDay(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{selectedDay.status === 'kept' ? 'Revert Check-in' : 'Complete Today (+10 XP)'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="text-slate-400 hover:text-[#0B1635] p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HistoryHeatmap;
