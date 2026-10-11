'use client';

import React from 'react';
import {
  Flame,
  Check,
  Snowflake,
  Crown,
  Search,
  Bell,
  Home,
  CheckCircle2,
  BarChart3,
  Users2,
  BookOpen,
  Trophy,
  Moon,
  Laptop,
  Smile,
  Sparkles,
  ArrowRight,
  Book,
  Dumbbell,
  Droplets,
  Heart,
  Ban,
  CheckCircle,
} from 'lucide-react';

export function DashboardPreview() {
  return (
    <div
      className="relative w-full max-w-[620px] lg:max-w-[660px] mx-auto select-none"
      style={{
        perspective: '1400px',
      }}
    >
      {/* Ambient shadow / glow under the card */}
      <div className="absolute -inset-4 bg-gradient-to-r from-blue-400/20 via-indigo-300/20 to-purple-400/20 rounded-[36px] blur-2xl transform -rotate-1 scale-95 opacity-80 pointer-events-none" />

      {/* 3D Tilted Card Container */}
      <div
        className="relative bg-cream-100 rounded-[24px] sm:rounded-[28px] border-[5px] sm:border-[6px] border-white shadow-2xl overflow-hidden transition-all duration-500 hover:rotate-0 hover:scale-[1.01]"
        style={{
          transform: 'rotateY(-8deg) rotateX(4deg) rotateZ(-1.5deg)',
          transformStyle: 'preserve-3d',
          boxShadow:
            '0 28px 60px -15px rgba(11, 22, 53, 0.22), 0 14px 28px -6px rgba(11, 22, 53, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        }}
      >
        <div className="flex h-[420px] sm:h-[460px] text-[#0B1635]">
          {/* ================= MINI SIDEBAR ================= */}
          <div className="w-[125px] sm:w-[145px] bg-[#0B1635] text-white flex flex-col justify-between p-3 sm:p-3.5 shrink-0 select-none">
            {/* Top Brand Logo */}
            <div>
              <div className="flex items-center gap-1.5 px-1 py-1 mb-4">
                <img
                  src="/images/logo.png"
                  alt="StreakKeeper"
                  className="w-5 h-5 object-contain"
                />
                <span className="text-xs sm:text-sm font-bold tracking-tight text-white">
                  StreakKeeper
                </span>
              </div>

              {/* Nav Items */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/15 text-white text-[11px] font-semibold shadow-xs">
                  <Home className="w-3.5 h-3.5 text-blue-300" />
                  <span>Home</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-300 hover:text-white text-[11px] font-medium opacity-80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>My Habits</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-300 hover:text-white text-[11px] font-medium opacity-80">
                  <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Analytics</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-300 hover:text-white text-[11px] font-medium opacity-80">
                  <Users2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Groups</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-300 hover:text-white text-[11px] font-medium opacity-80">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Journals</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-300 hover:text-white text-[11px] font-medium opacity-80">
                  <Trophy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Leaderboard</span>
                </div>
              </div>
            </div>

            {/* Bottom User Info */}
            <div className="pt-2 border-t border-white/10 flex items-center gap-2">
              <img
                src="/images/avatar-riya.jpg"
                alt="Riya"
                className="w-6 h-6 rounded-full object-cover border border-white/30"
              />
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] font-semibold text-white truncate">
                  Riya Jayaswal
                </div>
                <div className="text-[9px] text-slate-300/80">Level 4 • 68 XP</div>
              </div>
            </div>
          </div>

          {/* ================= MINI DASHBOARD CONTENT ================= */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/70">
            {/* Top Bar with Search & Mountain Header Art */}
            <div className="relative px-3 sm:px-4 pt-3 pb-2.5 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/60 border-b border-slate-100">
              <div className="flex items-center justify-between gap-2">
                {/* Search Bar */}
                <div className="flex-1 max-w-[240px] flex items-center gap-1.5 bg-white/90 border border-slate-200/80 rounded-lg px-2.5 py-1 text-[10px] text-slate-400 shadow-2xs">
                  <Search className="w-3 h-3 text-slate-400" />
                  <span className="truncate">Search habits, journals, groups...</span>
                </div>

                {/* Right Icons */}
                <div className="flex items-center gap-2">
                  <div className="relative w-6 h-6 rounded-full bg-white flex items-center justify-center text-slate-500 shadow-2xs border border-slate-100">
                    <Bell className="w-3 h-3" />
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full" />
                  </div>
                  <img
                    src="/images/avatar-riya.jpg"
                    alt="Riya"
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
                  />
                </div>
              </div>

              {/* Greeting */}
              <div className="mt-2.5">
                <h3 className="text-xs sm:text-sm font-bold text-[#0B1635] flex items-center gap-1">
                  Good morning, Riya! <span className="text-amber-400 text-xs">✨</span>
                </h3>
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium">
                  Consistency builds the life you want.
                </p>
              </div>
            </div>

            {/* Dashboard Body */}
            <div className="flex-1 p-3 sm:p-3.5 overflow-hidden flex flex-col justify-between gap-2.5">
              {/* 4 Stat Cards Row */}
              <div className="grid grid-cols-4 gap-2">
                {/* 1. Day Streak */}
                <div className="bg-white rounded-xl p-2 shadow-2xs border border-slate-100 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                    <Flame className="w-3.5 h-3.5 fill-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#0B1635] leading-none">
                      7
                    </div>
                    <div className="text-[8px] sm:text-[9px] text-slate-500 truncate mt-0.5 font-medium">
                      Day Streak
                    </div>
                  </div>
                </div>

                {/* 2. Habits Completed */}
                <div className="bg-white rounded-xl p-2 shadow-2xs border border-slate-100 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#0B1635] leading-none">
                      3
                    </div>
                    <div className="text-[8px] sm:text-[9px] text-slate-500 truncate mt-0.5 font-medium">
                      Habits Completed
                    </div>
                  </div>
                </div>

                {/* 3. Frozen Used */}
                <div className="bg-white rounded-xl p-2 shadow-2xs border border-slate-100 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-500 flex items-center justify-center shrink-0">
                    <Snowflake className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#0B1635] leading-none">
                      2
                    </div>
                    <div className="text-[8px] sm:text-[9px] text-slate-500 truncate mt-0.5 font-medium">
                      Frozen Used
                    </div>
                  </div>
                </div>

                {/* 4. Habit Champion */}
                <div className="bg-white rounded-xl p-2 shadow-2xs border border-slate-100 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Crown className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-[#0B1635] leading-none truncate">
                      Level 4
                    </div>
                    <div className="text-[8px] sm:text-[9px] text-slate-500 truncate mt-0.5 font-medium">
                      Habit Champion
                    </div>
                  </div>
                </div>
              </div>

              {/* Lower Section (Two Columns) */}
              <div className="grid grid-cols-12 gap-2.5 flex-1 items-stretch">
                {/* Left Column: Today's Habits */}
                <div className="col-span-6 bg-white rounded-xl p-2.5 shadow-2xs border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-emerald-600 text-xs">🌿</span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#0B1635]">
                        Today&apos;s Habits
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {/* Habit 1: Read a book (completed) */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Book className="w-2.5 h-2.5 text-emerald-600" /> Read a book
                          </span>
                          <span className="text-[9px] font-medium text-emerald-600 flex items-center gap-1">
                            1/1 <CheckCircle className="w-2.5 h-2.5 text-emerald-600 fill-emerald-500 text-white" />
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full w-full" />
                        </div>
                      </div>

                      {/* Habit 2: Workout */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Dumbbell className="w-2.5 h-2.5 text-blue-500" /> Workout
                          </span>
                          <span className="text-[9px] font-medium text-slate-400 flex items-center gap-1">
                            2/3 <span className="w-2.5 h-2.5 rounded-full border border-slate-300" />
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full w-[66%]" />
                        </div>
                      </div>

                      {/* Habit 3: Drink 2L water */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Droplets className="w-2.5 h-2.5 text-cyan-500" /> Drink 2L water
                          </span>
                          <span className="text-[9px] font-medium text-slate-400 flex items-center gap-1">
                            0/1 <span className="w-2.5 h-2.5 rounded-full border border-slate-300" />
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                          <div className="bg-cyan-500 h-full rounded-full w-0" />
                        </div>
                      </div>

                      {/* Habit 4: Meditate */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Heart className="w-2.5 h-2.5 text-purple-500" /> Meditate
                          </span>
                          <span className="text-[9px] font-medium text-slate-400 flex items-center gap-1">
                            0/1 <span className="w-2.5 h-2.5 rounded-full border border-slate-300" />
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                          <div className="bg-purple-500 h-full rounded-full w-0" />
                        </div>
                      </div>

                      {/* Habit 5: Avoid junk food */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Ban className="w-2.5 h-2.5 text-pink-500" /> Avoid junk food
                          </span>
                          <span className="text-[9px] font-medium text-slate-400 flex items-center gap-1">
                            0/1 <span className="w-2.5 h-2.5 rounded-full border border-slate-300" />
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                          <div className="bg-pink-500 h-full rounded-full w-0" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 text-right">
                    <span className="text-[9px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer inline-flex items-center gap-0.5">
                      View all →
                    </span>
                  </div>
                </div>

                {/* Right Column: Trigger Points & AI Insight */}
                <div className="col-span-6 flex flex-col justify-between gap-2">
                  {/* Trigger Points */}
                  <div className="bg-white rounded-xl p-2.5 shadow-2xs border border-slate-100">
                    <div className="text-[10px] sm:text-[11px] font-bold text-[#0B1635] mb-2">
                      Your Trigger Points
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-center">
                      {/* Sleep */}
                      <div className="bg-blue-50/60 rounded-lg p-1 flex flex-col items-center">
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-0.5">
                          <Moon className="w-2.5 h-2.5" />
                        </div>
                        <span className="text-[8px] font-bold text-slate-700">Sleep</span>
                        <span className="text-[7.5px] font-semibold text-rose-500">(High)</span>
                      </div>

                      {/* Screen Time */}
                      <div className="bg-teal-50/60 rounded-lg p-1 flex flex-col items-center">
                        <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mb-0.5">
                          <Laptop className="w-2.5 h-2.5" />
                        </div>
                        <span className="text-[8px] font-bold text-slate-700">Screen Time</span>
                        <span className="text-[7.5px] font-semibold text-amber-600">(Med)</span>
                      </div>

                      {/* Stress */}
                      <div className="bg-purple-50/60 rounded-lg p-1 flex flex-col items-center">
                        <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-0.5">
                          <Smile className="w-2.5 h-2.5" />
                        </div>
                        <span className="text-[8px] font-bold text-slate-700">Stress</span>
                        <span className="text-[7.5px] font-semibold text-amber-600">(Med)</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Insight Box */}
                  <div className="bg-gradient-to-br from-purple-50 via-indigo-50/60 to-white rounded-xl p-2.5 shadow-2xs border border-purple-100/80">
                    <div className="flex items-center gap-1 text-purple-700 font-bold text-[9px] sm:text-[10px] mb-1">
                      <Sparkles className="w-3 h-3 text-purple-600" />
                      <span>AI Insight</span>
                    </div>
                    <p className="text-[8.5px] sm:text-[9px] text-slate-600 leading-tight">
                      You&apos;ve been consistent with your reading habit! Try adding short bursts of meditation in the evening to improve your sleep.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
