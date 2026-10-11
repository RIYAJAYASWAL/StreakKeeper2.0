'use client';

import React from 'react';
import { Zap, BarChart3, Brain, Users2, Trophy } from 'lucide-react';

interface FeatureItem {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}

const features: FeatureItem[] = [
  {
    icon: <Zap className="w-5 h-5 fill-current" />,
    iconBg: 'bg-purple-100/90',
    iconColor: 'text-purple-600',
    title: 'Build Habits',
    description: 'Create your own habits or choose from our library.',
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    iconBg: 'bg-blue-100/90',
    iconColor: 'text-blue-600',
    title: 'Track Progress',
    description: 'Visualize your streaks, see real improvements.',
  },
  {
    icon: <Brain className="w-5 h-5" />,
    iconBg: 'bg-emerald-100/90',
    iconColor: 'text-emerald-600',
    title: 'Get AI Insights',
    description: 'Personalized tips to keep you on track.',
  },
  {
    icon: <Users2 className="w-5 h-5" />,
    iconBg: 'bg-indigo-100/90',
    iconColor: 'text-indigo-600',
    title: 'Join Communities',
    description: 'Grow together with like-minded people.',
  },
  {
    icon: <Trophy className="w-5 h-5" />,
    iconBg: 'bg-amber-100/90',
    iconColor: 'text-amber-500',
    title: 'Earn Rewards',
    description: 'Stay consistent and unlock achievements.',
  },
];

export function FeaturesStrip() {
  return (
    <section id="features" className="relative bg-white pt-8 pb-16 sm:py-20 lg:py-24 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center text-center p-4 rounded-2xl transition-all duration-300 hover:-translate-y-1.5 hover:bg-slate-50/60 group"
            >
              {/* Icon Badge */}
              <div
                className={`w-14 h-14 rounded-full ${feature.iconBg} ${feature.iconColor} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 shadow-xs`}
              >
                {feature.icon}
              </div>

              {/* Title */}
              <h3 className="text-base sm:text-lg font-bold text-[#0B1635] mb-2 tracking-tight">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-[210px]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
