'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

interface ProgressDonutProps {
  percentage: number;
  deltaPercent?: number;
  isLoading?: boolean;
}

export function ProgressDonut({
  percentage,
  deltaPercent = 12,
  isLoading = false,
}: ProgressDonutProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-[24px] p-6 sm:p-7 border border-slate-100 shadow-[0_4px_24px_rgba(15,30,72,0.04)] h-full flex flex-col justify-between">
        <Skeleton className="h-5 w-32 rounded-lg" />
        <div className="flex items-center gap-6 py-4">
          <Skeleton className="w-28 h-28 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  const validPercent = Math.min(100, Math.max(0, Math.round(percentage)));
  const data = [
    { name: 'Completed', value: validPercent },
    { name: 'Remaining', value: 100 - validPercent },
  ];

  const isPositiveDelta = deltaPercent >= 0;

  return (
    <div className="bg-white rounded-[24px] p-6 sm:p-7 border border-slate-100 shadow-[0_4px_24px_rgba(15,30,72,0.04)] h-full flex flex-col justify-between transition-all duration-200 hover:shadow-[0_8px_30px_rgba(15,30,72,0.06)]">
      <h2 className="text-base font-extrabold text-[#0B1635] tracking-tight">
        Overall Progress
      </h2>

      <div className="flex items-center gap-4 sm:gap-6 pt-3 pb-1">
        {/* Teal Donut Gauge */}
        <div
          className="relative w-32 h-32 sm:w-34 sm:h-34 shrink-0 flex items-center justify-center"
          role="img"
          aria-label={`Overall progress: ${validPercent}% habit completion rate`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                formatter={(val: any) => [`${val}%`, '']}
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
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={58}
                startAngle={90}
                endAngle={-270}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
              >
                <Cell fill="#0D9488" />
                <Cell fill="#F1F5F9" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Centered Percentage */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-2xl sm:text-[28px] font-black text-[#0B1635] tracking-tight">
              {validPercent}%
            </span>
          </div>
        </div>

        {/* Labels & Computed Delta */}
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-xs sm:text-[13px] font-semibold text-slate-500 leading-snug">
            Habit completion rate
          </p>

          <div
            className={`flex items-center gap-1.5 text-xs sm:text-[13px] font-bold mt-2.5 sm:mt-3 ${
              isPositiveDelta ? 'text-emerald-600' : 'text-rose-500'
            }`}
          >
            {isPositiveDelta ? (
              <ArrowUp className="w-3.5 h-3.5 stroke-[3] shrink-0" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 stroke-[3] shrink-0" />
            )}
            <span>
              {Math.abs(deltaPercent)}% than last week
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
