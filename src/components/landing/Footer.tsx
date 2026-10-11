'use client';

import React from 'react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200/80 py-8 text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
          <p>© {new Date().getFullYear()} StreakKeeper. All rights reserved.</p>
          <p className="text-slate-400">
            Build consistency, protect your streak, thrive.
          </p>
        </div>
      </div>
    </footer>
  );
}
