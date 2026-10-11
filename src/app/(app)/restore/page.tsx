import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { RestoreStreakCard } from '@/components/restore/RestoreStreakCard';

export const metadata: Metadata = {
  title: 'Restore Streak · StreakKeeper',
  description: 'Use a streak freeze to restore and protect your habit consistency.',
};

export default function RestorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>}>
      <RestoreStreakCard isModal={false} />
    </Suspense>
  );
}
