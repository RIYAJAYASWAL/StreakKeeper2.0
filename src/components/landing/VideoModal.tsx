'use client';

import React, { useEffect } from 'react';
import { X, Play, Sparkles, CheckCircle2, Flame, ShieldAlert, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VideoModal({ isOpen, onClose }: VideoModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0B1635]/70 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-modal-title"
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-white/40 overflow-hidden z-10 flex flex-col transition-all"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span
              id="video-modal-title"
              className="ml-2 text-xs font-semibold text-slate-500 uppercase tracking-wider"
            >
              StreakKeeper Product Walkthrough
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-full text-slate-400 hover:text-navy-950 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Interactive Feature Preview */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0B1635] to-[#162758] text-white p-8 sm:p-10 shadow-lg">
            {/* Background glowing rings */}
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-cyan-300 mb-4 border border-white/10">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Smart Consistency OS</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                How StreakKeeper Helps You Never Miss a Day
              </h3>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl mb-6">
                Watch how streak freezes protect you on busy days, AI detects friction points in your routine, and community accountability keeps you moving forward.
              </p>

              {/* 3 Key Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                  <Flame className="w-5 h-5 text-orange-400 mb-1.5" />
                  <div className="text-xs font-bold text-white">Gamified Streaks</div>
                  <div className="text-[11px] text-slate-300">Earn XP and unlock badges</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                  <ShieldAlert className="w-5 h-5 text-sky-400 mb-1.5" />
                  <div className="text-xs font-bold text-white">Streak Freezes</div>
                  <div className="text-[11px] text-slate-300">Save habits with emergency freezes</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                  <Sparkles className="w-5 h-5 text-purple-400 mb-1.5" />
                  <div className="text-xs font-bold text-white">AI Coach</div>
                  <div className="text-[11px] text-slate-300">Personalized habit optimizations</div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href="/register"
                  onClick={onClose}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#0B1635] hover:bg-slate-100 font-bold px-6 py-3 rounded-xl text-sm shadow-md transition-all"
                >
                  <span>Start Free Trial Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto text-xs text-slate-300 hover:text-white px-4 py-2 font-medium"
                >
                  Back to Overview
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
