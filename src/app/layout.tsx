import './globals.css';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { QueryProvider } from '@/components/providers/QueryProvider';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'StreakKeeper - Intelligent Habit & Streak Tracking',
  description: 'Gamified habit tracker with streak freezes, behavioral triggers, community groups, and AI insights.',
};

import { ToastProvider } from '@/components/ui/Toast';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="min-h-screen bg-cream font-sans antialiased selection:bg-brand-teal/20 selection:text-navy-900">
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
