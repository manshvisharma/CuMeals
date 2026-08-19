import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { getDayNumber, getShortDayName, addDays, getTodayString } from '../utils/dateUtils';

interface DateSelectorProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpenCalendar: () => void;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  selectedDate,
  onSelectDate,
  onOpenCalendar
}) => {
  const todayStr = getTodayString();
  const tomorrowStr = addDays(todayStr, 1);
  const yesterdayStr = addDays(todayStr, -1);

  // Generate 5 surrounding dates
  const surroundingDates = [
    addDays(selectedDate, -2),
    addDays(selectedDate, -1),
    selectedDate,
    addDays(selectedDate, 1),
    addDays(selectedDate, 2)
  ];

  const getCustomLabel = (dateStr: string) => {
    if (dateStr === todayStr) return 'Today';
    if (dateStr === tomorrowStr) return 'Tmrw';
    if (dateStr === yesterdayStr) return 'Yest';
    return getShortDayName(dateStr);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        {/* Date Pills Bar Container */}
        <div className="flex-1 flex items-center justify-between gap-1.5 bg-white dark:bg-[#131722] p-2 rounded-[26px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none overflow-x-auto no-scrollbar">
          {surroundingDates.map((dateStr) => {
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;
            const isTomorrow = dateStr === tomorrowStr;
            const dayNum = getDayNumber(dateStr);
            const label = getCustomLabel(dateStr);

            return (
              <button
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={`
                  relative flex-1 min-w-[46px] py-2 px-1 rounded-[20px] flex flex-col items-center justify-center transition-all duration-200 ease-out active:scale-95
                  ${isSelected
                    ? 'bg-[#18181B] dark:bg-indigo-600 text-white shadow-md z-10'
                    : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                  }
                `}
              >
                {/* Special Highlight Dot for Today & Tomorrow */}
                {(isToday || isTomorrow) && !isSelected && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                )}

                <span className={`text-sm font-extrabold leading-tight ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                  {dayNum}
                </span>

                <span className={`text-[10px] font-bold mt-0.5 tracking-tight ${
                  isSelected
                    ? 'text-slate-300 dark:text-indigo-100'
                    : (isToday || isTomorrow)
                    ? 'text-slate-900 dark:text-slate-200 font-extrabold'
                    : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Calendar Trigger Button */}
        <button
          onClick={onOpenCalendar}
          className="p-3.5 rounded-[22px] bg-white dark:bg-[#131722] text-slate-800 dark:text-slate-200 hover:bg-slate-50 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none active:scale-95 shrink-0 flex items-center justify-center"
          title="Open Calendar"
          aria-label="Open Calendar"
        >
          <Calendar size={20} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
};
