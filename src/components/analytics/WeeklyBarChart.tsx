'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';

export interface DayCompletion {
  day: string;
  rate: number;
}

interface WeeklyBarChartProps {
  data?: DayCompletion[];
  isLoading?: boolean;
}

const DEFAULT_WEEKLY_DATA: DayCompletion[] = [
  { day: 'Mon', rate: 70 },
  { day: 'Tue', rate: 70 },
  { day: 'Wed', rate: 60 },
  { day: 'Thu', rate: 50 },
  { day: 'Fri', rate: 55 },
  { day: 'Sat', rate: 65 },
  { day: 'Sun', rate: 62 },
];

export function WeeklyBarChart({
  data = DEFAULT_WEEKLY_DATA,
  isLoading = false,
}: WeeklyBarChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-[24px] p-6 sm:p-7 border border-slate-100 shadow-[0_4px_24px_rgba(15,30,72,0.04)] h-full flex flex-col justify-between">
        <Skeleton className="h-5 w-44 rounded-lg mb-4" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    );
  }

  const chartData = data && data.length > 0 ? data : DEFAULT_WEEKLY_DATA;

  return (
    <div className="bg-white rounded-[24px] p-6 sm:p-7 border border-slate-100 shadow-[0_4px_24px_rgba(15,30,72,0.04)] h-full flex flex-col justify-between transition-all duration-200 hover:shadow-[0_8px_30px_rgba(15,30,72,0.06)]">
      <h2 className="text-base font-extrabold text-[#0B1635] tracking-tight mb-2">
        Weekly Habit Completion
      </h2>

      <div
        className="w-full h-44 sm:h-48 pt-2"
        role="img"
        aria-label="Weekly habit completion chart showing Monday through Sunday percentages"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 10, left: -20, bottom: 0 }}
            barCategoryGap={16}
          >
            <YAxis
              ticks={[0, 50, 100]}
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }}
              tickFormatter={(v) => (v === 0 ? '0%' : `${v}%`)}
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
            />
            <Tooltip
              formatter={(val: any) => [`${val}%`, 'Completion Rate']}
              labelFormatter={(l: any) => `${l}`}
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
            <Bar
              dataKey="rate"
              fill="#0D9488"
              radius={[6, 6, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
