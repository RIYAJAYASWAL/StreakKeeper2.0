import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/server/lib/auth';
import LandingPage from '@/components/landing/LandingPage';

export const metadata: Metadata = {
  title: 'StreakKeeper',
  description:
    'StreakKeeper helps you build positive habits, track your progress, protect streaks with freezes, and stay consistent — one day at a time.',
  keywords: [
    'habit tracker',
    'streak keeper',
    'streak freeze',
    'daily routine',
    'productivity',
    'habit building',
    'AI habit insights',
  ],
  openGraph: {
    title: 'StreakKeeper',
    description:
      'StreakKeeper helps you build positive habits, track your progress and stay consistent with AI insights and community accountability.',
    url: 'https://streakkeeper.app',
    siteName: 'StreakKeeper',
    images: [
      {
        url: '/images/landing-mountains-bg.png',
        width: 1200,
        height: 630,
        alt: 'StreakKeeper',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StreakKeeper',
    description:
      'StreakKeeper helps you build positive habits, track your progress and stay consistent.',
    images: ['/images/landing-mountains-bg.png'],
  },
};

export default async function RootPage() {
  let session = null;
  try {
    session = await auth();
  } catch {
    // If session resolution fails or unauthenticated, display landing page
  }

  if (session?.user) {
    redirect('/home');
  }

  return <LandingPage />;
}
