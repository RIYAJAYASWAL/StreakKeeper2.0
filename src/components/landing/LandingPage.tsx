'use client';

import React from 'react';
import { Navbar } from './Navbar';
import { HeroSection } from './HeroSection';
import { WaveDivider } from './WaveDivider';
import { FeaturesStrip } from './FeaturesStrip';
import { WhySection } from './WhySection';
import { Footer } from './Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#0B1635] flex flex-col selection:bg-blue-500/20 selection:text-navy-950">
      {/* Fixed Sticky Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Hero Section with User-provided Mountain Background & Tilted 3D Dashboard */}
        <HeroSection />

        {/* Curved Wave Transition */}
        <WaveDivider />

        {/* 5-Card Feature Strip */}
        <FeaturesStrip />

        {/* Why StreakKeeper Section with User-provided Background (Girl on Rock overlooking Valley) */}
        <WhySection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
