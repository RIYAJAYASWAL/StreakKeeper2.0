'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Users,
  Users2,
  BookOpen,
  Flame,
  Dumbbell,
  HeartPulse,
  Laptop,
  Moon,
  Smile,
  MoreHorizontal,
  Check,
  UserPlus,
  Sparkles,
  Lock,
  Globe,
  X,
  LogOut,
  Share2,
} from 'lucide-react';
import { api, HabitCategory } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';

export interface GroupCardItem {
  id: string;
  name: string;
  memberCount: number;
  type: 'PUBLIC' | 'PRIVATE' | 'HABIT' | 'FRIENDS';
  category?: string | null;
  description: string;
  isMember?: boolean;
  myRole?: string | null;
  iconBg: string;
  iconColor: string;
  iconType: 'buddies' | 'books' | 'fitness' | 'health' | 'productivity' | 'mindful' | 'default';
}

// Fallback demo groups matching the user's reference screenshot exactly
const DEFAULT_YOUR_GROUPS: GroupCardItem[] = [
  {
    id: 'demo-g1',
    name: 'Habit Buddies',
    memberCount: 12,
    type: 'PUBLIC',
    category: 'OTHER',
    description: 'Support each other & grow',
    isMember: true,
    myRole: 'MEMBER',
    iconBg: 'bg-[#FFE8DE]',
    iconColor: 'text-[#F97316]',
    iconType: 'buddies',
  },
  {
    id: 'demo-g2',
    name: 'Book Readers',
    memberCount: 48,
    type: 'PUBLIC',
    category: 'LEARNING',
    description: 'Share books & thoughts',
    isMember: true,
    myRole: 'MEMBER',
    iconBg: 'bg-[#E1F7EC]',
    iconColor: 'text-[#10B981]',
    iconType: 'books',
  },
  {
    id: 'demo-g3',
    name: 'Fitness Fam',
    memberCount: 32,
    type: 'PUBLIC',
    category: 'FITNESS',
    description: 'Stay fit, stay motivated',
    isMember: true,
    myRole: 'MEMBER',
    iconBg: 'bg-[#0D7A5F]',
    iconColor: 'text-white',
    iconType: 'fitness',
  },
];

const DEFAULT_DISCOVER_GROUPS: GroupCardItem[] = [
  {
    id: 'demo-g4',
    name: 'Healthy Living',
    memberCount: 26,
    type: 'PUBLIC',
    category: 'HEALTH',
    description: 'Better habits, healthier you',
    isMember: false,
    iconBg: 'bg-[#FFEACC]',
    iconColor: 'text-[#D97706]',
    iconType: 'health',
  },
  {
    id: 'demo-g5',
    name: 'Productivity Crew',
    memberCount: 41,
    type: 'PRIVATE',
    category: 'PRODUCTIVITY',
    description: 'Build your dream life',
    isMember: false,
    iconBg: 'bg-[#E0E7FF]',
    iconColor: 'text-[#4F46E5]',
    iconType: 'productivity',
  },
  {
    id: 'demo-g6',
    name: 'Mindful Minds',
    memberCount: 37,
    type: 'PUBLIC',
    category: 'MINDFULNESS',
    description: 'Less stress, more peace',
    isMember: false,
    iconBg: 'bg-[#EDE9FE]',
    iconColor: 'text-[#7C3AED]',
    iconType: 'mindful',
  },
];

const DEFAULT_SIMILAR_PEOPLE = [
  {
    id: 'sim-1',
    name: 'Aarav Patel',
    level: 5,
    currentStreak: 21,
    sharedCategories: ['FITNESS', 'MINDFULNESS'],
    matchScore: 0.88,
  },
  {
    id: 'sim-2',
    name: 'Elena Rostova',
    level: 4,
    currentStreak: 14,
    sharedCategories: ['LEARNING', 'PRODUCTIVITY'],
    matchScore: 0.75,
  },
  {
    id: 'sim-3',
    name: 'Devon Miles',
    level: 6,
    currentStreak: 28,
    sharedCategories: ['HEALTH', 'FITNESS'],
    matchScore: 0.7,
  },
];

