import React from 'react';

interface SeemadrishtiLogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  animated?: boolean;
}

export const SeemadrishtiLogo: React.FC<SeemadrishtiLogoProps> = ({
  className = '',
  size = 48,
  showWordmark = false,
  animated = false
}) => {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]"
        id="seemadrishti-brand-logo"
      >
        <defs>
          {/* Main Cyan to Emerald Gradient */}
          <linearGradient id="sdGradientPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="40%" stopColor="#06B6D4" />
            <stop offset="80%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Golden Saffron Tactical Accent Gradient */}
          <linearGradient id="sdGradientAccent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          {/* Shield Core Glass Background */}
          <linearGradient id="sdShieldBg" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#0E1E2E" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#05121E" stopOpacity="0.95" />
          </linearGradient>

          {/* High-Tech Glow Filter */}
          <filter id="sdGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Radar Sweep Arc Pattern */}
          <radialGradient id="sdRadarSweep" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#10B981" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Outer Hexagonal Defense Shield (Seema Perimeter) */}
        <polygon
          points="60,8 106,24 106,64 60,112 14,64 14,24"
          fill="url(#sdShieldBg)"
          stroke="url(#sdGradientPrimary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Inner Shield Chamfer Bevel */}
        <polygon
          points="60,16 98,30 98,62 60,102 22,62 22,30"
          fill="none"
          stroke="#06B6D4"
          strokeWidth="1.2"
          strokeOpacity="0.35"
          strokeLinejoin="round"
        />

        {/* Tactical Corner Armor Ticks */}
        <path d="M 60 12 L 60 20" stroke="url(#sdGradientAccent)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 102 26 L 94 30" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" />
        <path d="M 18 26 L 26 30" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" />
        <path d="M 60 108 L 60 98" stroke="url(#sdGradientPrimary)" strokeWidth="2.5" strokeLinecap="round" />

        {/* 2. Concentric Radar & Sonar Grid */}
        <circle cx="60" cy="56" r="34" fill="none" stroke="#06B6D4" strokeWidth="0.8" strokeOpacity="0.25" strokeDasharray="3 3" />
        <circle cx="60" cy="56" r="26" fill="url(#sdRadarSweep)" stroke="url(#sdGradientPrimary)" strokeWidth="1" strokeOpacity="0.4" />
        <circle cx="60" cy="56" r="18" fill="none" stroke="#10B981" strokeWidth="0.9" strokeOpacity="0.4" />

        {/* Crosshair Coordinate Axis Lines */}
        <line x1="60" y1="28" x2="60" y2="84" stroke="url(#sdGradientPrimary)" strokeWidth="1" strokeOpacity="0.45" />
        <line x1="32" y1="56" x2="88" y2="56" stroke="url(#sdGradientPrimary)" strokeWidth="1" strokeOpacity="0.45" />

        {/* 3. The Central Cybernetic Eye (Drishti Vision) */}
        {/* Upper Eyelid / Sensor Arc */}
        <path
          d="M 30 56 C 42 38, 78 38, 90 56"
          fill="none"
          stroke="url(#sdGradientPrimary)"
          strokeWidth="3.2"
          strokeLinecap="round"
          filter="url(#sdGlow)"
        />

        {/* Lower Eyelid / Sensor Arc */}
        <path
          d="M 30 56 C 42 74, 78 74, 90 56"
          fill="none"
          stroke="url(#sdGradientPrimary)"
          strokeWidth="3.2"
          strokeLinecap="round"
          filter="url(#sdGlow)"
        />

        {/* Inner Optical Lens Contour */}
        <path
          d="M 38 56 C 46 44, 74 44, 82 56 C 74 68, 46 68, 38 56 Z"
          fill="#082F49"
          fillOpacity="0.75"
          stroke="#38BDF8"
          strokeWidth="1.2"
        />

        {/* 4. Glowing Iris & Focal Pupil (All-Seeing Aperture) */}
        <circle cx="60" cy="56" r="10" fill="#041E2D" stroke="url(#sdGradientAccent)" strokeWidth="2" filter="url(#sdGlow)" />
        <circle cx="60" cy="56" r="5" fill="#38BDF8" />
        <circle cx="60" cy="56" r="2.2" fill="#FFFFFF" />

        {/* Radar Scanning Sweep Reticle (Top-Right Active Angle) */}
        <path
          d="M 60 56 L 82 40"
          stroke="url(#sdGradientAccent)"
          strokeWidth="2"
          strokeLinecap="round"
          className={animated ? 'animate-pulse' : ''}
        />
        <circle cx="82" cy="40" r="2" fill="#F59E0B" />

        {/* Neural Vector Traces & Tech Nodes */}
        <circle cx="36" cy="38" r="1.5" fill="#06B6D4" />
        <circle cx="84" cy="74" r="1.5" fill="#10B981" />
        <line x1="36" y1="38" x2="42" y2="44" stroke="#06B6D4" strokeWidth="0.8" strokeOpacity="0.5" />
        <line x1="84" y1="74" x2="78" y2="68" stroke="#10B981" strokeWidth="0.8" strokeOpacity="0.5" />
      </svg>

      {/* Wordmark (When requested): SEEMADRISHTI (No 'AI' text) */}
      {showWordmark && (
        <div className="flex flex-col justify-center leading-none">
          <span className="text-base sm:text-lg font-black tracking-[0.22em] font-mono uppercase bg-gradient-to-r from-cyan-300 via-emerald-400 to-teal-200 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">
            SEEMADRISHTI
          </span>
          <span className="text-[8px] sm:text-[9px] font-mono tracking-[0.28em] text-slate-400 uppercase font-semibold mt-0.5">
            DEFENSE SURVEILLANCE MATRIX
          </span>
        </div>
      )}
    </div>
  );
};

