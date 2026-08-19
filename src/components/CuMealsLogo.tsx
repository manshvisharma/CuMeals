import React from 'react';
import { Utensils } from 'lucide-react';

interface CuMealsLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  rounded?: string;
}

export const CuMealsLogo: React.FC<CuMealsLogoProps> = ({
  className = '',
  size = 'md',
  rounded = 'rounded-2xl'
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }[size];

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 24,
    xl: 32
  }[size];

  return (
    <div
      className={`${sizeClasses} ${rounded} bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 border border-indigo-400/30 shrink-0 select-none ${className}`}
    >
      <Utensils size={iconSizes} strokeWidth={2.4} className="text-white drop-shadow-sm" />
    </div>
  );
};
