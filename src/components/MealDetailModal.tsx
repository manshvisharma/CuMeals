import React, { useEffect, useState } from 'react';
import { MealData, MealType } from '../types';
import { addDays, getFormattedDateLong, getTodayString } from '../utils/dateUtils';
import { fetchMenuForDate } from '../firebase/firestore';
import { iconsForItems } from '../utils/foodIcons';
import { parseMealWindow, mealState } from '../utils/mealTime';
import { Sheet } from './bento/Sheet';
import { Icon } from './bento/Icon';
import { haptics } from '../utils/haptics';

interface MealDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: MealType;
  title: string;
  emoji: string;
  data?: MealData;
  selectedDate: string;
  /** shown on the Snacks sheet so students can flip block without closing it */
  blockToggle?: React.ReactNode;
}

export const MealDetailModal: React.FC<MealDetailModalProps> = ({ isOpen, onClose, type, title, emoji, data, selectedDate, blockToggle }) => {
  const [tomorrow, setTomorrow] = useState<MealData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    setLoading(true);
    fetchMenuForDate(addDays(selectedDate, 1))
      .then((m) => alive && setTomorrow((m && (m as any)[type]) || null))
      .catch(() => alive && setTomorrow(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [isOpen, selectedDate, type]);

  const items = iconsForItems(data?.items || [], data?.icons);
  const tItems = iconsForItems(tomorrow?.items || [], tomorrow?.icons);
  const st = mealState(parseMealWindow(data?.time), selectedDate);
  const dayLabel = selectedDate === getTodayString() ? "Today's menu" : `${getFormattedDateLong(selectedDate)} menu`;

  const share = () => {
    haptics.fire('light');
    const text = `${title} (${getFormattedDateLong(selectedDate)}): ${(data?.items || []).join(', ')}`;
    if (navigator.share) navigator.share({ title: `CuMeals · ${title}`, text }).catch(() => {});
    else navigator.clipboard?.writeText(text).catch(() => {});
  };

  return (
    <Sheet open={isOpen} onClose={onClose} label={title}>
      <div className="sh-hero">
        <div className="emoji-big">{emoji}</div>
        <div>
          <h2>{title}</h2>
          <p>
            {data?.time || 'Timing not set'} · {getFormattedDateLong(selectedDate)}
          </p>
          <span className={`pill ${st === 'live' ? 'live' : st === 'done' ? 'done' : 'later'}`} style={{ marginTop: 8 }}>
            {st === 'live' ? (<><i />Serving now</>) : st === 'done' ? 'Done' : 'Upcoming'}
          </span>
        </div>
      </div>

      {blockToggle && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 0' }}>
          <span className="sh-sec" style={{ margin: 0 }}>Block</span>
          {blockToggle}
        </div>
      )}

      <div className="sh-sec">{dayLabel}</div>
      {items.length ? (
        <div className="sh-items">
          {items.map((it, i) => (
            <div key={i} className="sh-item">
              <span>{it.icon}</span>
              {it.name}
            </div>
          ))}
        </div>
      ) : (
        <p className="notice" style={{ marginTop: 10 }}>No menu posted for this meal yet.</p>
      )}

      <div className="sh-sec">Tomorrow's preview</div>
      {loading ? (
        <p className="notice" style={{ marginTop: 10 }}>Loading…</p>
      ) : tItems.length ? (
        <div className="sh-items small">
          {tItems.map((it, i) => (
            <div key={i} className="sh-item">
              <span>{it.icon}</span>
              {it.name}
            </div>
          ))}
        </div>
      ) : (
        <p className="notice" style={{ marginTop: 10 }}>Tomorrow's menu will be updated soon.</p>
      )}

      <button type="button" className="btn block" style={{ marginTop: 22 }} onClick={share}>
        <Icon name="share" size={18} /> Share this menu
      </button>
    </Sheet>
  );
};
