'use client';

import React from 'react';
import { Moon, Laptop, Smile, Apple, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

export interface TriggerItemConfig {
  key: string;
  label: string;
  percentage: number;
  barColor: string;
  badgeBg: string;
  icon: React.ReactNode;
}

const DEFAULT_TRIGGER_ITEMS: TriggerItemConfig[] = [
  {
    key: 'sleep',
    label: 'Sleep',
    percentage: 78,
    barColor: 'bg-[#0D9488]', // Teal
    badgeBg: 'bg-orange-100/90 text-orange-600',
    icon: <Moon className="w-3 h-3 text-orange-500 fill-orange-500" />,
  },
  {
    key: 'screen_time',
    label: 'Screen Time',
    percentage: 64,
    barColor: 'bg-[#F97316]', // Orange
    badgeBg: 'bg-emerald-100/90 text-emerald-600',
    icon: <Laptop className="w-3 h-3 text-emerald-600" />,
  },
  {
    key: 'stress',
    label: 'Stress',
    percentage: 42,
    barColor: 'bg-[#FB923C]', // Amber-Orange
    badgeBg: 'bg-blue-100/90 text-blue-600',
    icon: <Smile className="w-3 h-3 text-blue-600" />,
  },
  {
    key: 'nutrition',
    label: 'Nutrition',
    percentage: 36,
    barColor: 'bg-[#F87171]', // Coral/Red
    badgeBg: 'bg-purple-100/90 text-purple-600',
    icon: <Apple className="w-3 h-3 text-purple-600" />,
  },
  {
    key: 'productivity',
    label: 'Productivity',
    percentage: 77,
    barColor: 'bg-[#2563EB]', // Royal Blue
    badgeBg: 'bg-violet-100/90 text-violet-600',
    icon: <Zap className="w-3 h-3 text-violet-600 fill-violet-600" />,
  },
];

interface TriggerPointsListProps {
  triggers?: Array<{
    key: string;
    label: string;
    percentage: number;
  }>;
  isLoading?: boolean;
}

export function TriggerPointsList({
  triggers,
  isLoading = false,
}: TriggerPointsListProps) {
  // Merge server triggers if available with styled configs, or use default configs
  const displayItems = React.useMemo(() => {
    if (!triggers || triggers.length === 0) {
      return DEFAULT_TRIGGER_ITEMS;
    }

    const colorPalette = [
      { barColor: 'bg-[#0D9488]', badgeBg: 'bg-orange-100/90 text-orange-600', icon: <Moon className="w-3 h-3 text-orange-500 fill-orange-500" /> },
      { barColor: 'bg-[#F97316]', badgeBg: 'bg-emerald-100/90 text-emerald-600', icon: <Laptop className="w-3 h-3 text-emerald-600" /> },
      { barColor: 'bg-[#FB923C]', badgeBg: 'bg-blue-100/90 text-blue-600', icon: <Smile className="w-3 h-3 text-blue-600" /> },
      { barColor: 'bg-[#F87171]', badgeBg: 'bg-purple-100/90 text-purple-600', icon: <Apple className="w-3 h-3 text-purple-600" /> },
      { barColor: 'bg-[#2563EB]', badgeBg: 'bg-violet-100/90 text-violet-600', icon: <Zap className="w-3 h-3 text-violet-600 fill-violet-600" /> },
    ];

    return triggers.slice(0, 5).map((t, idx) => {
      const fallback = colorPalette[idx % colorPalette.length];
      return {
        key: t.key || `trigger-${idx}`,
        label: t.label,
        percentage: Math.min(100, Math.max(0, Math.round(t.percentage))),
        barColor: fallback.barColor,
        badgeBg: fallback.badgeBg,
        icon: fallback.icon,
      };
    });
  }, [triggers]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-[24px] p-6 sm:p-7 border border-slate-100 shadow-[0_4px_24px_rgba(15,30,72,0.04)] h-full flex flex-col justify-between">
        <Skeleton className="h-5 w-32 rounded-lg mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="w-24 h-4 rounded-md" />
              <Skeleton className="flex-1 h-3 rounded-full" />
              <Skeleton className="w-8 h-4 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[24px] p-6 sm:p-7 border border-slate-100 shadow-[0_4px_24px_rgba(15,30,72,0.04)] h-full flex flex-col justify-between transition-all duration-200 hover:shadow-[0_8px_30px_rgba(15,30,72,0.06)]">
      <h2 className="text-base font-extrabold text-[#0B1635] tracking-tight mb-4">
        Trigger Points
      </h2>

      {displayItems.length === 0 ? (
        <div className="py-8 text-center text-xs font-semibold text-slate-400">
          No trigger points recorded yet.
        </div>
      ) : (
        <div className="space-y-3.5 sm:space-y-4">
          {displayItems.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 text-xs sm:text-sm"
            >
              {/* Icon & Label */}
              <div className="flex items-center gap-2.5 w-28 sm:w-32 shrink-0 min-w-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.badgeBg}`}
                >
                  {item.icon}
                </span>
                <span className="font-bold text-[#0B1635] truncate text-xs sm:text-[13px]">
                  {item.label}
                </span>
              </div>

              {/* Thick Rounded Progress Bar */}
              <div
                className="flex-1 bg-slate-100 h-2.5 sm:h-3 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={item.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.label} trigger: ${item.percentage}%`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${item.barColor}`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>

              {/* Percentage */}
              <span className="font-extrabold text-slate-600 text-xs sm:text-[13px] w-9 text-right shrink-0">
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
