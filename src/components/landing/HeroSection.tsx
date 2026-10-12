'use client';

import React from 'react';
import { DashboardPreview } from './DashboardPreview';

export function HeroSection() {
  return (
    <section
      id="home"
      className="relative isolate pt-28 pb-16 sm:pt-32 sm:pb-24 lg:pt-36 lg:pb-32 overflow-hidden"
    >
      {/* Background with user-provided mountain landscape */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Soft sky gradient base */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#eaf2ff] via-[#f4f7fe]/90 to-[#fdfbf9]" />

        {/* Sunrise mountain background provided by user */}
        <div
          className="absolute inset-0 bg-cover bg-center lg:bg-[center_top] opacity-65 mix-blend-multiply"
          style={{
            backgroundImage: "url('/images/landing-sunrise-bg.png')",
          }}
        />

        {/* Radial light glow behind hero content */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-sky-200/40 via-indigo-100/30 to-amber-100/40 rounded-full blur-3xl opacity-70" />

        {/* Soft fade out at the bottom to blend with wave divider */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#fdfcf9] via-[#fdfcf9]/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* ================= LEFT COLUMN: HERO COPY ================= */}
          <div className="lg:col-span-6 xl:col-span-5 text-center lg:text-left flex flex-col items-center lg:items-start">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-purple-200/70 shadow-2xs mb-6 text-purple-700 font-medium text-xs sm:text-sm">
              <span className="text-purple-600 font-bold">✦</span>
              <span>Build Better Habits</span>
              <span className="w-1 h-1 rounded-full bg-purple-400" />
              <span>Live a Happier You</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] xl:text-[60px] font-extrabold text-[#0B1635] leading-[1.2] tracking-tight mb-5">
              <span>Small Habits,</span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                Big Changes.
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg text-slate-600 max-w-lg mb-2 leading-relaxed font-normal">
              StreakKeeper helps you build positive habits, track your progress and stay consistent — one day at a time.
            </p>
          </div>

          {/* ================= RIGHT COLUMN: TILTED DASHBOARD CARD ================= */}
          <div className="lg:col-span-6 xl:col-span-7 flex justify-center lg:justify-end mt-4 lg:mt-0">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
