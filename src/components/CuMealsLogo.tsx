import React from 'react';

interface CuMealsLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** kept for backwards compatibility with older call sites (ignored) */
  rounded?: string;
}

const PX = { sm: 28, md: 36, lg: 48, xl: 64 } as const;

/**
 * CuMeals app logo. Colours come from CSS variables so it re-colours itself:
 *  light theme → coral tile with a white fork & knife,
 *  dark theme  → cream tile with a coral fork & knife.
 */
export const CuMealsLogo: React.FC<CuMealsLogoProps> = ({ className = '', size = 'md' }) => {
  const px = PX[size];
  return (
    <svg
      className={`shrink-0 select-none ${className}`}
      width={px}
      height={px}
      viewBox="0 0 512 512"
      role="img"
      aria-label="CuMeals"
    >
      <defs>
        <linearGradient id="cmLogoGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: 'var(--logo-b)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--logo-a)' }} />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#cmLogoGrad)" />
      <g
        transform="translate(128, 128) scale(10.66)"
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: 'var(--logo-fg)' }}
      >
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
      </g>
    </svg>
  );
};
