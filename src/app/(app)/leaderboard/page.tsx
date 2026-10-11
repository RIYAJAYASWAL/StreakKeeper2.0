'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  Flame,
  Trophy,
  Users,
  User,
  ArrowDown,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { api, LeaderboardEntry, UserProfile } from '@/lib/api';

type ScopeType = 'global' | 'friends';
type PeriodType = 'month' | 'all';
type TabType = 'global' | 'friends' | 'my-rank';

interface LevelRankInfo {
  level: number;
  title: string;
  badgeBg: string;
  userRank: number | null;
  totalInLevel: number;
  xpRange: string;
  status: 'current' | 'achieved' | 'upcoming';
  note: string;
  members: LeaderboardEntry[];
}

// 1. GLOBAL DUMMY DATA (Month vs All Time)
const GLOBAL_DATA: Record<PeriodType, { topThree: LeaderboardEntry[]; list: LeaderboardEntry[] }> = {
  month: {
    topThree: [
      {
        userId: 'g-1',
        name: 'Aarav Mehta',
        xp: 870,
        level: 5,
        image: '/images/avatar-aarav.jpg',
        currentStreak: 87,
        longestStreak: 87,
        rank: 1,
      },
      {
        userId: 'g-2',
        name: 'Sneha Patel',
        xp: 810,
        level: 4,
        image: '/images/avatar-sneha.jpg',
        currentStreak: 81,
        longestStreak: 81,
        rank: 2,
      },
      {
        userId: 'g-3',
        name: 'Ishaan Kapoor',
        xp: 760,
        level: 4,
        image: '/images/avatar-ishaan.jpg',
        currentStreak: 76,
        longestStreak: 76,
        rank: 3,
      },
    ],
    list: [
      {
        userId: 'g-4',
        name: 'Priya Sharma',
        xp: 720,
        level: 4,
        image: null,
        currentStreak: 72,
        longestStreak: 72,
        rank: 4,
      },
      {
        userId: 'user-self',
        name: 'You',
        xp: 600,
        level: 4,
        image: '/images/avatar-riya.jpg',
        currentStreak: 68,
        longestStreak: 68,
        rank: 5,
      },
      {
        userId: 'g-6',
        name: 'Rohan Das',
        xp: 610,
        level: 3,
        image: null,
        currentStreak: 61,
        longestStreak: 61,
        rank: 6,
      },
      {
        userId: 'g-7',
        name: 'Neha Singh',
        xp: 560,
        level: 3,
        image: null,
        currentStreak: 56,
        longestStreak: 56,
        rank: 7,
      },
      {
        userId: 'g-8',
        name: 'Aditya Khanna',
        xp: 520,
        level: 3,
        image: null,
        currentStreak: 52,
        longestStreak: 52,
        rank: 8,
      },
      {
        userId: 'g-9',
        name: 'Kavya Nair',
        xp: 480,
        level: 3,
        image: null,
        currentStreak: 48,
        longestStreak: 48,
        rank: 9,
      },
      {
        userId: 'g-10',
        name: 'Tanishq Rao',
        xp: 440,
        level: 2,
        image: null,
        currentStreak: 44,
        longestStreak: 44,
        rank: 10,
      },
    ],
  },
  all: {
    topThree: [
      {
        userId: 'ga-1',
        name: 'Aarav Mehta',
        xp: 1850,
        level: 7,
        image: '/images/avatar-aarav.jpg',
        currentStreak: 142,
        longestStreak: 160,
        rank: 1,
      },
      {
        userId: 'ga-2',
        name: 'Jordan Lee',
        xp: 1540,
        level: 7,
        image: null,
        currentStreak: 136,
        longestStreak: 152,
        rank: 2,
      },
      {
        userId: 'ga-3',
        name: 'Sneha Patel',
        xp: 1420,
        level: 6,
        image: '/images/avatar-sneha.jpg',
        currentStreak: 124,
        longestStreak: 138,
        rank: 3,
      },
    ],
    list: [
      {
        userId: 'ga-4',
        name: 'Ishaan Kapoor',
        xp: 1280,
        level: 6,
        image: '/images/avatar-ishaan.jpg',
        currentStreak: 115,
        longestStreak: 125,
        rank: 4,
      },
      {
        userId: 'ga-5',
        name: 'Priya Sharma',
        xp: 1190,
        level: 5,
        image: null,
        currentStreak: 102,
        longestStreak: 110,
        rank: 5,
      },
      {
        userId: 'user-self',
        name: 'You',
        xp: 600,
        level: 4,
        image: '/images/avatar-riya.jpg',
        currentStreak: 94,
        longestStreak: 94,
        rank: 6,
      },
      {
        userId: 'ga-7',
        name: 'Rohan Das',
        xp: 1050,
        level: 5,
        image: null,
        currentStreak: 88,
        longestStreak: 98,
        rank: 7,
      },
      {
        userId: 'ga-8',
        name: 'Dev Malhotra',
        xp: 980,
        level: 5,
        image: null,
        currentStreak: 82,
        longestStreak: 90,
        rank: 8,
      },
      {
        userId: 'ga-9',
        name: 'Neha Singh',
        xp: 910,
        level: 4,
        image: null,
        currentStreak: 78,
        longestStreak: 86,
        rank: 9,
      },
      {
        userId: 'ga-10',
        name: 'Aditya Khanna',
        xp: 860,
        level: 4,
        image: null,
        currentStreak: 71,
        longestStreak: 82,
        rank: 10,
      },
    ],
  },
};

