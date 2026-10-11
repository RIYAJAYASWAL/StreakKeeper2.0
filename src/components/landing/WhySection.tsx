'use client';

import React from 'react';
import { Palette, Smartphone, WifiOff, ShieldCheck } from 'lucide-react';

interface GridCard {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}

const whyCards: GridCard[] = [
  {
    icon: <Palette className="w-5 h-5" />,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'Beautiful & Simple UI',
    description: 'Designed for focus, not distraction.',
  },
  {
    icon: <Smartphone className="w-5 h-5" />,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    title: 'Cross-Device Sync',
    description: 'Access your progress anywhere, anytime.',
  },
  {
    icon: <WifiOff className="w-5 h-5" />,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    title: 'Offline Support',
    description: 'Keep going, even without internet.',
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    title: 'Privacy First',
    description: 'Your data, your control. Always.',
  },
];

export function WhySection() {
  return (
    <section
      id="about"
      className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-36 overflow-hidden bg-gradient-to-b from-white via-[#f8fafc]/50 to-[#f3f6fa]"
    >
      {/* Background illustration with user-provided image (girl on rock overlooking mountain valley) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* The user-provided image positioned on the left/lower side */}
        <div
          className="absolute inset-0 bg-no-repeat bg-[center_left] lg:bg-left-bottom bg-cover opacity-80"
          style={{
            backgroundImage: "url('/images/landing-mountains-girl-bg.png')",
          }}
        />

        {/* Gradient mask: soft on the left where the girl sits, blending to smooth white/light background on the right */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-white/95 hidden lg:block" />
        <div className="absolute inset-0 bg-white/85 lg:hidden" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Spacer for the left column where the girl illustration sits */}
          <div className="hidden lg:block lg:col-span-5 h-[340px]" aria-hidden="true">
            {/* The illustration shows through here cleanly */}
          </div>

          {/* Right Column: Heading, Subtext, and 2x2 Feature Cards Grid */}
          <div className="lg:col-span-7">
            {/* Pill Badge */}
            <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-purple-100/90 border border-purple-200/80 mb-4 text-purple-700 font-semibold text-xs tracking-wide shadow-2xs">
              Why StreakKeeper?
            </div>

            {/* Headline */}
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1635] tracking-tight mb-4">
              More Than Just a{' '}
              <span className="text-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Habit Tracker
              </span>
            </h2>

            {/* Short Paragraph */}
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed mb-8">
              StreakKeeper is your personal companion for a better, healthier, more focused you. With powerful tools and gentle motivation, we make habit building simple and enjoyable.
            </p>

            {/* 2x2 Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {whyCards.map((card, idx) => (
                <div
                  key={idx}
                  className="bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-start gap-4 group"
                >
                  {/* Icon Box */}
                  <div
                    className={`w-11 h-11 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
                  >
                    {card.icon}
                  </div>

                  {/* Text */}
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-[#0B1635] mb-1 tracking-tight">
                      {card.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 leading-snug">
                      {card.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
