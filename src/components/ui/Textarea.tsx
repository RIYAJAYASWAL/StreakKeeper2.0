import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, helperText, error, className = '', id, disabled, rows = 3, ...props },
  ref
) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs font-semibold text-navy-900 mb-1.5"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        ref={ref}
        rows={rows}
        disabled={disabled}
        className={`w-full bg-white text-navy-900 placeholder:text-slate-400 text-sm rounded-btn border transition-all duration-150 p-3 ${
          error
            ? 'border-rose-400 focus:ring-2 focus:ring-rose-200 focus:border-rose-500'
            : 'border-border-soft hover:border-slate-300 focus:border-navy-900 focus:ring-2 focus:ring-navy-900/10'
        } ${disabled ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''} ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-rose-500 font-medium mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});
