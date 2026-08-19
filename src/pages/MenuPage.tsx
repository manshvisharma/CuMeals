import React, { useState } from 'react';
import { Utensils, Bell, RefreshCw, CalendarDays, ArrowRight } from 'lucide-react';
import { DateSelector } from '../components/DateSelector';
import { MealCard } from '../components/MealCard';
import { MealDetailModal } from '../components/MealDetailModal';
import { CalendarModal } from '../components/CalendarModal';
import { NoticeModal } from '../components/NoticeModal';
import { CuMealsLogo } from '../components/CuMealsLogo';
import { useMenu, useMessConfig } from '../hooks/useMenu';
import { MealType } from '../types';
import { getFormattedDateLong, getRelativeDayLabel, addDays, getTodayString } from '../utils/dateUtils';

interface MenuPageProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const MenuPage: React.FC<MenuPageProps> = ({ selectedDate, onSelectDate }) => {
  const { menu, loading, error, refresh } = useMenu(selectedDate);
  const { notices } = useMessConfig();

  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [isNoticeOpen, setIsNoticeOpen] = useState<boolean>(false);

  const mealConfigs: { id: MealType; title: string }[] = [
    { id: 'breakfast', title: 'Breakfast' },
    { id: 'lunch', title: 'Lunch' },
    { id: 'snacksBoys', title: 'Snacks (Boys)' },
    { id: 'snacksGirls', title: 'Snacks (Girls)' },
    { id: 'dinner', title: 'Dinner' }
  ];

  const relativeLabel = getRelativeDayLabel(selectedDate);

  return (
    <div className="pb-28 animate-fadeIn">
      {/* Top Header matching reference image */}
      <div className="flex items-center justify-between mb-5 pt-2">
        <div>
          <div className="flex items-center gap-2.5">
            <CuMealsLogo size="sm" rounded="rounded-xl" />
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              CuMeals
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Good food, good mood.
          </p>
        </div>

        {/* Notice Bell Button */}
        <button
          onClick={() => setIsNoticeOpen(true)}
          className="relative w-11 h-11 rounded-full bg-white dark:bg-[#131722] flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:shadow-none text-slate-800 dark:text-slate-200 hover:scale-105 active:scale-95 transition-all"
          aria-label="Notice Board"
        >
          <Bell size={20} strokeWidth={2.2} />
          {notices.length > 0 && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-[#131722] animate-pulse" />
          )}
        </button>
      </div>

      {/* Date Selector */}
      <DateSelector
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        onOpenCalendar={() => setIsCalendarOpen(true)}
      />

      {/* Date Title Banner */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {relativeLabel} • {getFormattedDateLong(selectedDate)}
        </span>

        {selectedDate !== getTodayString() && (
          <button
            onClick={() => onSelectDate(getTodayString())}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Jump to Today
          </button>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-3.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-28 rounded-[28px] bg-slate-900/60 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 text-center rounded-[28px] bg-slate-900/80 border border-slate-800 my-4 shadow-sm">
          <p className="text-xs font-semibold text-rose-400 mb-2">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 mx-auto active:scale-95"
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        </div>
      ) : menu && (menu.breakfast?.items?.length || menu.lunch?.items?.length || menu.snacksBoys?.items?.length || menu.snacksGirls?.items?.length || menu.dinner?.items?.length) ? (
        /* Meal Cards List */
        <div className="space-y-1">
          {mealConfigs.map((cfg) => (
            <MealCard
              key={cfg.id}
              type={cfg.id}
              title={cfg.title}
              data={menu[cfg.id]}
              selectedDate={selectedDate}
              onClick={() => setActiveMealType(cfg.id)}
            />
          ))}
        </div>
      ) : (
        /* Empty / Surprise State */
        <div className="p-7 text-center rounded-[32px] bg-slate-900/90 border border-slate-800 shadow-xl my-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-indigo-500/20 to-purple-500/20 text-amber-400 mx-auto flex items-center justify-center mb-4 border border-amber-500/30 shadow-inner">
            <span className="text-3xl animate-bounce">🎁</span>
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-1.5">
            Upcoming / Surprise Mess Day!
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6 leading-relaxed font-medium">
            No menu has been added for this date yet. Today's meals will either be served as a delightful mess surprise, or the menu will be updated shortly by the mess committee!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <button
              onClick={() => onSelectDate(getTodayString())}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
            >
              <span>Back to Today's Menu</span>
              <ArrowRight size={14} />
            </button>

            <button
              onClick={() => setIsCalendarOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-slate-700"
            >
              <CalendarDays size={14} />
              <span>Choose Date</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {activeMealType && menu && (
        <MealDetailModal
          isOpen={!!activeMealType}
          onClose={() => setActiveMealType(null)}
          type={activeMealType}
          title={mealConfigs.find(c => c.id === activeMealType)?.title || activeMealType}
          data={menu[activeMealType]}
          selectedDate={selectedDate}
        />
      )}

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />

      <NoticeModal
        isOpen={isNoticeOpen}
        onClose={() => setIsNoticeOpen(false)}
        notices={notices}
      />
    </div>
  );
};
