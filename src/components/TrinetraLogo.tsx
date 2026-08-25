import React from 'react';

interface TrinetraLogoProps {
  className?: string;
  size?: number;
}

export const TrinetraLogo: React.FC<TrinetraLogoProps> = ({ className = '', size = 48 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      id="trinetra-brand-logo"
    >
      <defs>
        <linearGradient id="trinetraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Trident Center Prongs */}
      {/* Center shaft */}
      <path
        d="M 50 15 L 50 85"
        stroke="url(#trinetraGrad)"
        strokeWidth="10"
        strokeLinecap="round"
      />

      {/* Left tine sweeping out and up */}
      <path
        d="M 22 15 C 22 45 45 52 50 52"
        stroke="url(#trinetraGrad)"
        strokeWidth="10"
        strokeLinecap="round"
      />

      {/* Right tine sweeping out and up */}
      <path
        d="M 78 15 C 78 45 55 52 50 52"
        stroke="url(#trinetraGrad)"
        strokeWidth="10"
        strokeLinecap="round"
      />

      {/* Horizontal connector bar */}
      <path
        d="M 22 15 L 30 15"
        stroke="url(#trinetraGrad)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M 70 15 L 78 15"
        stroke="url(#trinetraGrad)"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  );
};
