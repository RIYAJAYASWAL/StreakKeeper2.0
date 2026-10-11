import React from 'react';
import {
  BookOpen,
  Dumbbell,
  Droplets,
  Smile,
  Ban,
  Target,
  Sparkles,
} from 'lucide-react';
import { HabitCategory } from '@/lib/api';

export function getCategoryConfig(category: HabitCategory | string) {
  switch (category) {
    case 'LEARNING':
      return {
        icon: <BookOpen className="w-5 h-5" />,
        bgClass: 'bg-[#EAF8F0] text-[#16A34A]',
        label: 'Learning',
      };
    case 'FITNESS':
      return {
        icon: <Dumbbell className="w-5 h-5" />,
        bgClass: 'bg-[#FFF2E8] text-[#FF8A3D]',
        label: 'Fitness',
      };
    case 'HEALTH':
      return {
        icon: <Droplets className="w-5 h-5" />,
        bgClass: 'bg-[#EAF3FE] text-[#2563EB]',
        label: 'Health',
      };
    case 'MINDFULNESS':
      return {
        icon: <Smile className="w-5 h-5" />,
        bgClass: 'bg-[#F3EDFD] text-[#8B5CF6]',
        label: 'Mindfulness',
      };
    case 'QUIT_BAD_HABIT':
      return {
        icon: <Ban className="w-5 h-5" />,
        bgClass: 'bg-[#FEECEB] text-[#EF4444]',
        label: 'Quit Bad Habit',
      };
    case 'PRODUCTIVITY':
      return {
        icon: <Target className="w-5 h-5" />,
        bgClass: 'bg-[#E6F7F5] text-[#1BA39C]',
        label: 'Productivity',
      };
    default:
      return {
        icon: <Sparkles className="w-5 h-5" />,
        bgClass: 'bg-[#F3EDFD] text-[#8B5CF6]',
        label: 'Other',
      };
  }
}
