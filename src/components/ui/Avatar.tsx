import React from 'react';

export interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  badge?: React.ReactNode;
}

export function Avatar({ name, src, size = 'md', className = '', badge }: AvatarProps) {
  const sizeStyles = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-semibold',
    lg: 'w-12 h-12 text-base font-bold',
    xl: 'w-16 h-16 text-xl font-bold',
  }[size];

  const getInitials = (str?: string | null) => {
    if (!str) return '?';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Deterministic pastel background based on name
  const getBackgroundColor = (str?: string | null) => {
    const colors = [
      'bg-indigo-100 text-indigo-700',
      'bg-emerald-100 text-emerald-700',
      'bg-amber-100 text-amber-700',
      'bg-rose-100 text-rose-700',
      'bg-purple-100 text-purple-700',
      'bg-sky-100 text-sky-700',
    ];
    if (!str) return colors[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name ?? 'Avatar'}
          className={`${sizeStyles} rounded-full object-cover border border-border-soft shadow-subtle`}
        />
      ) : (
        <div
          className={`${sizeStyles} rounded-full flex items-center justify-center border border-border-soft/80 shadow-subtle ${getBackgroundColor(
            name
          )}`}
        >
          {getInitials(name)}
        </div>
      )}
      {badge && (
        <div className="absolute -bottom-0.5 -right-0.5">{badge}</div>
      )}
    </div>
  );
}
