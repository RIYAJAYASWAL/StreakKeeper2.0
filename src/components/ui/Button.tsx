import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-navy-900/30 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded-[10px] gap-1.5',
    md: 'text-sm px-4 py-2.5 rounded-btn gap-2',
    lg: 'text-base px-6 py-3 rounded-btn gap-2.5 font-semibold',
  }[size];

  const variantStyles = {
    primary: 'bg-navy-900 text-white hover:bg-navy-800 shadow-sm',
    secondary: 'bg-white text-navy-900 border border-border-soft hover:bg-cream-100 shadow-subtle',
    ghost: 'bg-transparent text-navy-900 hover:bg-navy-900/5',
    outline: 'bg-transparent text-navy-900 border border-border-soft hover:bg-white',
    danger: 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100',
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
}
