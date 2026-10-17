import React, { useEffect, useState } from 'react';
import { Icon } from './bento/Icon';
import { addDays, getDayNumber, getShortDayName, getTodayString } from '../utils/dateUtils';
import { haptics } from '../utils/haptics';

interface DateSelectorProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpenCalendar: () => void;
}

/** 7-day strip (selected day always inside the visible week) + week arrows + calendar button. */
export const DateSelector: React.FC<DateSelectorProps> = ({ selectedDate, onSelectDate, onOpenCalendar }) => {
  const todayStr = getTodayString();
  const [winStart, setWinStart] = useState<string>(() => addDays(selectedDate, -3));

  // Keep the picked day visible (e.g. after choosing a date in the calendar).
  useEffect(() => {
    const end = addDays(winStart, 6);
    if (selectedDate < winStart || selectedDate > end) setWinStart(addDays(selectedDate, -3));
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = Array.from({ length: 7 }, (_, i) => addDays(winStart, i));

  return (
    <div className="b-week">
      <div className="weekstrip">
        <button
          type="button"
          className="wk-arrow"
          aria-label="Previous week"
          onClick={() => {
            haptics.fire('select');
            setWinStart(addDays(winStart, -7));
          }}
        >
          <Icon name="left" size={18} sw={2.2} />
        </button>
        <div className="wk-days">
          {days.map((d) => (
            <button
              key={d}
              type="button"
              className={`wk-day ${d === selectedDate ? 'on' : ''} ${d === todayStr ? 'today' : ''}`}
              aria-label={d}
              aria-pressed={d === selectedDate}
              onClick={() => {
                haptics.fire('select');
                onSelectDate(d);
              }}
            >
              <small>{getShortDayName(d)}</small>
              <b>{getDayNumber(d)}</b>
              <i />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="wk-arrow"
          aria-label="Next week"
          onClick={() => {
            haptics.fire('select');
            setWinStart(addDays(winStart, 7));
          }}
        >
          <Icon name="right" size={18} sw={2.2} />
        </button>
        <button
          type="button"
          className="b-cal-btn"
          aria-label="Open calendar"
          onClick={() => {
            haptics.fire('light');
            onOpenCalendar();
          }}
        >
          <Icon name="calendar" size={20} />
        </button>
      </div>
    </div>
  );
};
