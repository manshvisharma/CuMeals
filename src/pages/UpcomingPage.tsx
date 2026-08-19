import React, { useState, useEffect } from 'react';
import { Calendar, ChevronRight, Sun, Utensils, Coffee, Moon } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { CalendarModal } from '../components/CalendarModal';
import { addDays, getTodayString, getDayNumber, getShortDayName, getFormattedDateLong, getRelativeDayLabel } from '../utils/dateUtils';
import { fetchMenuForDate } from '../firebase/firestore';
import { DailyMenu } from '../types';

interface UpcomingPageProps {
  onSelectDateAndNav: (date: string) => void;
}

export const UpcomingPage: React.FC<UpcomingPageProps> = ({ onSelectDateAndNav }) => {
  const [upcomingMenus, setUpcomingMenus] = useState<{ date: string; menu: DailyMenu | null }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);

  useEffect(() => {
    const loadUpcoming = async () => {
      setLoading(true);
      const today = getTodayString();
      const list: { date: string; menu: DailyMenu | null }[] = [];

      for (let i = 1; i <= 6; i++) {
        const dStr = addDays(today, i);
        const m = await fetchMenuForDate(dStr);
        list.push({ date: dStr, menu: m });
      }

      setUpcomingMenus(list);
      setLoading(false);
    };

    loadUpcoming();
  }, []);

  return (
    <div className="pb-28 animate-fadeIn pt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-[18px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white dark:border-slate-800 shadow-sm flex items-center justify-center text-slate-900 dark:text-slate-100">
            <Calendar size={22} strokeWidth={2.2} />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Upcoming Menus
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Check the menu for upcoming days
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCalendarOpen(true)}
          className="p-2.5 rounded-[18px] bg-white/80 dark:bg-slate-900/80 border border-white dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-300 hover:scale-105 active:scale-95 transition-all"
        >
          <Calendar size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Upcoming List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-44 rounded-[28px] bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/60 dark:border-slate-800/60 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {upcomingMenus.map(({ date, menu }) => {
            const dayNum = getDayNumber(date);
            const dayName = getShortDayName(date);
            const label = getRelativeDayLabel(date);

            return (
              <GlassCard
                key={date}
                onClick={() => onSelectDateAndNav(date)}
                className="group"
              >
                {/* Top Badge & Date */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-indigo-600 text-white flex flex-col items-center justify-center font-bold shrink-0">
                      <span className="text-sm leading-none">{dayNum}</span>
                      <span className="text-[10px] uppercase font-semibold text-slate-300 dark:text-indigo-200 mt-0.5">{dayName}</span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {label}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {getFormattedDateLong(date)}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                    View menu <ChevronRight size={16} />
                  </span>
                </div>

                {/* Meal Preview Bullet List */}
                {menu ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-white/50 dark:bg-slate-800/40">
                      <Sun size={14} className="text-amber-500 shrink-0" />
                      <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                        {menu.breakfast?.items?.[0] || 'Breakfast'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-xl bg-white/50 dark:bg-slate-800/40">
                      <Utensils size={14} className="text-emerald-500 shrink-0" />
                      <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                        {menu.lunch?.items?.[0] || 'Lunch'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-xl bg-white/50 dark:bg-slate-800/40">
                      <Coffee size={14} className="text-sky-500 shrink-0" />
                      <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                        {menu.snacksBoys?.items?.[0] || 'Snacks'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-xl bg-white/50 dark:bg-slate-800/40">
                      <Moon size={14} className="text-indigo-500 shrink-0" />
                      <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                        {menu.dinner?.items?.[0] || 'Dinner'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Menu not published yet.</p>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={getTodayString()}
        onSelectDate={onSelectDateAndNav}
      />
    </div>
  );
};
