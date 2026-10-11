import React from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-x-hidden"
      style={{
        backgroundImage: `url('/images/auth-bg.jpg'), linear-gradient(135deg, #070E22 0%, #0B1635 30%, #1B2A5E 65%, #4C1D72 85%, #B83280 100%)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Subtle atmospheric vignette overlay */}
      <div className="absolute inset-0 bg-navy-950/15 pointer-events-none" />

      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-start justify-between gap-10 lg:gap-16 py-8 sm:py-12">
        {/* Left Side: Branding, Headline, Subline, Quote (shifted a little left and up) */}
        <div className="w-full lg:max-w-md text-white -translate-y-3 sm:-translate-y-5 lg:-translate-x-4">
          {/* Logo with Blue Flame */}
          <div>
            <Link href="/" className="inline-flex items-center gap-3.5 group">
              <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <img
                  src="/images/logo.png"
                  alt="StreakKeeper Logo"
                  className="w-full h-full object-contain drop-shadow-[0_4px_14px_rgba(34,211,238,0.4)]"
                />
              </div>
              <span className="text-3xl sm:text-[32px] font-extrabold tracking-tight text-white drop-shadow-md">
                StreakKeeper
              </span>
            </Link>
          </div>

          {/* Headline & Subline */}
          <div className="mt-5 sm:mt-6">
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white drop-shadow-md">
              Better Habits. A Kinder You.
            </h1>
            <p className="text-sm sm:text-base text-slate-200/90 font-medium mt-2 drop-shadow-sm">
              Small steps. Big changes.
            </p>
          </div>

          {/* Quote */}
          <div className="mt-6 sm:mt-7 max-w-[270px] sm:max-w-[290px]">
            <p className="text-xs sm:text-[13px] text-slate-200/80 font-normal leading-relaxed drop-shadow-sm">
              &ldquo;Discipline isn&apos;t about being perfect, it&apos;s about showing up, even when it&apos;s hard.&rdquo;
            </p>
          </div>
        </div>

        {/* Right Side: Frosted-Glass Translucent Card */}
        <div className="w-full max-w-[450px] shrink-0">
          <div className="bg-white/60 backdrop-blur-2xl border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.22)] rounded-[32px] p-7 sm:p-9 text-navy-900 transition-all">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
