import React, { useState } from 'react';
import logoImg from '../assets/logo.jpg';
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
  const [hasError, setHasError] = useState(false);

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

  if (hasError) {
    return (
      <div
        className={`${sizeClasses} ${rounded} bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md border border-indigo-400/30 ${className}`}
      >
        <Utensils size={iconSizes} strokeWidth={2.5} />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} ${rounded} overflow-hidden bg-slate-900 border border-slate-700/60 shadow-sm shrink-0 flex items-center justify-center ${className}`}
    >
      <img
        src={logoImg}
        alt="CuMeals Logo"
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className="w-full h-full object-cover select-none pointer-events-none"
      />
    </div>
  );
};
