'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { useSharedHabits } from '@/lib/habitsStore';

export default function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const pathname = usePathname();
  const isRestorePage = pathname?.startsWith('/restore');
  const isAnalyticsPage = pathname?.startsWith('/analytics');
  const isAiPage = pathname?.startsWith('/ai');
  const isGroupsPage = pathname?.startsWith('/groups');
  const isJournalsPage = pathname?.startsWith('/journals');
  const isLeaderboardPage = pathname?.startsWith('/leaderboard');
  const isSettingsPage = pathname?.startsWith('/settings');
  const isHideTopBar = isRestorePage || isAnalyticsPage || isAiPage || isGroupsPage || isJournalsPage || isLeaderboardPage || isSettingsPage;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { xp: sharedXp, level: sharedLevel } = useSharedHabits();

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      try {
        const res = await api.me.get();
        return res.user;
      } catch {
        return null;
      }
    },
    staleTime: 60 * 1000,
  });

  const currentUser = {
    name: userProfile?.name || 'Riya Jayaswal',
    level: sharedLevel || userProfile?.level || 4,
    xp: sharedXp || userProfile?.xp || 450,
    image: '/images/avatar-riya.jpg',
    freezesRemaining: userProfile?.freezesRemaining ?? 2,
  };

  return (
    <div className="min-h-screen bg-cream flex text-navy-900">
      {/* Left Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={currentUser}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Sticky TopBar - hidden on /restore, /analytics, /ai, /groups, and /journals to match reference designs */}
        {!isHideTopBar && (
          <TopBar onMenuToggle={() => setSidebarOpen(true)} user={currentUser} />
        )}

        {/* Dynamic Page Outlet */}
        <main
          className={
            isRestorePage
              ? 'flex-1 w-full flex flex-col min-h-screen'
              : isSettingsPage
              ? 'flex-1 w-full min-h-screen relative p-0'
              : isJournalsPage || isLeaderboardPage
              ? 'flex-1 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-12 max-w-5xl w-full mx-auto relative'
              : 'flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto relative'
          }
        >
          {children}
        </main>
      </div>

      {/* Parallel Route Modal Outlet */}
      {modal}
    </div>
  );
}

