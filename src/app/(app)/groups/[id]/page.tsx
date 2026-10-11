'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  Users2,
  BookOpen,
  Dumbbell,
  HeartPulse,
  Laptop,
  Moon,
  Sparkles,
  LogOut,
  UserPlus,
  Shield,
  Crown,
  Check,
  Share2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  const groupId = (params?.id as string) || '';

  // 1. Fetch group data
  const { data: groupData, isLoading, isError } = useQuery({
    queryKey: ['group-detail', groupId],
    queryFn: async () => {
      try {
        const res = await api.groups.get(groupId);
        return res;
      } catch {
        return null;
      }
    },
    enabled: Boolean(groupId),
  });

  // 2. Fetch members list
  const { data: membersData, isLoading: isMembersLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      try {
        const res = await api.groups.members(groupId);
        return Array.isArray(res) ? res : res?.members || [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(groupId),
  });

  // Fallback demo group if navigating to a demo id
  const fallbackGroup = {
    id: groupId,
    name:
      groupId === 'demo-g1'
        ? 'Habit Buddies'
        : groupId === 'demo-g2'
        ? 'Book Readers'
        : groupId === 'demo-g3'
        ? 'Fitness Fam'
        : groupId === 'demo-g4'
        ? 'Healthy Living'
        : groupId === 'demo-g5'
        ? 'Productivity Crew'
        : groupId === 'demo-g6'
        ? 'Mindful Minds'
        : 'Community Group',
    description:
      groupId === 'demo-g1'
        ? 'Support each other & grow. Daily check-ins, momentum sharing, and mutual accountability.'
        : groupId === 'demo-g2'
        ? 'Share books & thoughts. 20 minutes of reading every day to expand knowledge and focus.'
        : groupId === 'demo-g3'
        ? 'Stay fit, stay motivated. Group workouts, active streaks, and weekend challenges.'
        : 'A space to share progress, encourage each other, and build positive long-term routines.',
    category:
      groupId === 'demo-g2'
        ? 'LEARNING'
        : groupId === 'demo-g3'
        ? 'FITNESS'
        : groupId === 'demo-g4'
        ? 'HEALTH'
        : groupId === 'demo-g5'
        ? 'PRODUCTIVITY'
        : groupId === 'demo-g6'
        ? 'MINDFULNESS'
        : 'OTHER',
    type: groupId === 'demo-g5' ? 'PRIVATE' : 'PUBLIC',
    memberCount:
      groupId === 'demo-g1'
        ? 12
        : groupId === 'demo-g2'
        ? 48
        : groupId === 'demo-g3'
        ? 32
        : 25,
    isMember: groupId === 'demo-g1' || groupId === 'demo-g2' || groupId === 'demo-g3',
    myRole: 'MEMBER',
    members: [
      {
        id: 'm-1',
        role: 'OWNER',
        user: { id: 'u-1', name: 'Riya Jayaswal', level: 4, image: '/images/avatar-riya.jpg' },
      },
      {
        id: 'm-2',
        role: 'MEMBER',
        user: { id: 'u-2', name: 'Aarav Patel', level: 5 },
      },
      {
        id: 'm-3',
        role: 'MEMBER',
        user: { id: 'u-3', name: 'Elena Rostova', level: 3 },
      },
      {
        id: 'm-4',
        role: 'MEMBER',
        user: { id: 'u-4', name: 'Devon Miles', level: 6 },
      },
    ],
  };

  const group = groupData || fallbackGroup;

  const members =
    membersData && membersData.length > 0
      ? membersData
      : group?.members || fallbackGroup.members;

  // Leave group mutation
  const leaveMutation = useMutation({
    mutationFn: () => api.groups.leave(groupId),
    onSuccess: () => {
      showSuccessToast('You have left the group.', 'Left Group');
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
      router.push('/groups');
    },
    onError: (err: any) => {
      showErrorToast(err?.message || 'Failed to leave group', 'Error');
    },
  });

  // Join group mutation
  const joinMutation = useMutation({
    mutationFn: () => api.groups.join(groupId),
    onSuccess: () => {
      showSuccessToast('You joined the group!', 'Joined');
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    },
    onError: (err: any) => {
      showErrorToast(err?.message || 'Failed to join group', 'Error');
    },
  });

  const isJoined = Boolean(group?.isMember);

  // Icon mapping
  const renderGroupIcon = (name = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('book') || lower.includes('read')) {
      return (
        <div className="w-14 h-14 rounded-full bg-[#E1F7EC] text-[#10B981] flex items-center justify-center shadow-xs">
          <BookOpen className="w-7 h-7 stroke-[2.2]" />
        </div>
      );
    }
    if (lower.includes('fit') || lower.includes('gym')) {
      return (
        <div className="w-14 h-14 rounded-full bg-[#0D7A5F] text-white flex items-center justify-center shadow-xs">
          <Dumbbell className="w-7 h-7 stroke-[2.2]" />
        </div>
      );
    }
    if (lower.includes('health')) {
      return (
        <div className="w-14 h-14 rounded-full bg-[#FFEACC] text-[#D97706] flex items-center justify-center shadow-xs">
          <HeartPulse className="w-7 h-7 stroke-[2.2]" />
        </div>
      );
    }
    if (lower.includes('product') || lower.includes('crew')) {
      return (
        <div className="w-14 h-14 rounded-full bg-[#E0E7FF] text-[#4F46E5] flex items-center justify-center shadow-xs">
          <Laptop className="w-7 h-7 stroke-[2.2]" />
        </div>
      );
    }
    if (lower.includes('mind')) {
      return (
        <div className="w-14 h-14 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shadow-xs">
          <Moon className="w-7 h-7 stroke-[2.2]" />
        </div>
      );
    }
    return (
      <div className="w-14 h-14 rounded-full bg-[#FFE8DE] text-[#F97316] flex items-center justify-center shadow-xs">
        <Users className="w-7 h-7 stroke-[2.2]" />
      </div>
    );
  };

  return (
    <div className="relative min-h-[calc(100vh-2rem)] pb-16">
      {/* Background Scenic Landscape Artwork */}
      <div className="fixed inset-0 lg:left-64 pointer-events-none select-none z-0 overflow-hidden">
        <img
          src="/images/groups-bg.jpg"
          alt="Groups scenery background"
          className="w-full h-full object-cover object-bottom"
        />
      </div>

      <div className="relative z-10 space-y-6 pt-2 max-w-5xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/groups"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-navy-950 hover:text-navy-900 px-3.5 py-1.5 rounded-full bg-white/70 hover:bg-white border border-white/60 shadow-2xs transition-all group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Groups</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              showSuccessToast('Group link copied to clipboard', 'Copied');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-navy-950 px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white border border-white/60 shadow-2xs transition-all"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Share</span>
          </button>
        </div>

        {/* Group Header Card */}
        <div className="bg-white/90 rounded-[26px] p-6 sm:p-7 border border-white/80 shadow-[0_8px_32px_rgba(31,38,135,0.06)] relative overflow-hidden space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
            <div className="flex items-start gap-4 sm:gap-5 min-w-0 flex-1">
              {renderGroupIcon(group.name)}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-navy-950 tracking-tight leading-tight">
                    {group.name}
                  </h1>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 tracking-wide border border-slate-200/60">
                    {group.type}
                  </span>
                  {group.category && (
                    <span className="text-[10px] font-extrabold lowercase capitalize px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/50">
                      {group.category.toLowerCase()}
                    </span>
                  )}
                </div>

                <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Users2 className="w-3.5 h-3.5 text-slate-400" />
                    {group.memberCount} active members
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-3 leading-relaxed max-w-2xl">
                  {group.description}
                </p>
              </div>
            </div>

            {/* Action Button: Leave or Join */}
            <div className="shrink-0 sm:self-start">
              {isJoined ? (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to leave this group?')) {
                      leaveMutation.mutate();
                    }
                  }}
                  disabled={leaveMutation.isPending}
                  className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs sm:text-sm font-bold shadow-2xs hover:shadow-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{leaveMutation.isPending ? 'Leaving...' : 'Leave Group'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => joinMutation.mutate()}
                  disabled={joinMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B1635] hover:bg-[#1B2A5E] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{joinMutation.isPending ? 'Joining...' : 'Join Group'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Group Members Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-navy-950 tracking-tight flex items-center gap-2">
              <span>Members</span>
              <span className="text-xs font-bold text-slate-500 bg-white/70 px-2 py-0.5 rounded-full border border-white/60">
                {members.length}
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {isMembersLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white/80 rounded-[20px] p-4 border border-white/60 flex items-center gap-3.5"
                  >
                    <Skeleton className="w-11 h-11 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))
              : members.map((member: any) => {
                  const user = member.user || member;
                  const isOwner = member.role === 'OWNER';
                  const isAdmin = member.role === 'ADMIN';

                  return (
                    <div
                      key={member.id || user.id}
                      className="bg-white/90 hover:bg-white rounded-[20px] p-4 border border-white/80 shadow-[0_4px_20px_rgba(31,38,135,0.04)] hover:shadow-[0_6px_24px_rgba(31,38,135,0.08)] transition-all flex items-center gap-3.5 group"
                    >
                      {/* Avatar */}
                      <Avatar
                        name={user.name || 'Member'}
                        src={user.image}
                        size="md"
                        className="shrink-0"
                      />

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs sm:text-sm font-extrabold text-navy-950 truncate">
                            {user.name || 'Group Member'}
                          </h3>
                          {isOwner && (
                            <span title="Owner" className="text-amber-500 shrink-0">
                              <Crown className="w-3.5 h-3.5 fill-amber-500" />
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>Level {user.level || 1}</span>
                          <span>·</span>
                          <span
                            className={`font-bold ${
                              isOwner
                                ? 'text-amber-600'
                                : isAdmin
                                ? 'text-indigo-600'
                                : 'text-slate-500'
                            }`}
                          >
                            {isOwner ? 'Owner' : isAdmin ? 'Admin' : 'Member'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>
    </div>
  );
}