// 2. FRIENDS DUMMY DATA (Different members and streaks)
const FRIENDS_DATA: Record<PeriodType, { topThree: LeaderboardEntry[]; list: LeaderboardEntry[] }> = {
  month: {
    topThree: [
      {
        userId: 'f-1',
        name: 'Maya Chen',
        xp: 450,
        level: 3,
        image: '/images/avatar-maya.jpg',
        currentStreak: 44,
        longestStreak: 44,
        rank: 1,
      },
      {
        userId: 'f-2',
        name: 'Alex Rivera',
        xp: 220,
        level: 2,
        image: '/images/avatar-alex.jpg',
        currentStreak: 38,
        longestStreak: 38,
        rank: 2,
      },
      {
        userId: 'user-self',
        name: 'You',
        xp: 600,
        level: 4,
        image: '/images/avatar-riya.jpg',
        currentStreak: 35,
        longestStreak: 60,
        rank: 3,
      },
    ],
    list: [
      {
        userId: 'f-4',
        name: 'Vikram Roy',
        xp: 410,
        level: 3,
        image: null,
        currentStreak: 31,
        longestStreak: 31,
        rank: 4,
      },
      {
        userId: 'f-5',
        name: 'Tara Sen',
        xp: 370,
        level: 3,
        image: null,
        currentStreak: 28,
        longestStreak: 28,
        rank: 5,
      },
      {
        userId: 'f-6',
        name: 'Ananya Iyer',
        xp: 310,
        level: 2,
        image: null,
        currentStreak: 24,
        longestStreak: 24,
        rank: 6,
      },
      {
        userId: 'f-7',
        name: 'Sameer Joshi',
        xp: 280,
        level: 2,
        image: null,
        currentStreak: 19,
        longestStreak: 19,
        rank: 7,
      },
      {
        userId: 'f-8',
        name: 'Meera Nair',
        xp: 190,
        level: 2,
        image: null,
        currentStreak: 14,
        longestStreak: 14,
        rank: 8,
      },
    ],
  },
  all: {
    topThree: [
      {
        userId: 'user-self',
        name: 'You',
        xp: 600,
        level: 4,
        image: '/images/avatar-riya.jpg',
        currentStreak: 94,
        longestStreak: 94,
        rank: 1,
      },
      {
        userId: 'fa-2',
        name: 'Maya Chen',
        xp: 450,
        level: 3,
        image: '/images/avatar-maya.jpg',
        currentStreak: 88,
        longestStreak: 92,
        rank: 2,
      },
      {
        userId: 'fa-3',
        name: 'Alex Rivera',
        xp: 220,
        level: 2,
        image: '/images/avatar-alex.jpg',
        currentStreak: 74,
        longestStreak: 78,
        rank: 3,
      },
    ],
    list: [
      {
        userId: 'fa-4',
        name: 'Vikram Roy',
        xp: 520,
        level: 3,
        image: null,
        currentStreak: 62,
        longestStreak: 70,
        rank: 4,
      },
      {
        userId: 'fa-5',
        name: 'Tara Sen',
        xp: 430,
        level: 3,
        image: null,
        currentStreak: 55,
        longestStreak: 62,
        rank: 5,
      },
      {
        userId: 'fa-6',
        name: 'Ananya Iyer',
        xp: 380,
        level: 2,
        image: null,
        currentStreak: 46,
        longestStreak: 52,
        rank: 6,
      },
      {
        userId: 'fa-7',
        name: 'Sameer Joshi',
        xp: 310,
        level: 2,
        image: null,
        currentStreak: 32,
        longestStreak: 40,
        rank: 7,
      },
      {
        userId: 'fa-8',
        name: 'Meera Nair',
        xp: 240,
        level: 2,
        image: null,
        currentStreak: 26,
        longestStreak: 34,
        rank: 8,
      },
    ],
  },
};

