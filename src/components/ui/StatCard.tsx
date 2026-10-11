import React from 'react';
import { Card } from './Card';
import { IconTile, IconTileColor } from './IconTile';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor: IconTileColor;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: 'positive' | 'neutral' | 'accent';
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  iconColor,
  subtitle,
  badge,
  className = '',
}: StatCardProps) {
  const badgeStyles = {
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    accent: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  }[badge?.variant ?? 'neutral'];

  return (
    <Card hover className={`p-5 flex flex-col justify-between ${className}`}>
      <div className="flex items-start justify-between">
        <IconTile color={iconColor} icon={icon} />
        {badge && (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeStyles}`}
          >
            {badge.text}
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="text-3xl font-extrabold tracking-tight text-navy-900">
          {value}
        </div>
        <div className="text-sm font-medium text-slate-500 mt-1">{title}</div>
        {subtitle && (
          <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>
        )}
      </div>
    </Card>
  );
}
