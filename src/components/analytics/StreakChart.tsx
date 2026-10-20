'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  YAxis,
  XAxis,
} from 'recharts';
import { ArrowDown, Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

interface StreakDataPoint {
  date: string;
  streak: number;
}

interface StreakChartProps {
  currentStreak: number;
  longestStreak: number;
  dataSeries?: StreakDataPoint[];
  isLoading?: boolean;
}

const DEFAULT_STREAK_SERIES: StreakDataPoint[] = [
  { date: 'Day 1', streak: 1 },
  { date: 'Day 2', streak: 1 },
  { date: 'Day 3', streak: 1.8 },
  { date: 'Day 4', streak: 1.3 },
  { date: 'Day 5', streak: 2.0 },
  { date: 'Day 6', streak: 3.8 },
  { date: 'Day 7', streak: 2.0 },
  { date: 'Day 8', streak: 2.4 },
  { date: 'Day 9', streak: 4.1 },
  { date: 'Day 10', streak: 3.1 },
  { date: 'Day 11', streak: 4.3 },
  { date: 'Day 12', streak: 3.7 },
  { date: 'Day 13', streak: 7 },
];

export function StreakChart({
  currentStreak = 7,
  longestStreak = 21,
  dataSeries = DEFAULT_STREAK_SERIES,
  isLoading = false,
}: StreakChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-[24px] p-6 sm:p-7 border border-slate-100 shadow-[0_4px_24px_rgba(15,30,72,0.04)] h-full flex flex-col justify-between">
        <Skeleton className="h-5 w-36 rounded-lg" />
        <div className="flex items-center gap-8 py-2">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  const series = dataSeries && dataSeries.length > 0 ? dataSeries : DEFAULT_STREAK_SERIES;

  return (
    <div className="bg-white rounded-[24px] p-6 sm:p-7 border border-slate-100 shadow-[0_4px_24px_rgba(15,30,72,0.04)] h-full flex flex-col justify-between transition-all duration-200 hover:shadow-[0_8px_30px_rgba(15,30,72,0.06)]">
      <h2 className="text-base font-extrabold text-[#0B1635] tracking-tight mb-2">
        Streak Overview
      </h2>

      {/* Stats Header Row */}
      <div className="flex items-center gap-6 sm:gap-10 pb-2">
        {/* Current Streak */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#2563EB] shrink-0">
            <ArrowDown className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#0B1635] leading-none tracking-tight">
              {currentStreak}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-1">
              Current Streak
            </div>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="h-8 w-px bg-slate-200/80" aria-hidden="true" />

        {/* Longest Streak */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#2563EB] shrink-0">
            <Trophy className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#0B1635] leading-none tracking-tight">
              {longestStreak}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-1">
              Longest Streak
            </div>
          </div>
        </div>
      </div>

      {/* Teal Area / Line Chart of Streak Over Time */}
      <div
        className="w-full h-24 sm:h-26 -mb-2 mt-2"
        role="img"
        aria-label={`Streak progression chart: current ${currentStreak} days, longest ${longestStreak} days`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 8, right: 6, left: 6, bottom: 2 }}>
            <defs>
              <linearGradient id="tealStreakGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0D9488" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#0D9488" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={['dataMin - 0.5', 'dataMax + 0.8']} />
            <XAxis hide dataKey="date" />
            <Tooltip
              formatter={(val: any) => [`${val} days`, 'Streak']}
              labelFormatter={(l: any) => String(l)}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(15, 30, 72, 0.1)',
                border: '1px solid #E2E8F0',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0B1635',
              }}
            />
            <Area
              type="linear"
              dataKey="streak"
              stroke="#0D9488"
              strokeWidth={2.2}
              fillOpacity={1}
              fill="url(#tealStreakGradient)"
              dot={{ r: 2.5, fill: '#0D9488', stroke: '#0D9488', strokeWidth: 1 }}
              activeDot={{ r: 4.5, fill: '#0D9488', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