// 3. LEVEL BREAKDOWN DATA: The rank the user holds at each level
const LEVEL_BREAKDOWNS: LevelRankInfo[] = [
  {
    level: 5,
    title: 'Master Habit Builder',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    userRank: null,
    totalInLevel: 88,
    xpRange: '850+ XP',
    status: 'upcoming',
    note: 'Needs 250 XP to unlock Level 5 standing',
    members: [
      { userId: 'l5-1', name: 'Aarav Mehta', xp: 870, level: 5, image: null, currentStreak: 87, longestStreak: 87, rank: 1 },
      { userId: 'l5-2', name: 'Jordan Lee', xp: 850, level: 5, image: null, currentStreak: 82, longestStreak: 82, rank: 2 },
      { userId: 'l5-3', name: 'Dev Malhotra', xp: 860, level: 5, image: null, currentStreak: 79, longestStreak: 79, rank: 3 },
    ],
  },
  {
    level: 4,
    title: 'Expert Practitioner',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    userRank: 2,
    totalInLevel: 142,
    xpRange: '600 - 849 XP',
    status: 'current',
    note: 'Holding Rank #2 among 142 Level 4 members',
    members: [
      { userId: 'l4-1', name: 'Sneha Patel', xp: 810, level: 4, image: null, currentStreak: 81, longestStreak: 81, rank: 1 },
      { userId: 'user-self', name: 'You', xp: 600, level: 4, image: '/images/avatar-riya.jpg', currentStreak: 60, longestStreak: 60, rank: 2 },
      { userId: 'l4-3', name: 'Ishaan Kapoor', xp: 760, level: 4, image: null, currentStreak: 76, longestStreak: 76, rank: 3 },
      { userId: 'l4-4', name: 'Priya Sharma', xp: 720, level: 4, image: null, currentStreak: 72, longestStreak: 72, rank: 4 },
      { userId: 'l4-5', name: 'Kavita Chawla', xp: 640, level: 4, image: null, currentStreak: 58, longestStreak: 58, rank: 5 },
    ],
  },
  {
    level: 3,
    title: 'Consistent Performer',
    badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
    userRank: 1,
    totalInLevel: 215,
    xpRange: '350 - 599 XP',
    status: 'achieved',
    note: 'Held Rank #1 in Level 3 before advancing',
    members: [
      { userId: 'user-self', name: 'You', xp: 600, level: 4, image: '/images/avatar-riya.jpg', currentStreak: 60, longestStreak: 60, rank: 1 },
      { userId: 'l3-2', name: 'Rohan Das', xp: 590, level: 3, image: null, currentStreak: 61, longestStreak: 61, rank: 2 },
      { userId: 'l3-3', name: 'Neha Singh', xp: 560, level: 3, image: null, currentStreak: 56, longestStreak: 56, rank: 3 },
      { userId: 'l3-4', name: 'Aditya Khanna', xp: 520, level: 3, image: null, currentStreak: 52, longestStreak: 52, rank: 4 },
    ],
  },
  {
    level: 2,
    title: 'Routine Explorer',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    userRank: 1,
    totalInLevel: 320,
    xpRange: '150 - 349 XP',
    status: 'achieved',
    note: 'Held Rank #1 in Level 2 before advancing',
    members: [
      { userId: 'user-self', name: 'You', xp: 600, level: 4, image: '/images/avatar-riya.jpg', currentStreak: 60, longestStreak: 60, rank: 1 },
      { userId: 'l2-2', name: 'Alex Rivera', xp: 220, level: 2, image: null, currentStreak: 38, longestStreak: 38, rank: 2 },
      { userId: 'l2-3', name: 'Ananya Iyer', xp: 310, level: 2, image: null, currentStreak: 24, longestStreak: 24, rank: 3 },
      { userId: 'l2-4', name: 'Tanishq Rao', xp: 290, level: 2, image: null, currentStreak: 22, longestStreak: 22, rank: 4 },
    ],
  },
  {
    level: 1,
    title: 'Habit Starter',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
    userRank: 1,
    totalInLevel: 450,
    xpRange: '0 - 149 XP',
    status: 'achieved',
    note: 'Held Rank #1 in Level 1 before advancing',
    members: [
      { userId: 'user-self', name: 'You', xp: 600, level: 4, image: '/images/avatar-riya.jpg', currentStreak: 60, longestStreak: 60, rank: 1 },
      { userId: 'l1-2', name: 'Sameer Joshi', xp: 120, level: 1, image: null, currentStreak: 18, longestStreak: 18, rank: 2 },
      { userId: 'l1-3', name: 'Meera Nair', xp: 110, level: 1, image: null, currentStreak: 14, longestStreak: 14, rank: 3 },
    ],
  },
];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [period, setPeriod] = useState<PeriodType>('month');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | null>(4); // Default to current level (Level 4)
  const [allEntries, setAllEntries] = useState<LeaderboardEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const myRankRowRef = useRef<HTMLDivElement | null>(null);

  // Fetch current user profile
  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      try {
        const res = await api.me.get();
        return res.user;
      } catch {
        return null;
      }
    },
  });

  const currentUserId = userProfile?.id;
  const currentScope: ScopeType = activeTab === 'friends' ? 'friends' : 'global';

  // Fetch leaderboard data from API
  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ['leaderboard', currentScope, period],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?scope=${currentScope}&period=${period}&limit=20`);
      if (!res.ok) {
        throw new Error('Failed to load leaderboard');
      }
      const json = await res.json();
      return json.data as {
        entries: LeaderboardEntry[];
        myRank: LeaderboardEntry | null;
        nextCursor: string | null;
      };
    },
  });

  // Sync entries when query returns
  useEffect(() => {
    if (leaderboardData && leaderboardData.entries && leaderboardData.entries.length >= 4) {
      setAllEntries(leaderboardData.entries);
      setNextCursor(leaderboardData.nextCursor || null);
    } else {
      // Use the specific section dummy dataset
      const dataSet = activeTab === 'friends' ? FRIENDS_DATA[period] : GLOBAL_DATA[period];
      setAllEntries([...dataSet.topThree, ...dataSet.list]);
      setNextCursor(null);
    }
  }, [leaderboardData, activeTab, period]);

  // Handle cursor pagination
  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(
        `/api/leaderboard?scope=${currentScope}&period=${period}&cursor=${nextCursor}&limit=20`
      );
      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        setAllEntries((prev) => [...prev, ...(data.entries || [])]);
        setNextCursor(data.nextCursor || null);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Scroll to user row when switching to 'my-rank'
  useEffect(() => {
    if (activeTab === 'my-rank') {
      setTimeout(() => {
        myRankRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [activeTab]);

  // Active section data selection
  const sectionData = activeTab === 'friends' ? FRIENDS_DATA[period] : GLOBAL_DATA[period];

  // Top 3 Podium
  const rank1 = (allEntries.length >= 3 ? allEntries.find((e) => e.rank === 1) : null) || sectionData.topThree[0];
  const rank2 = (allEntries.length >= 3 ? allEntries.find((e) => e.rank === 2) : null) || sectionData.topThree[1];
  const rank3 = (allEntries.length >= 3 ? allEntries.find((e) => e.rank === 3) : null) || sectionData.topThree[2];

  // List from rank 4 downwards
  const listEntries = (allEntries.length >= 4 ? allEntries.filter((e) => e.rank >= 4) : null) || sectionData.list;

  // Selected level breakdown for "My Rank" view
  const currentLevelInfo = LEVEL_BREAKDOWNS.find((l) => l.level === (selectedLevelFilter ?? 4)) || LEVEL_BREAKDOWNS[1];

  const isEntryUser = (entry: LeaderboardEntry) =>
    entry.userId === 'user-self' ||
    entry.name === 'You' ||
    (currentUserId ? entry.userId === currentUserId : false);

  const getEntryName = (entry: LeaderboardEntry) =>
    isEntryUser(entry) ? 'You' : entry.name || 'Member';

  const getEntryImage = (entry: LeaderboardEntry) =>
    isEntryUser(entry) && userProfile?.image ? userProfile.image : entry.image;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-1 sm:pt-3 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1635] tracking-tight">
            {activeTab === 'friends'
              ? 'Friends Leaderboard'
              : activeTab === 'my-rank'
              ? 'My Rank & Level Standings'
              : 'Global Leaderboard'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {activeTab === 'friends'
              ? 'Track consistency and cheer on your friends.'
              : activeTab === 'my-rank'
              ? 'See the rank you hold at each level tier.'
              : 'Compete with habit builders worldwide.'}
          </p>
        </div>

        {/* Period Selector Dropdown */}
        <div className="relative inline-block self-start sm:self-auto">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
            className="appearance-none bg-white/90 hover:bg-white text-slate-700 hover:text-navy-950 font-bold text-xs sm:text-sm pl-4 pr-9 py-2 rounded-full border border-slate-200/90 shadow-2xs focus:outline-hidden cursor-pointer transition-all"
          >
            <option value="month">This Month</option>
            <option value="all">All time</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-white/60 backdrop-blur-xs rounded-full border border-slate-200/70 w-fit shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('global')}
          className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'global'
              ? 'bg-[#0B1635] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#0B1635] hover:bg-white/80'
          }`}
        >
          Global
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('friends')}
          className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'friends'
              ? 'bg-[#0B1635] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#0B1635] hover:bg-white/80'
          }`}
        >
          Friends
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my-rank')}
          className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'my-rank'
              ? 'bg-[#0B1635] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#0B1635] hover:bg-white/80'
          }`}
        >
          <span>My Rank</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold">
            #2
          </span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-3 gap-4 items-end">
            <Skeleton className="h-44 rounded-[22px]" />
            <Skeleton className="h-56 rounded-[24px]" />
            <Skeleton className="h-44 rounded-[22px]" />
          </div>
          <Skeleton className="h-64 rounded-[26px]" />
        </div>
      ) : activeTab === 'my-rank' ? (
        /* ==================== MY RANK SECTION: LEVEL BREAKDOWNS ==================== */
        <div className="space-y-6 pt-2">
          {/* Top Standing Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Global Standing */}
            <div className="bg-white/95 rounded-2xl p-4 border border-slate-100 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Global Standing
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-[#0B1635]">#5</span>
                <span className="text-xs font-semibold text-slate-500">/ 1,240</span>
              </div>
              <p className="text-[11px] font-bold text-indigo-600 mt-1">Top 1% Worldwide</p>
            </div>

            {/* Friends Standing */}
            <div className="bg-white/95 rounded-2xl p-4 border border-slate-100 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Friends Circle
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-[#0B1635]">#3</span>
                <span className="text-xs font-semibold text-slate-500">/ 18</span>
              </div>
              <p className="text-[11px] font-bold text-amber-600 mt-1">Podium Finisher</p>
            </div>

            {/* Current Level Rank */}
            <div className="bg-[#EBF7EE] rounded-2xl p-4 border border-emerald-200/90 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Level 4 Standing
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-emerald-950">#2</span>
                <span className="text-xs font-semibold text-emerald-700">/ 142</span>
              </div>
              <p className="text-[11px] font-bold text-emerald-700 mt-1">Runner Up in Tier</p>
            </div>

            {/* Current XP & Level */}
            <div className="bg-white/95 rounded-2xl p-4 border border-slate-100 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Level Progress
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-[#0B1635]">Level 4</span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 mt-1">600 / 850 XP</p>
            </div>
          </div>

          {/* Rank Held At Each Level Card Grid */}
          <div className="bg-white/95 rounded-[26px] p-5 sm:p-7 border border-slate-100 shadow-[0_4px_30px_rgba(11,22,53,0.04)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base sm:text-lg font-black text-[#0B1635]">
                  Rank Held at Each Level
                </h2>
              </div>
              <span className="text-xs font-medium text-slate-400">Click a level to inspect tier rankings</span>
            </div>

            {/* Level Tier Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {LEVEL_BREAKDOWNS.map((item) => {
                const isSelected = selectedLevelFilter === item.level;
                const isCurrentLevel = item.status === 'current';

                return (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setSelectedLevelFilter(item.level)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-[#0B1635] ring-2 ring-[#0B1635]/15 bg-slate-50 shadow-xs'
                        : isCurrentLevel
                        ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50'
                    }`}
                  >
                    {isCurrentLevel && (
                      <span className="absolute -top-2 right-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                        Current
                      </span>
                    )}

                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-[#0B1635]">Level {item.level}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${item.badgeBg}`}>
                        {item.xpRange}
                      </span>
                    </div>

                    <p className="text-[11px] font-bold text-slate-500 truncate mb-2">
                      {item.title}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                      <span className="text-[11px] font-medium text-slate-400">Your Rank:</span>
                      <span
                        className={`text-sm font-black ${
                          item.userRank
                            ? isCurrentLevel
                              ? 'text-emerald-700'
                              : 'text-indigo-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.userRank ? `#${item.userRank}` : '—'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Tier Spotlight Leaderboard */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-[#0B1635] flex items-center gap-2">
                    <span>Level {currentLevelInfo.level} Rankings ({currentLevelInfo.title})</span>
                    <span className="text-xs font-bold text-slate-400">· {currentLevelInfo.totalInLevel} members</span>
                  </h3>
                  <p className="text-xs font-semibold text-emerald-700 mt-0.5">{currentLevelInfo.note}</p>
                </div>
              </div>

              {/* Members in selected level */}
              <div className="space-y-1.5">
                {currentLevelInfo.members.map((entry) => {
                  const isUser = entry.name?.startsWith('You');

                  return (
                    <div
                      key={entry.userId}
                      ref={isUser ? myRankRowRef : null}
                      className={`flex items-center justify-between px-3.5 sm:px-5 py-3 rounded-2xl transition-all ${
                        isUser
                          ? 'bg-[#EBF7EE] border border-emerald-200/90 shadow-2xs ring-1 ring-emerald-500/20'
                          : 'bg-slate-50/70 border border-slate-100'
                      }`}
                    >
                      {/* Left: Rank & Avatar & Name */}
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <span
                          className={`w-6 sm:w-7 text-xs sm:text-sm font-black text-center ${
                            isUser ? 'text-emerald-800' : 'text-slate-600'
                          }`}
                        >
                          {entry.rank}
                        </span>

                        <Avatar
                          name={isUser && userProfile?.name ? userProfile.name : entry.name}
                          src={isUser && userProfile?.image ? userProfile.image : entry.image}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow-2xs shrink-0"
                        />

                        <div className="truncate">
                          <span
                            className={`text-xs sm:text-sm font-extrabold truncate ${
                              isUser ? 'text-emerald-950' : 'text-[#0B1635]'
                            }`}
                          >
                            {isUser ? 'You' : entry.name}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400 ml-2">
                            Level {entry.level}
                          </span>
                        </div>
                      </div>

                      {/* Right: Streak */}
                      <div
                        className={`text-xs sm:text-sm font-bold shrink-0 ${
                          isUser ? 'text-emerald-700 font-extrabold' : 'text-slate-700'
                        }`}
                      >
                        {entry.currentStreak} day streak
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== GLOBAL & FRIENDS SECTIONS ==================== */
        <>
          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 items-end pt-5 sm:pt-8 pb-3 max-w-xl mx-auto w-full">
            {/* Rank 2 (Left - Sneha Patel) */}
            <div className="flex flex-col items-center w-full">
              {/* Avatar with translucent lavender halo + Rank 2 Badge ON TOP of image */}
              <div className="relative mb-[-12px] sm:mb-[-14px] z-20 flex flex-col items-center">
                <div className="p-1 sm:p-1.5 rounded-full bg-[#E2DCFD]/80 shadow-2xs">
                  <img
                    src={getEntryImage(rank2) || '/images/avatar-sneha.jpg'}
                    alt={getEntryName(rank2)}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover"
                  />
                </div>
                {/* Badge 2 - clearly layered on top of the image */}
                <div className="absolute -bottom-2.5 sm:-bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#8E85F5] text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-xs z-30 ring-2 ring-white/80">
                  2
                </div>
              </div>

              {/* Card Body */}
              <div className="relative w-full bg-[#ECE8FE] hover:bg-white rounded-[22px] sm:rounded-[26px] pt-6 pb-4 sm:pt-7 sm:pb-5 px-2 sm:px-3 text-center min-h-[105px] sm:min-h-[116px] flex flex-col justify-center transition-all duration-200 hover:shadow-md border border-transparent hover:border-slate-100">
                <p className="text-xs sm:text-sm font-extrabold text-[#152A55] truncate max-w-full">
                  {getEntryName(rank2)}
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-[#6268BB] mt-0.5 sm:mt-1">
                  {rank2.currentStreak} day streak
                </p>
              </div>
            </div>

            {/* Rank 1 (Center - Aarav Mehta - Taller) */}
            <div className="flex flex-col items-center w-full">
              {/* Avatar with translucent golden-amber halo + Rank 1 Badge ON TOP of image */}
              <div className="relative mb-[-14px] sm:mb-[-16px] z-20 flex flex-col items-center">
                <div className="p-1.5 sm:p-2 rounded-full bg-[#FEDEA9]/85 shadow-2xs">
                  <img
                    src={getEntryImage(rank1) || '/images/avatar-aarav.jpg'}
                    alt={getEntryName(rank1)}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
                  />
                </div>
                {/* Badge 1 - clearly layered on top of the image */}
                <div className="absolute -bottom-3 sm:-bottom-3.5 left-1/2 -translate-x-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FFA21F] text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-xs z-30 ring-2 ring-white/80">
                  1
                </div>
              </div>

              {/* Card Body - Taller */}
              <div className="relative w-full bg-[#FEF0D8] hover:bg-white rounded-[24px] sm:rounded-[28px] pt-7 pb-5 sm:pt-8 sm:pb-6 px-3 sm:px-4 text-center min-h-[130px] sm:min-h-[142px] flex flex-col justify-center transition-all duration-200 hover:shadow-md border border-transparent hover:border-slate-100">
                <p className="text-sm sm:text-base font-extrabold text-[#152A55] truncate max-w-full">
                  {getEntryName(rank1)}
                </p>
                <p className="text-xs sm:text-sm font-extrabold text-[#E58A2B] mt-0.5 sm:mt-1">
                  {rank1.currentStreak} day streak
                </p>
              </div>
            </div>

            {/* Rank 3 (Right - Ishaan Kapoor) */}
            <div className="flex flex-col items-center w-full">
              {/* Avatar with translucent coral halo + Rank 3 Badge ON TOP of image */}
              <div className="relative mb-[-12px] sm:mb-[-14px] z-20 flex flex-col items-center">
                <div className="p-1 sm:p-1.5 rounded-full bg-[#FED4C7]/85 shadow-2xs">
                  <img
                    src={getEntryImage(rank3) || '/images/avatar-ishaan.jpg'}
                    alt={getEntryName(rank3)}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover"
                  />
                </div>
                {/* Badge 3 - clearly layered on top of the image */}
                <div className="absolute -bottom-2.5 sm:-bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#FB7546] text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-xs z-30 ring-2 ring-white/80">
                  3
                </div>
              </div>

              {/* Card Body */}
              <div className="relative w-full bg-[#FDECE5] hover:bg-white rounded-[22px] sm:rounded-[26px] pt-6 pb-4 sm:pt-7 sm:pb-5 px-2 sm:px-3 text-center min-h-[105px] sm:min-h-[116px] flex flex-col justify-center transition-all duration-200 hover:shadow-md border border-transparent hover:border-slate-100">
                <p className="text-xs sm:text-sm font-extrabold text-[#152A55] truncate max-w-full">
                  {getEntryName(rank3)}
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-[#D86940] mt-0.5 sm:mt-1">
                  {rank3.currentStreak} day streak
                </p>
              </div>
            </div>
          </div>

          {/* List from Rank 4 downwards */}
          <div className="bg-white/95 rounded-[26px] p-2.5 sm:p-4 border border-slate-100 shadow-[0_4px_30px_rgba(11,22,53,0.04)] space-y-1.5">
            {listEntries.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-navy-950">No rankings yet</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeTab === 'friends'
                    ? 'Connect with friends to see them on your leaderboard!'
                    : 'Check in to earn streak points and claim your spot!'}
                </p>
              </div>
            ) : (
              listEntries.map((entry) => {
                const isCurrentUser =
                  (currentUserId && entry.userId === currentUserId) || entry.name === 'You';
                const displayName = isCurrentUser ? 'You' : entry.name || 'Member';

                return (
                  <div
                    key={`${entry.userId}-${entry.rank}`}
                    ref={isCurrentUser ? myRankRowRef : null}
                    className={`flex items-center justify-between px-3.5 sm:px-5 py-3 transition-all rounded-2xl ${
                      isCurrentUser
                        ? 'bg-[#EBF7EE] border border-emerald-200/90 shadow-2xs'
                        : 'hover:bg-slate-50/80 border border-transparent'
                    }`}
                  >
                    {/* Left: Rank & Avatar & Name */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      {/* Rank Number */}
                      <span
                        className={`w-6 sm:w-7 text-xs sm:text-sm font-black text-center ${
                          isCurrentUser ? 'text-emerald-800' : 'text-slate-600'
                        }`}
                      >
                        {entry.rank}
                      </span>

                      {/* Avatar */}
                      <Avatar
                        name={isCurrentUser && userProfile?.name ? userProfile.name : entry.name}
                        src={isCurrentUser && userProfile?.image ? userProfile.image : entry.image}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow-2xs shrink-0"
                      />

                      {/* Name */}
                      <span
                        className={`text-xs sm:text-sm font-extrabold truncate ${
                          isCurrentUser ? 'text-emerald-950' : 'text-[#0B1635]'
                        }`}
                      >
                        {displayName}
                      </span>
                    </div>

                    {/* Right: Streak */}
                    <div
                      className={`text-xs sm:text-sm font-bold shrink-0 ${
                        isCurrentUser ? 'text-emerald-700 font-extrabold' : 'text-slate-700'
                      }`}
                    >
                      {entry.currentStreak} day streak
                    </div>
                  </div>
                );
              })
            )}

            {/* Load More Button for cursor pagination */}
            {nextCursor && (
              <div className="pt-3 pb-1 text-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-slate-700 hover:text-navy-950 bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>{isLoadingMore ? 'Loading more...' : 'Load more ranks'}</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
