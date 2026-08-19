import React from 'react';
import { ChevronRight, Clock, Sparkles } from 'lucide-react';
import { MealIcon } from './MealIcon';
import { MealData, MealType } from '../types';
import { getMealTimeStatus } from '../utils/dateUtils';

interface MealCardProps {
  type: MealType;
  title: string;
  data?: MealData;
  selectedDate: string;
  onClick?: () => void;
}

export const MealCard: React.FC<MealCardProps> = ({
  type,
  title,
  data,
  selectedDate,
  onClick
}) => {
  const timeStatus = getMealTimeStatus(data?.time || '', selectedDate);
  const isOngoing = timeStatus.status === 'ongoing';

  // Colors according to image.png
  const getMealAccent = () => {
    switch (type) {
      case 'breakfast':
        return {
          progressBg: 'bg-orange-500',
          badgeText: 'text-orange-600 dark:text-orange-400',
          borderHighlight: 'hover:border-orange-200 dark:hover:border-orange-900/50'
        };
      case 'lunch':
        return {
          progressBg: 'bg-emerald-500',
          badgeText: 'text-emerald-600 dark:text-emerald-400',
          borderHighlight: 'hover:border-emerald-200 dark:hover:border-emerald-900/50'
        };
      case 'snacksBoys':
      case 'snacksGirls':
        return {
          progressBg: 'bg-purple-500',
          badgeText: 'text-purple-600 dark:text-purple-400',
          borderHighlight: 'hover:border-purple-200 dark:hover:border-purple-900/50'
        };
      case 'dinner':
        return {
          progressBg: 'bg-blue-500',
          badgeText: 'text-blue-600 dark:text-blue-400',
          borderHighlight: 'hover:border-blue-200 dark:hover:border-blue-900/50'
        };
      default:
        return {
          progressBg: 'bg-slate-500',
          badgeText: 'text-slate-600 dark:text-slate-400',
          borderHighlight: 'hover:border-slate-300'
        };
    }
  };

  const accent = getMealAccent();

  return (
    <div className="relative mb-3 group">
      {/* Apple AI Moving Glow Border Indicator for Current Meal */}
      {isOngoing && (
        <div className="absolute -inset-[1.5px] rounded-[26px] apple-glow-border opacity-90 blur-[0.5px] -z-10 animate-fadeIn" />
      )}

      <div
        onClick={onClick}
        className={`
          relative overflow-hidden p-4 rounded-[28px]
          bg-white dark:bg-[#131722]
          border ${isOngoing ? 'border-transparent' : 'border-transparent dark:border-slate-800'}
          shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]
          hover:shadow-[0_6px_25px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out
          cursor-pointer active:scale-[0.98] ${accent.borderHighlight}
        `}
      >
        <div className="flex items-start justify-between gap-3">
          <MealIcon type={type} />

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight leading-none">
                  {title}
                </h3>
                {isOngoing && (
                  <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    Now
                  </span>
                )}
              </div>

              {timeStatus.timeRemainingText && isOngoing && (
                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 ${accent.badgeText} flex items-center gap-1 shrink-0 animate-pulse`}>
                  <Sparkles size={9} />
                  <span>{timeStatus.timeRemainingText}</span>
                </span>
              )}
              {timeStatus.timeRemainingText && timeStatus.status === 'upcoming' && (
                <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 shrink-0 flex items-center gap-1">
                  <Clock size={9} />
                  <span>{timeStatus.timeRemainingText}</span>
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium tracking-tight mb-2">
              {data?.time || 'Timing TBD'}
            </p>

            {/* Small Item Cards / Chips */}
            <div className="flex flex-wrap gap-1.5">
              {data?.items && data.items.length > 0 ? (
                data.items.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-100/90 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200/70 dark:border-slate-700/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-transform group-hover:translate-y-[-0.5px]"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No items listed</span>
              )}
            </div>
          </div>

          <div className="self-center text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors shrink-0">
            <ChevronRight size={16} strokeWidth={2.2} />
          </div>
        </div>

        {/* Subtle Liquid Time Loading / Progress Bar */}
        {isOngoing && (
          <div className="mt-3 w-full h-1 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden relative">
            <div
              className={`h-full ${accent.progressBg} transition-all duration-1000 ease-linear rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]`}
              style={{ width: `${Math.max(5, timeStatus.progressPercent)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
