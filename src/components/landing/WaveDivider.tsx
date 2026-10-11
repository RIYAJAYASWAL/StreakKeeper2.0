import React from 'react';

export function WaveDivider() {
  return (
    <div className="relative w-full overflow-hidden leading-none select-none -mt-1 pointer-events-none">
      <svg
        className="relative block w-full h-12 sm:h-20 lg:h-28 text-white fill-current"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <path d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,58.7C840,43,960,21,1080,21.3C1200,21,1320,43,1380,53.3L1440,64L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z" />
      </svg>
    </div>
  );
}
