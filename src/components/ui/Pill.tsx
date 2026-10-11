import React from 'react';

export interface PillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  count?: number | string;
}

export function Pill({
  selected = false,
  size = 'md',
  icon,
  count,
  className = '',
  children,
  onClick,
  ...props
}: PillProps) {
  const isInteractive = Boolean(onClick);

  const sizeStyles = {
    sm: 'text-xs px-3 py-1 gap-1.5',
    md: 'text-sm px-4 py-1.5 gap-2',
  }[size];

  const stateStyles = selected
    ? 'bg-navy-900 text-white shadow-sm border border-navy-900'
    : 'bg-white text-slate-700 border border-border-soft hover:border-slate-300 hover:bg-cream-50 shadow-subtle';

  return (
    <button
      type={isInteractive ? 'button' : undefined}
      onClick={onClick}
      disabled={!isInteractive}
      className={`inline-flex items-center justify-center font-medium rounded-pill transition-all duration-150 ${
        isInteractive ? 'cursor-pointer active:scale-95' : 'cursor-default'
      } ${sizeStyles} ${stateStyles} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
            selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
