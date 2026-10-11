import React from 'react';
import { IconTile, IconTileColor } from './IconTile';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  iconColor?: IconTileColor;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon,
  iconColor = 'blue',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
  children,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 py-12 rounded-card border border-dashed border-border-soft bg-white/60 ${className}`}
    >
      {icon && (
        <div className="mb-4">
          <IconTile size="lg" color={iconColor} icon={icon} rounded="full" />
        </div>
      )}
      <h4 className="text-base font-bold text-navy-900 tracking-tight">{title}</h4>
      <p className="text-sm text-slate-500 mt-1.5 max-w-sm leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
