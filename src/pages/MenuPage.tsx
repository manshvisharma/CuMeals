import React, { useState } from 'react';
import { Utensils, Bell, RefreshCw, ArrowRight, Calendar } from 'lucide-react';
import { DateSelector } from '../components/DateSelector';
import { CalendarModal } from '../components/CalendarModal';
import { MealCard } from '../components/MealCard';
import { MealDetailModal } from '../components/MealDetailModal';
import { NoticeModal } from '../components/NoticeModal';
import { CuMealsLogo } from '../components/CuMealsLogo';
import { useMenu, useMessConfig } from '../hooks/useMenu';
import { MealType } from '../types';
import { getTodayString, getFormattedDateLong, getRelativeDayLabel } from '../utils/dateUtils';

interface MenuPageProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const MenuPage: React.FC<MenuPageProps> = ({ selectedDate, onSelectDate }) => {
  const { menu, loading, error, refresh } = useMenu(selectedDate);
  const { notices, timings } = useMessConfig();

  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);
  const [isNoticeOpen, setIsNoticeOpen] = useState<boolean>(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);

  const mealConfigs: { id: MealType; title: string; timeKey: keyof typeof timings }[] = [
    { id: 'breakfast', title: 'Breakfast', timeKey: 'breakfast' },
    { id: 'lunch', title: 'Lunch', timeKey: 'lunch' },
    { id: 'snacksBoys', title: 'Snacks (Boys)', timeKey: 'snacksBoys' },
    { id: 'snacksGirls', title: 'Snacks (Girls)', timeKey: 'snacksGirls' },
    { id: 'dinner', title: 'Dinner', timeKey: 'dinner' }
  ];

  const todayStr = getTodayString();
  const isToday = selectedDate === todayStr;
  const relativeDayText = getRelativeDayLabel(selectedDate);
  const formattedDateLong = getFormattedDateLong(selectedDate);

  return (
    <div className="pb-32 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-5 pt-2">
        <div>
          <div className="flex items-center gap-2.5">
            <CuMealsLogo size="sm" rounded="rounded-xl" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
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
          className="relative w-11 h-11 rounded-full bg-white dark:bg-[#131722] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95 transition-all border border-slate-100 dark:border-slate-800"
          aria-label="Notice Board"
        >
          <Bell size={20} strokeWidth={2.2} />
          {notices.length > 0 && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-[#131722] animate-pulse" />
          )}
        </button>
      </div>

      {/* Date Selector with Surrounding Dates + Calendar Trigger */}
      <DateSelector
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        onOpenCalendar={() => setIsCalendarOpen(true)}
      />

      {/* Date Title Banner */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {relativeDayText} • {formattedDateLong}
          </span>
          {isToday && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
              Today
            </span>
          )}
        </div>

        {!isToday && (
          <button
            onClick={() => onSelectDate(todayStr)}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Go to Today
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
          {mealConfigs.map((cfg) => {
            // Inherit global timing from timings section
            const globalTime = (timings && (timings as any)[cfg.timeKey]) || '';
            const mealData = menu[cfg.id] || {
              time: globalTime,
              items: []
            };
            const displayData = {
              ...mealData,
              time: globalTime || mealData.time || ''
            };

            return (
              <MealCard
                key={cfg.id}
                type={cfg.id}
                title={cfg.title}
                data={displayData}
                selectedDate={selectedDate}
                onClick={() => setActiveMealType(cfg.id)}
              />
            );
          })}
        </div>
      ) : (
        /* Empty / Not Available State */
        <div className="p-7 text-center rounded-[32px] bg-white dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800 shadow-xl my-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center mb-4 border border-indigo-500/20 shadow-inner">
            <Utensils size={28} className="text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5">
            Menu will be updated soon
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6 leading-relaxed font-medium">
            The menu for {formattedDateLong} has not been posted by the mess committee yet. Please check back later.
          </p>

          <div className="flex items-center justify-center">
            <button
              onClick={() => onSelectDate(todayStr)}
              className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
            >
              <span>Back to Today's Menu</span>
              <ArrowRight size={14} />
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
          data={{
            ...menu[activeMealType],
            time: (timings && (timings as any)[mealConfigs.find(c => c.id === activeMealType)?.timeKey || '']) || menu[activeMealType]?.time || ''
          }}
          selectedDate={selectedDate}
        />
      )}

      <NoticeModal
        isOpen={isNoticeOpen}
        onClose={() => setIsNoticeOpen(false)}
        notices={notices}
      />

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />
    </div>
  );
};