export default function GroupsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Create group form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<HabitCategory>('FITNESS');
  const [newType, setNewType] = useState<'HABIT' | 'FRIENDS'>('HABIT');

  // 1. Fetch joined groups
  const { data: myGroupsData, isLoading: isMyLoading } = useQuery({
    queryKey: ['my-groups'],
    queryFn: async () => {
      try {
        const res = await api.groups.listMine();
        return Array.isArray(res) ? res : res?.groups || [];
      } catch {
        return [];
      }
    },
  });

  // 2. Fetch discoverable groups
  const { data: discoverData, isLoading: isDiscoverLoading } = useQuery({
    queryKey: ['discover-groups'],
    queryFn: async () => {
      try {
        const res = await api.groups.discover();
        return Array.isArray(res) ? res : res?.groups || [];
      } catch {
        return [];
      }
    },
  });

  // 3. Fetch similar people
  const { data: similarPeopleData, isLoading: isPeopleLoading } = useQuery({
    queryKey: ['similar-people'],
    queryFn: async () => {
      try {
        const res = await api.social.getSimilarPeople();
        return Array.isArray(res) ? res : res?.similar || [];
      } catch {
        return [];
      }
    },
  });

  // Helper to map group category to icon styling
  const mapGroupStyle = (g: any, fallbackIdx: number): GroupCardItem => {
    const name = g.name || 'Group';
    const lower = name.toLowerCase();
    let iconType: GroupCardItem['iconType'] = 'default';
    let iconBg = 'bg-[#FFE8DE]';
    let iconColor = 'text-[#F97316]';

    if (lower.includes('buddy') || lower.includes('buddies')) {
      iconType = 'buddies';
      iconBg = 'bg-[#FFE8DE]';
      iconColor = 'text-[#F97316]';
    } else if (lower.includes('book') || lower.includes('read')) {
      iconType = 'books';
      iconBg = 'bg-[#E1F7EC]';
      iconColor = 'text-[#10B981]';
    } else if (lower.includes('fit') || lower.includes('gym')) {
      iconType = 'fitness';
      iconBg = 'bg-[#0D7A5F]';
      iconColor = 'text-white';
    } else if (lower.includes('health')) {
      iconType = 'health';
      iconBg = 'bg-[#FFEACC]';
      iconColor = 'text-[#D97706]';
    } else if (lower.includes('product') || lower.includes('crew')) {
      iconType = 'productivity';
      iconBg = 'bg-[#E0E7FF]';
      iconColor = 'text-[#4F46E5]';
    } else if (lower.includes('mind')) {
      iconType = 'mindful';
      iconBg = 'bg-[#EDE9FE]';
      iconColor = 'text-[#7C3AED]';
    } else {
      const styles = [
        { bg: 'bg-[#FFE8DE]', color: 'text-[#F97316]', type: 'buddies' as const },
        { bg: 'bg-[#E1F7EC]', color: 'text-[#10B981]', type: 'books' as const },
        { bg: 'bg-[#0D7A5F]', color: 'text-white', type: 'fitness' as const },
        { bg: 'bg-[#FFEACC]', color: 'text-[#D97706]', type: 'health' as const },
        { bg: 'bg-[#E0E7FF]', color: 'text-[#4F46E5]', type: 'productivity' as const },
        { bg: 'bg-[#EDE9FE]', color: 'text-[#7C3AED]', type: 'mindful' as const },
      ];
      const selected = styles[fallbackIdx % styles.length];
      iconBg = selected.bg;
      iconColor = selected.color;
      iconType = selected.type;
    }

    const memberCount = g.memberCount ?? g._count?.members ?? 1;
    const type = g.type === 'FRIENDS' ? 'PRIVATE' : 'PUBLIC';

    return {
      id: g.id,
      name: g.name,
      memberCount,
      type,
      category: g.category,
      description: g.description || 'Consistency, encouragement, and habit growth together.',
      isMember: Boolean(g.isMember || g.myRole),
      myRole: g.myRole || null,
      iconBg,
      iconColor,
      iconType,
    };
  };

  // Merge real groups with fallback screenshot defaults
  const myGroups: GroupCardItem[] = useMemo(() => {
    if (myGroupsData && myGroupsData.length > 0) {
      return myGroupsData.map((g: any, i: number) => ({
        ...mapGroupStyle(g, i),
        isMember: true,
      }));
    }
    return DEFAULT_YOUR_GROUPS;
  }, [myGroupsData]);

  const discoverGroups: GroupCardItem[] = useMemo(() => {
    if (discoverData && discoverData.length > 0) {
      return discoverData.map((g: any, i: number) => ({
        ...mapGroupStyle(g, i),
        isMember: false,
      }));
    }
    return DEFAULT_DISCOVER_GROUPS;
  }, [discoverData]);

  const similarPeople = useMemo(() => {
    if (similarPeopleData && similarPeopleData.length > 0) {
      return similarPeopleData;
    }
    return DEFAULT_SIMILAR_PEOPLE;
  }, [similarPeopleData]);

  // Mutations
  const joinMutation = useMutation({
    mutationFn: (groupId: string) => api.groups.join(groupId),
    onSuccess: (_, groupId) => {
      showSuccessToast('You joined the group! Start building momentum together.', 'Group Joined');
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['discover-groups'] });
    },
    onError: (err: any) => {
      showErrorToast(err?.message || 'Could not join group', 'Error');
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (groupId: string) => api.groups.leave(groupId),
    onSuccess: () => {
      showSuccessToast('You have left the group.', 'Left Group');
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['discover-groups'] });
      setMenuOpenId(null);
    },
    onError: (err: any) => {
      showErrorToast(err?.message || 'Could not leave group', 'Error');
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; category?: HabitCategory; type: 'HABIT' | 'FRIENDS' }) =>
      api.groups.create(data),
    onSuccess: (res: any) => {
      showSuccessToast('New group created successfully!', 'Group Created');
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['discover-groups'] });
      setIsCreateModalOpen(false);
      setNewName('');
      setNewDescription('');
      if (res?.group?.id) {
        router.push(`/groups/${res.group.id}`);
      }
    },
    onError: (err: any) => {
      showErrorToast(err?.message || 'Failed to create group', 'Error');
    },
  });

  const addFriendMutation = useMutation({
    mutationFn: (targetUserId: string) => api.social.sendFriendRequest(targetUserId),
    onSuccess: () => {
      showSuccessToast('Friend request sent!', 'Connected');
      queryClient.invalidateQueries({ queryKey: ['similar-people'] });
    },
    onError: (err: any) => {
      showErrorToast(err?.message || 'Friend request already sent', 'Notice');
    },
  });

  // Render group icon
  const renderGroupIcon = (type: GroupCardItem['iconType'], className = 'w-6 h-6') => {
    switch (type) {
      case 'buddies':
        return <Users className={className} />;
      case 'books':
        return <BookOpen className={className} />;
      case 'fitness':
        return <Dumbbell className={className} />;
      case 'health':
        return <HeartPulse className={className} />;
      case 'productivity':
        return <Laptop className={className} />;
      case 'mindful':
        return <Moon className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  // Group Card Component
  const renderGroupCard = (group: GroupCardItem) => {
    const isJoined = group.isMember;

    return (
      <div
        key={group.id}
        onClick={() => router.push(`/groups/${group.id}`)}
        className="bg-white/90 hover:bg-white rounded-[22px] p-4 sm:p-4.5 border border-white/80 shadow-[0_4px_24px_rgba(31,38,135,0.04)] hover:shadow-[0_8px_30px_rgba(31,38,135,0.08)] transition-all duration-200 flex flex-col justify-between min-h-[132px] sm:min-h-[136px] relative group cursor-pointer"
      >
        {/* Top Section: Icon, Title, Subtext & More Menu */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {/* Colored Icon Tile */}
              <div
                className={`w-11 h-11 rounded-full ${group.iconBg} ${group.iconColor} flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105 duration-200`}
              >
                {renderGroupIcon(group.iconType, 'w-5 h-5 stroke-[2.2]')}
              </div>

              {/* Title & Stats */}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-extrabold text-navy-950 tracking-tight leading-snug group-hover:text-navy-900 transition-colors truncate">
                  {group.name}
                </h3>
                <div className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <span>{group.memberCount} members</span>
                  <span>·</span>
                  <span className="capitalize">{group.type.toLowerCase()}</span>
                </div>
              </div>
            </div>

            {/* "..." More menu button */}
            <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setMenuOpenId(menuOpenId === group.id ? null : group.id)}
                className="p-1.5 rounded-full text-slate-400 hover:text-navy-950 hover:bg-slate-100/80 transition-colors"
                aria-label="Group options"
              >
                <MoreHorizontal className="w-4.5 h-4.5" />
              </button>

              {menuOpenId === group.id && (
                <div className="absolute right-0 top-8 z-30 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.origin + `/groups/${group.id}`);
                      showSuccessToast('Group link copied to clipboard', 'Copied');
                      setMenuOpenId(null);
                    }}
                    className="w-full text-left px-3.5 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Share2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Share link</span>
                  </button>

                  {isJoined ? (
                    <button
                      type="button"
                      onClick={() => leaveMutation.mutate(group.id)}
                      disabled={leaveMutation.isPending}
                      className="w-full text-left px-3.5 py-1.5 text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Leave group</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        joinMutation.mutate(group.id);
                        setMenuOpenId(null);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 font-semibold"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Join group</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-600 font-medium line-clamp-1 mt-1 leading-snug">
            {group.description}
          </p>
        </div>

        {/* Bottom Action: Join / Joined Button */}
        <div className="mt-3.5 flex items-center" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => {
              if (isJoined) {
                router.push(`/groups/${group.id}`);
              } else {
                joinMutation.mutate(group.id);
              }
            }}
            disabled={joinMutation.isPending && joinMutation.variables === group.id}
            className={`px-4 py-1.5 sm:px-5 sm:py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 ${isJoined
              ? 'bg-slate-100 hover:bg-slate-200 text-navy-950 border border-slate-200/80'
              : 'bg-[#0B1635] hover:bg-[#1B2A5E] text-white'
              }`}
          >
            {isJoined ? 'Joined' : 'Join'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-[calc(100vh-2rem)] pb-16">
      {/* Background Scenic Landscape Artwork provided by user */}
      <div className="fixed inset-0 lg:left-64 pointer-events-none select-none z-0 overflow-hidden">
        <img
          src="/images/groups-bg.jpg"
          alt="Groups scenery background"
          className="w-full h-full object-cover object-bottom"
        />
      </div>

      <div className="relative z-10 space-y-6 pt-2 max-w-7xl mx-auto">
        {/* Header: Title & "+ Create Group" button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-[28px] font-black text-navy-950 tracking-tight">
            Groups
          </h1>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0B1635] hover:bg-[#1B2A5E] text-white font-bold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Group</span>
          </button>
        </div>

        {/* Tabs: "My Groups" & "Discover" */}
        <div className="inline-flex items-center p-1 rounded-full bg-slate-200/60 backdrop-blur-xs border border-white/60 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${activeTab === 'my'
              ? 'bg-white text-navy-950 shadow-xs'
              : 'text-slate-600 hover:text-navy-950'
              }`}
          >
            My Groups
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${activeTab === 'discover'
              ? 'bg-white text-navy-950 shadow-xs'
              : 'text-slate-600 hover:text-navy-950'
              }`}
          >
            Discover
          </button>
        </div>

        {/* TAB 1: My Groups (2-column layout matching reference screenshot) */}
        {activeTab === 'my' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 items-start">
            {/* Left Column: Your Groups */}
            <div className="space-y-4">
              <h2 className="text-sm sm:text-base font-extrabold text-navy-950 tracking-tight">
                Your Groups
              </h2>

              <div className="space-y-4">
                {isMyLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white/80 rounded-[22px] p-4 border border-white/60 h-32 flex flex-col justify-between"
                    >
                      <div className="flex gap-3">
                        <Skeleton className="w-11 h-11 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-3.5 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16 rounded-xl" />
                    </div>
                  ))
                  : myGroups.map((g) => renderGroupCard(g))}
              </div>
            </div>

            {/* Right Column: Discover Groups */}
            <div className="space-y-4">
              <h2 className="text-sm sm:text-base font-extrabold text-navy-950 tracking-tight">
                Discover Groups
              </h2>

              <div className="space-y-4">
                {isDiscoverLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white/80 rounded-[22px] p-4 border border-white/60 h-32 flex flex-col justify-between"
                    >
                      <div className="flex gap-3">
                        <Skeleton className="w-11 h-11 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-3.5 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16 rounded-xl" />
                    </div>
                  ))
                  : discoverGroups.map((g) => renderGroupCard(g))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Discover Tab */}
        {activeTab === 'discover' && (
          <div className="space-y-8">
            {/* Section 1: Discover Groups */}
            <div className="space-y-4">
              <h2 className="text-sm sm:text-base font-extrabold text-navy-950 tracking-tight">
                Discover Groups
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {isDiscoverLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white/80 rounded-[24px] p-5 border border-white/60 h-40 flex flex-col justify-between"
                    >
                      <div className="flex gap-3">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-28" />
                          <Skeleton className="h-3.5 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-7 w-20 rounded-xl" />
                    </div>
                  ))
                  : discoverGroups.map((g) => renderGroupCard(g))}
              </div>
            </div>

            {/* Section 2: People like you */}
            <div className="space-y-4 pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-navy-950 tracking-tight flex items-center gap-2">
                    <span>People like you</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Smart Matches
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Connect with habit builders who share your focus and momentum.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {isPeopleLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white/85 rounded-[22px] p-5 border border-white/60 flex items-center gap-4"
                    >
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))
                  : similarPeople.map((person: any) => {
                    const matchPct = Math.round((person.matchScore || 0.8) * 100);

                    return (
                      <div
                        key={person.id}
                        className="bg-white/90 hover:bg-white rounded-[22px] p-5 border border-white/80 shadow-[0_4px_24px_rgba(31,38,135,0.04)] hover:shadow-[0_8px_30px_rgba(31,38,135,0.08)] transition-all flex flex-col justify-between gap-4 group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Avatar Initial */}
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center shrink-0 shadow-xs text-sm">
                              {person.name?.[0] || 'U'}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-extrabold text-navy-950 truncate">
                                {person.name}
                              </h3>
                              <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span>Level {person.level || 1}</span>
                                <span>·</span>
                                <span className="flex items-center gap-0.5 text-amber-600">
                                  <Flame className="w-3 h-3 fill-amber-500" />
                                  {person.currentStreak || 0}d streak
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Match Score Badge */}
                          <div className="shrink-0 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {matchPct}% match
                          </div>
                        </div>

                        {/* Shared categories tag list */}
                        {person.sharedCategories && person.sharedCategories.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {person.sharedCategories.map((cat: string) => (
                              <span
                                key={cat}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 lowercase capitalize"
                              >
                                {cat.toLowerCase()}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Action Button: Add Friend */}
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => addFriendMutation.mutate(person.id)}
                            disabled={addFriendMutation.isPending && addFriendMutation.variables === person.id}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0B1635] hover:bg-[#1B2A5E] text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add friend</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create Group */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/45 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="bg-white rounded-[26px] max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Users2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-navy-950 tracking-tight">Create Group</h2>
                  <p className="text-xs text-slate-500 font-medium">Build a community around consistency.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newName.trim()) {
                  showErrorToast('Group name is required', 'Validation Error');
                  return;
                }
                createGroupMutation.mutate({
                  name: newName.trim(),
                  description: newDescription.trim() || undefined,
                  category: newCategory,
                  type: newType,
                });
              }}
              className="space-y-4"
            >
              {/* Group Name */}
              <div>
                <label htmlFor="group-name" className="block text-xs font-bold text-navy-950 mb-1.5">
                  Group Name *
                </label>
                <input
                  id="group-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. 5 AM Morning Club, Read Daily"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-navy-950 placeholder:text-slate-400 focus:bg-white focus:border-navy-900 focus:ring-2 focus:ring-navy-900/10 outline-hidden transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="group-desc" className="block text-xs font-bold text-navy-950 mb-1.5">
                  Description
                </label>
                <textarea
                  id="group-desc"
                  rows={3}
                  maxLength={500}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What is the group focus? Who should join?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-navy-950 placeholder:text-slate-400 focus:bg-white focus:border-navy-900 focus:ring-2 focus:ring-navy-900/10 outline-hidden transition-all resize-none"
                />
              </div>

              {/* Category & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="group-cat" className="block text-xs font-bold text-navy-950 mb-1.5">
                    Category
                  </label>
                  <select
                    id="group-cat"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as HabitCategory)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-navy-950 focus:bg-white focus:border-navy-900 outline-hidden transition-all"
                  >
                    <option value="FITNESS">Fitness & Workout</option>
                    <option value="MINDFULNESS">Mindfulness & Meditation</option>
                    <option value="PRODUCTIVITY">Productivity & Focus</option>
                    <option value="LEARNING">Reading & Learning</option>
                    <option value="HEALTH">Health & Nutrition</option>
                    <option value="OTHER">Other / General</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="group-type" className="block text-xs font-bold text-navy-950 mb-1.5">
                    Type
                  </label>
                  <select
                    id="group-type"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as 'HABIT' | 'FRIENDS')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-navy-950 focus:bg-white focus:border-navy-900 outline-hidden transition-all"
                  >
                    <option value="HABIT">Public (Open habit group)</option>
                    <option value="FRIENDS">Private (Invite only)</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-navy-950 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGroupMutation.isPending || !newName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#0B1635] hover:bg-[#1B2A5E] text-white text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50 transition-all"
                >
                  {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
