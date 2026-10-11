import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helperText, error, leftIcon, rightIcon, className = '', id, disabled, ...props },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-navy-900 mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          disabled={disabled}
          className={`w-full bg-white text-navy-900 placeholder:text-slate-400 text-sm rounded-btn border transition-all duration-150 py-2.5 ${
            leftIcon ? 'pl-10' : 'pl-3.5'
          } ${rightIcon ? 'pr-10' : 'pr-3.5'} ${
            error
              ? 'border-rose-400 focus:ring-2 focus:ring-rose-200 focus:border-rose-500'
              : 'border-border-soft hover:border-slate-300 focus:border-navy-900 focus:ring-2 focus:ring-navy-900/10'
          } ${disabled ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''} ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 text-slate-400 pointer-events-none flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-rose-500 font-medium mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});
