import React from 'react';

export type IconTileColor = 'orange' | 'green' | 'blue' | 'purple' | 'teal';
export type IconTileSize = 'sm' | 'md' | 'lg';

export interface IconTileProps {
  color: IconTileColor;
  size?: IconTileSize;
  icon: React.ReactNode;
  className?: string;
  rounded?: 'standard' | 'full';
}

export function IconTile({
  color,
  size = 'md',
  icon,
  className = '',
  rounded = 'standard',
}: IconTileProps) {
  const colorStyles: Record<IconTileColor, string> = {
    orange: 'bg-pastel-orange text-pastel-orange-text',
    green: 'bg-pastel-green text-pastel-green-text',
    blue: 'bg-pastel-blue text-pastel-blue-text',
    purple: 'bg-pastel-purple text-pastel-purple-text',
    teal: 'bg-[#E6F7F5] text-[#1BA39C]',
  };

  const sizeStyles: Record<IconTileSize, string> = {
    sm: 'w-8 h-8 text-sm p-1.5',
    md: 'w-11 h-11 text-lg p-2.5',
    lg: 'w-14 h-14 text-2xl p-3.5',
  };

  const roundedStyles = rounded === 'full' ? 'rounded-full' : 'rounded-[14px]';

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${roundedStyles} ${colorStyles[color]} ${sizeStyles[size]} ${className}`}
    >
      {icon}
    </div>
  );
}
