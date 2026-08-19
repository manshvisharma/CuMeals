import React from 'react';
import { Clock, Info } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { MealIcon } from '../components/MealIcon';
import { useMessConfig } from '../hooks/useMenu';
import { MealType } from '../types';

export const TimingsPage: React.FC = () => {
  const { timings, loading } = useMessConfig();

  const timingList: { type: MealType; title: string; timeKey: keyof typeof timings }[] = [
    { type: 'breakfast', title: 'Breakfast', timeKey: 'breakfast' },
    { type: 'lunch', title: 'Lunch', timeKey: 'lunch' },
    { type: 'snacksBoys', title: 'Snacks (Boys)', timeKey: 'snacksBoys' },
    { type: 'snacksGirls', title: 'Snacks (Girls)', timeKey: 'snacksGirls' },
    { type: 'dinner', title: 'Dinner', timeKey: 'dinner' }
  ];

  return (
    <div className="pb-32 animate-fadeIn pt-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-[18px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white dark:border-slate-800 shadow-sm flex items-center justify-center text-slate-900 dark:text-slate-100">
          <Clock size={22} strokeWidth={2.2} />
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Meal Timings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Know when it's what
          </p>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3.5">
        {timingList.map((item) => (
          <GlassCard key={item.type} hoverEffect={false}>
            <div className="flex items-center gap-4">
              <MealIcon type={item.type} />

              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {item.title}
                </h3>
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {timings?.[item.timeKey] || 'Loading...'}
                </p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Information Notice Card */}
      <div className="mt-6 p-4 rounded-[22px] bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed font-medium">
          {timings?.noticeNote || 'Timings may vary on special days. Check the menu for the latest updates.'}
        </p>
      </div>
    </div>
  );
};
