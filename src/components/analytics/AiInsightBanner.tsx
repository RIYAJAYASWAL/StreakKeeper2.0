'use client';

import React from 'react';
import Link from 'next/link';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

interface AiInsightBannerProps {
  insightText?: string;
  isLoading?: boolean;
}

export function AiInsightBanner({
  insightText = "You're doing great! Your habit completion rate is up by 12%. Try focusing more on nutrition to maintain your energy levels.",
  isLoading = false,
}: AiInsightBannerProps) {
  if (isLoading) {
    return (
      <div className="bg-[#F5F2FF] rounded-[24px] p-5 sm:p-6 border border-[#ECE5FD] flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Skeleton className="w-12 h-12 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-4 w-3/4 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/ai"
      className="bg-[#F5F2FF] hover:bg-[#EFEBFF] rounded-[24px] p-5 sm:p-6 border border-[#ECE5FD] flex items-center justify-between gap-4 transition-all duration-200 group cursor-pointer shadow-2xs hover:shadow-xs"
      aria-label="View AI Assistant insights"
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Lavender Icon Circle */}
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#E9E1FC] flex items-center justify-center shrink-0 shadow-2xs">
          <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-[#7C3AED]" />
        </div>

        {/* Text Content */}
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-extrabold text-[#4318FF] tracking-tight">
            AI Insight
          </h3>
          <p className="text-xs sm:text-[13px] text-slate-600 font-medium leading-relaxed mt-0.5 line-clamp-2">
            {insightText}
          </p>
        </div>
      </div>

      {/* Right Arrow */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:text-[#4318FF] transition-colors shrink-0">
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
