import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { getTodayString, getFormattedDateLong, formatDateObj } from '../utils/dateUtils';
import { haptics } from '../utils/haptics';

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
  const [mounted, setMounted] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const [y, m, d] = selectedDate.split('-').map(Number);
    setViewDate(new Date(y, m - 1, d));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, selectedDate, onClose]);

  if (!isOpen || !mounted) return null;

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
    haptics.fire('light');
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    haptics.fire('light');
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectDay = (dateStr: string) => {
    haptics.fire('medium');
    onSelectDate(dateStr);
    onClose();
  };

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Blurred Cupertino backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-md transition-opacity animate-fadeIn"
        onClick={() => {
          haptics.fire('light');
          onClose();
        }}
      />

      {/* Bento Glass Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select Date"
        className="relative w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-scaleUp z-10"
        style={{
          background: 'var(--sheet-bg)',
          border: '1px solid var(--card-brd)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.15)',
          WebkitBackdropFilter: 'blur(36px) saturate(180%)',
          backdropFilter: 'blur(36px) saturate(180%)',
          color: 'var(--fg)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-2xl flex items-center justify-center"
              style={{
                background: 'var(--accent-soft)',
                color: 'var(--accent-ink, var(--accent))'
              }}
            >
              <CalendarIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight" style={{ color: 'var(--fg)' }}>
                Select Date
              </h2>
              <p className="text-xs font-medium" style={{ color: 'var(--fg2)' }}>
                {getFormattedDateLong(selectedDate)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              haptics.fire('select');
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90"
            style={{
              background: 'var(--chip-bg)',
              color: 'var(--fg2)',
              border: 'none',
              cursor: 'pointer'
            }}
            aria-label="Close"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-base font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
            {monthNames[currentMonth]} {currentYear}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{
                background: 'var(--chip-bg)',
                color: 'var(--fg)',
                border: 'none',
                cursor: 'pointer'
              }}
              aria-label="Previous month"
            >
              <ChevronLeft size={18} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{
                background: 'var(--chip-bg)',
                color: 'var(--fg)',
                border: 'none',
                cursor: 'pointer'
              }}
              aria-label="Next month"
            >
              <ChevronRight size={18} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <span
              key={day}
              className="text-xs font-bold py-1 uppercase tracking-wider"
              style={{ color: 'var(--fg3)' }}
            >
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
                type="button"
                onClick={() => handleSelectDay(item.dateStr)}
                className="h-10 w-full rounded-2xl flex flex-col items-center justify-center text-sm font-semibold transition-all duration-200 active:scale-90 cursor-pointer"
                style={{
                  background: isSelected
                    ? 'var(--accent)'
                    : 'transparent',
                  color: isSelected
                    ? 'var(--accent-fg, #fff)'
                    : item.isCurrentMonth
                    ? 'var(--fg)'
                    : 'var(--fg3)',
                  boxShadow: isSelected ? '0 4px 14px var(--accent-soft)' : 'none',
                  border: 'none',
                  opacity: !item.isCurrentMonth ? 0.35 : 1
                }}
              >
                <span>{item.dayNum}</span>
                {isToday && !isSelected && (
                  <span
                    className="w-1 h-1 rounded-full mt-0.5"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="mt-5 pt-4 flex justify-between items-center"
          style={{ borderTop: '1px solid var(--hair)' }}
        >
          <button
            type="button"
            onClick={() => handleSelectDay(todayStr)}
            className="text-xs font-bold cursor-pointer transition-opacity hover:opacity-80"
            style={{
              color: 'var(--accent-ink, var(--accent))',
              background: 'none',
              border: 'none'
            }}
          >
            Go to Today
          </button>

          <button
            type="button"
            onClick={() => {
              haptics.fire('light');
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-95"
            style={{
              background: 'var(--chip-bg)',
              color: 'var(--fg)',
              border: 'none'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
