'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  CheckCircle2,
  BarChart3,
  Users2,
  BookOpen,
  Trophy,
  Sparkles,
  Flame,
  X,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  isAi?: boolean;
}

const mainNavItems: NavItem[] = [
  { label: 'Home', href: '/home', icon: <Home className="w-5 h-5" /> },
  { label: 'My Habits', href: '/habits', icon: <CheckCircle2 className="w-5 h-5" /> },
  { label: 'Analytics', href: '/analytics', icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'Groups', href: '/groups', icon: <Users2 className="w-5 h-5" /> },
  { label: 'Journals', href: '/journals', icon: <BookOpen className="w-5 h-5" /> },
  { label: 'Leaderboard', href: '/leaderboard', icon: <Trophy className="w-5 h-5" /> },
];

const secondaryNavItems: NavItem[] = [
  {
    label: 'AI Assistant',
    href: '/ai',
    icon: <Sparkles className="w-5 h-5 text-indigo-300" />,
    badge: 'Pro',
    isAi: true,
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  user?: {
    name: string;
    level: number;
    xp: number;
    image?: string;
  };
}

export function Sidebar({ isOpen = false, onClose, user }: SidebarProps) {
  const pathname = usePathname();
  const isSettingsPage = pathname?.startsWith('/settings');
  const isGroupsPage = pathname?.startsWith('/groups');
  const isJournalsPage = pathname?.startsWith('/journals');
  const sidebarBgImage = isSettingsPage
    ? '/images/sidebar-settings-bg.png'
    : isJournalsPage
    ? '/images/sidebar-journals-bg.png'
    : isGroupsPage
    ? '/images/sidebar-groups-bg.png'
    : '/images/sidebar-default-bg.png';

  const currentUser = user ?? {
    name: 'Riya Jayaswal',
    level: 4,
    xp: 450,
    image: '/images/avatar-riya.jpg',
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } bg-[#0B1635] text-white shadow-xl overflow-hidden bg-cover bg-bottom bg-no-repeat transition-[background-image] duration-300`}
        style={{ backgroundImage: `url('${sidebarBgImage}')` }}
      >
        {/* Top Header & Logo */}
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <Link href="/home" className="flex items-center gap-3 group">
              {/* Flame Logo */}
              <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <img
                  src="/images/logo.png"
                  alt="StreakKeeper Logo"
                  className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(34,211,238,0.4)]"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold tracking-tight text-white leading-none">
                  StreakKeeper
                </span>
                <span className="text-[11px] text-cyan-300/70 font-semibold tracking-wider uppercase mt-1">
                  Consistency OS
                </span>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          <div className="text-[11px] font-semibold text-slate-400/70 uppercase tracking-wider px-3 mb-2">
            Main Menu
          </div>
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/home' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${isActive
                    ? 'bg-white/15 text-white font-semibold shadow-inner border border-white/15 backdrop-blur-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/8'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-cyan-400/80" />}
              </Link>
            );
          })}

          <div className="pt-5 pb-1">
            <div className="text-[11px] font-semibold text-slate-400/70 uppercase tracking-wider px-3 mb-2">
              Intelligence
            </div>
            {secondaryNavItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${isActive
                      ? 'bg-white/15 text-white font-semibold shadow-inner border border-white/15'
                      : 'text-slate-300 hover:text-white hover:bg-white/8'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-indigo-300' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom Section with Twilight Mountain Illustration & User Card */}
        <div className="relative pt-12 pb-5 px-4 mt-auto">
          {/* Twilight Mountain Illustration (SVG fading at bottom) - only on non-groups pages */}
          {!isGroupsPage && (
            <div className="absolute inset-x-0 bottom-0 h-48 pointer-events-none overflow-hidden opacity-30 select-none">
              <svg
                viewBox="0 0 300 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full object-cover object-bottom"
                preserveAspectRatio="none"
              >
                {/* Star dots */}
                <circle cx="50" cy="20" r="1" fill="#FFFFFF" opacity="0.8" />
                <circle cx="120" cy="12" r="1.5" fill="#FFFFFF" opacity="0.9" />
                <circle cx="190" cy="25" r="1" fill="#FFFFFF" opacity="0.6" />
                <circle cx="260" cy="18" r="1.2" fill="#FFFFFF" opacity="0.85" />
                {/* Back Mountain Ridge */}
                <path
                  d="M0 120L60 70L130 110L210 50L300 130V160H0V120Z"
                  fill="url(#mountainGrad1)"
                />
                {/* Front Mountain Ridge */}
                <path
                  d="M0 140L80 95L160 135L240 85L300 125V160H0V140Z"
                  fill="url(#mountainGrad2)"
                />
                <defs>
                  <linearGradient id="mountainGrad1" x1="150" y1="50" x2="150" y2="160" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#38BDF8" stopOpacity="0.4" />
                    <stop offset="1" stopColor="#0B1635" stopOpacity="0.9" />
                  </linearGradient>
                  <linearGradient id="mountainGrad2" x1="150" y1="85" x2="150" y2="160" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#818CF8" stopOpacity="0.5" />
                    <stop offset="1" stopColor="#0B1635" stopOpacity="1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}

          {/* User Card */}
          <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 shadow-lg">
            <div className="flex items-center gap-3">
              <Link href="/settings" onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0 group cursor-pointer">
                <Avatar
                  name={currentUser.name}
                  src={currentUser.image || '/images/avatar-riya.jpg'}
                  size="md"
                  badge={
                    <span className="w-3.5 h-3.5 bg-emerald-500 border-2 border-[#122254] rounded-full inline-block" />
                  }
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate leading-snug group-hover:text-cyan-300 transition-colors">
                    {currentUser.name}
                  </p>
                  <p className="text-xs text-cyan-300/80 font-medium truncate mt-0.5">
                    Level {currentUser.level} · {currentUser.xp} XP
                  </p>
                </div>
              </Link>
              <button
                title="Log out"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                onClick={() => {
                  window.location.href = '/api/auth/signout';
                }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
