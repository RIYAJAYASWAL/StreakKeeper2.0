'use client';

import React, { useState } from 'react';
import { Search, Bell, Menu, ChevronDown } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

export interface TopBarProps {
  onMenuToggle?: () => void;
  user?: {
    name: string;
    email?: string;
    image?: string;
    freezesRemaining?: number;
  };
}

export function TopBar({ onMenuToggle, user }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hasNotifications] = useState(true);

  const currentUser = user ?? {
    name: 'Riya',
    image: '/images/avatar-riya.jpg',
    freezesRemaining: 2,
  };

  const displayName = currentUser.name ? currentUser.name.split(' ')[0] : 'Riya';

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/70 backdrop-blur-md border-b border-border-soft/80 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-xl text-navy-900 hover:bg-slate-100 lg:hidden shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Input */}
        <div className="relative w-full">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search habits, journals, groups..."
            className="w-full bg-cream-50/70 hover:bg-white text-navy-900 placeholder:text-slate-400 text-sm rounded-btn border border-border-soft hover:border-slate-300 focus:border-navy-900 focus:bg-white focus:ring-2 focus:ring-navy-900/10 transition-all duration-150 py-2 pl-9 pr-4 outline-hidden"
          />
        </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Notification Bell */}
        <button
          className="relative p-2 rounded-xl text-slate-600 hover:text-navy-900 hover:bg-cream-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {hasNotifications && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          )}
        </button>

        {/* User Avatar Menu Trigger */}
        <button
          className="flex items-center gap-2 hover:opacity-85 transition-opacity"
          aria-label="User menu"
        >
          <Avatar
            name={currentUser.name}
            src={currentUser.image || '/images/avatar-riya.jpg'}
            size="sm"
          />
          <span className="text-xs sm:text-sm font-bold text-navy-900">
            {displayName}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>
    </header>
  );
}
