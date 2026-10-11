'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, X, Info } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  toast: (options: { type?: ToastType; title?: string; message: string }) => void;
  error: (message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = 'info', title, message }: { type?: ToastType; title?: string; message: string }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);

      setTimeout(() => {
        removeToast(id);
      }, 5000);
    },
    [removeToast]
  );

  const error = useCallback(
    (message: string, title = 'Authentication Failed') => {
      addToast({ type: 'error', title, message });
    },
    [addToast]
  );

  const success = useCallback(
    (message: string, title = 'Success') => {
      addToast({ type: 'success', title, message });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toast: addToast, error, success }}>
      {children}
      {/* Toast viewport */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-card border shadow-modal backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-3 ${
              t.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-950'
                : t.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950'
                : 'bg-white/95 border-border-soft text-navy-900'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-indigo-600" />}
            </div>
            <div className="flex-1 min-w-0">
              {t.title && <h5 className="text-xs font-bold uppercase tracking-wider mb-0.5">{t.title}</h5>}
              <p className="text-sm font-medium leading-snug">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-slate-400 hover:text-slate-700 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
