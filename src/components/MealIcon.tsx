import React from 'react';
import { Sun, Utensils, Coffee, CupSoda, Moon } from 'lucide-react';
import { MealType } from '../types';

interface MealIconProps {
  type: MealType;
  size?: number;
}

export const MealIcon: React.FC<MealIconProps> = ({ type, size = 22 }) => {
  switch (type) {
    case 'breakfast':
      return (
        <div className="w-13 h-13 rounded-full flex items-center justify-center bg-[#FDEBDD] dark:bg-orange-950/40 text-[#E06429] dark:text-orange-400 shrink-0">
          <Sun size={size} strokeWidth={2.2} />
        </div>
      );
    case 'lunch':
      return (
        <div className="w-13 h-13 rounded-full flex items-center justify-center bg-[#E8F6EB] dark:bg-emerald-950/40 text-[#47A45C] dark:text-emerald-400 shrink-0">
          <Utensils size={size} strokeWidth={2.2} />
        </div>
      );
    case 'snacksBoys':
    case 'snacksGirls':
      return (
        <div className="w-13 h-13 rounded-full flex items-center justify-center bg-[#F0EBFC] dark:bg-purple-950/40 text-[#8659E8] dark:text-purple-400 shrink-0">
          <Coffee size={size} strokeWidth={2.2} />
        </div>
      );
    case 'dinner':
      return (
        <div className="w-13 h-13 rounded-full flex items-center justify-center bg-[#E8F0FE] dark:bg-blue-950/40 text-[#4C7DF5] dark:text-blue-400 shrink-0">
          <Moon size={size} strokeWidth={2.2} />
        </div>
      );
    default:
      return (
        <div className="w-13 h-13 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
          <Utensils size={size} />
        </div>
      );
  }
};
