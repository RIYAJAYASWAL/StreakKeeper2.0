import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'rounded';
}

export function Skeleton({
  variant = 'rounded',
  className = '',
  ...props
}: SkeletonProps) {
  const variantStyles = {
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-btn',
  }[variant];

  return (
    <div
      className={`animate-pulse bg-slate-200/70 ${variantStyles} ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-5 rounded-card bg-white border border-border-soft shadow-card ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="rounded" className="w-10 h-10 rounded-[14px]" />
        <Skeleton variant="rounded" className="w-14 h-5 rounded-full" />
      </div>
      <Skeleton variant="rounded" className="w-24 h-8 mb-2" />
      <Skeleton variant="rounded" className="w-32 h-4" />
    </div>
  );
}

export function SkeletonRow({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 p-3 bg-white rounded-card border border-border-soft ${className}`}>
      <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="rounded" className="w-3/5 h-4" />
        <Skeleton variant="rounded" className="w-2/5 h-3" />
      </div>
    </div>
  );
}
