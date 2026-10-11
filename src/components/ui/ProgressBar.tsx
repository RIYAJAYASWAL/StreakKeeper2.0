import React from 'react';

export type ProgressColor = 'navy' | 'teal' | 'orange' | 'blue' | 'purple' | 'green';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  color?: ProgressColor;
  height?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  color = 'teal',
  height = 'md',
  showLabel = false,
  label,
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const heightStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }[height];

  const colorStyles: Record<ProgressColor, string> = {
    navy: 'bg-navy-900',
    teal: 'bg-[#1BA39C]',
    orange: 'bg-brand-orange',
    blue: 'bg-brand-blue',
    purple: 'bg-brand-purple',
    green: 'bg-emerald-500',
  };

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center text-xs font-semibold mb-1.5 text-slate-600">
          <span>{label}</span>
          {showLabel && <span>{percentage}%</span>}
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightStyles}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colorStyles[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
