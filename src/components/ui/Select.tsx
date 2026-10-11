import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, helperText, error, className = '', id, disabled, children, ...props },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-navy-900 mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          ref={ref}
          disabled={disabled}
          className={`w-full appearance-none bg-white text-navy-900 text-sm rounded-btn border transition-all duration-150 py-2.5 pl-3.5 pr-10 ${
            error
              ? 'border-rose-400 focus:ring-2 focus:ring-rose-200 focus:border-rose-500'
              : 'border-border-soft hover:border-slate-300 focus:border-navy-900 focus:ring-2 focus:ring-navy-900/10'
          } ${disabled ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''} ${className}`}
          {...props}
        >
          {children ??
            options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error ? (
        <p className="text-xs text-rose-500 font-medium mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});
