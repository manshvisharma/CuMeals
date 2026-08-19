import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check } from 'lucide-react';
import { getTodayString, getFormattedDateLong, formatDateObj } from '../utils/dateUtils';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate
}) => {
  const [viewDate, setViewDate] = useState<Date>(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  });

  if (!isOpen) return null;

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  const daysGrid = [];
  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysGrid.push({
      dayNum: prevMonthDays - i,
      isCurrentMonth: false,
      dateStr: formatDateObj(new Date(currentYear, currentMonth - 1, prevMonthDays - i))
    });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    daysGrid.push({
      dayNum: i,
      isCurrentMonth: true,
      dateStr: formatDateObj(new Date(currentYear, currentMonth, i))
    });
  }

  const todayStr = getTodayString();

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectDay = (dateStr: string) => {
    onSelectDate(dateStr);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm rounded-[32px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white dark:border-slate-800 shadow-2xl p-6 text-slate-900 dark:text-slate-100 animate-scaleUp">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Select Date</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {getFormattedDateLong(selectedDate)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-base font-semibold tracking-tight">
            {monthNames[currentMonth]} {currentYear}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <span key={day} className="text-xs font-semibold text-slate-400 dark:text-slate-500 py-1">
              {day}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {daysGrid.map((item, idx) => {
            const isSelected = item.dateStr === selectedDate;
            const isToday = item.dateStr === todayStr;

            return (
              <button
                key={idx}
                onClick={() => handleSelectDay(item.dateStr)}
                className={`
                  h-10 w-full rounded-2xl flex flex-col items-center justify-center text-sm font-medium transition-all duration-200 active:scale-90
                  ${!item.isCurrentMonth ? 'text-slate-300 dark:text-slate-700' : ''}
                  ${isSelected
                    ? 'bg-slate-900 dark:bg-indigo-600 text-white font-bold shadow-md'
                    : item.isCurrentMonth
                      ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      : ''
                  }
                `}
              >
                <span>{item.dayNum}</span>
                {isToday && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Today Button */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <button
            onClick={() => handleSelectDay(todayStr)}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Go to Today
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
