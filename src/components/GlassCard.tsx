import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  accentColor?: 'orange' | 'green' | 'blue' | 'pink' | 'purple' | 'slate';
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  onClick,
  accentColor,
  hoverEffect = true
}) => {
  // Theme accent variants matching Frosted Glass design specs
  const getAccentClass = () => {
    switch (accentColor) {
      case 'orange':
        return 'bg-orange-50/50 dark:bg-amber-950/30 border-orange-100/80 dark:border-amber-900/40';
      case 'green':
        return 'bg-green-50/50 dark:bg-emerald-950/30 border-green-100/80 dark:border-emerald-900/40';
      case 'pink':
        return 'bg-pink-50/50 dark:bg-pink-950/30 border-pink-100/80 dark:border-pink-900/40';
      case 'purple':
      case 'blue':
        return 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-100/80 dark:border-indigo-900/40';
      default:
        return 'bg-white/50 dark:bg-slate-900/60 border-white/70 dark:border-slate-800/80';
    }
  };

  const baseGlass = `
    relative overflow-hidden rounded-[28px] p-4.5
    backdrop-blur-md 
    border
    shadow-sm
    transition-all duration-300 ease-out
    ${getAccentClass()}
  `;

  const interactive = onClick && hoverEffect ? `
    cursor-pointer 
    active:scale-[0.98] 
    hover:shadow-md
    hover:border-white dark:hover:border-slate-700
  ` : '';

  return (
    <div
      onClick={onClick}
      className={`${baseGlass} ${interactive} ${className}`}
    >
      {children}
    </div>
  );
};
