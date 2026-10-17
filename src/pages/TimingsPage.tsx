import React from 'react';
import { useMessConfig } from '../hooks/useMenu';
import { Icon } from '../components/bento/Icon';
import { DASH_MEALS, DashMeal, formatDuration, mealState, parseMealWindow, nowMinutes } from '../utils/mealTime';
import { getTodayString } from '../utils/dateUtils';
import { useNow } from '../utils/prefs';
import { MealTimings } from '../types';

const ROWS: { id: string; title: string; emoji: string; key: keyof MealTimings; meal: DashMeal; note?: string }[] = [
  { id: 'breakfast', title: 'Breakfast', emoji: '🥞', key: 'breakfast', meal: 'breakfast' },
  { id: 'lunch', title: 'Lunch', emoji: '🍛', key: 'lunch', meal: 'lunch' },
  { id: 'snacksBoys', title: 'Snacks · Boys', emoji: '☕', key: 'snacksBoys', meal: 'snacks' },
  { id: 'snacksGirls', title: 'Snacks · Girls', emoji: '🍪', key: 'snacksGirls', meal: 'snacks' },
  { id: 'dinner', title: 'Dinner', emoji: '🍽️', key: 'dinner', meal: 'dinner' }
];

const A = 6 * 60;
const B = 23 * 60;

export const TimingsPage: React.FC = () => {
  const { timings } = useMessConfig();
  const now = useNow(30000);
  const today = getTodayString();
  const n = nowMinutes(now);

  const segs = DASH_MEALS.map((m) => {
    const raw = m === 'snacks' ? timings?.snacksBoys || timings?.snacksGirls : timings?.[m];
    const w = parseMealWindow(raw);
    return { m, w };
  }).filter((s) => s.w);

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>Meal timings</h1>
          <p>Know when it's what</p>
        </div>
        <span className="head-ico"><Icon name="clock" size={22} /></span>
      </header>

      <div className="cm-card daycard">
        <div className="cm-card-title">Today at a glance</div>
        <div className="daybar">
          <div className="track">
            {segs.map(({ m, w }) => (
              <i
                key={m}
                className={`seg s-${m} ${mealState(w!, today, now) === 'live' ? 'live' : ''}`}
                style={{ left: `${((w!.start - A) / (B - A)) * 100}%`, width: `${((w!.end - w!.start) / (B - A)) * 100}%` }}
                title={m}
              />
            ))}
            {n >= A && n <= B && <b className="nowdot" style={{ left: `${((n - A) / (B - A)) * 100}%` }} />}
          </div>
          <div className="ticks"><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span></div>
        </div>
      </div>

      <div className="list timing-list">
        {ROWS.map((r) => {
          const range = timings?.[r.key] as string | undefined;
          const w = parseMealWindow(range);
          const live = mealState(w, today, now) === 'live';
          return (
            <div key={r.id} className="row">
              <div className="emoji-tile">{r.emoji}</div>
              <div className="grow">
                <h3>{r.title}</h3>
                <p>{range || 'Loading…'}</p>
              </div>
              <div className="time">
                <b>{w ? formatDuration(w.end - w.start) : ''}</b>
                <span>window</span>
              </div>
              {live && <span className="pill live"><i />Now</span>}
            </div>
          );
        })}
      </div>

      <div className="note">
        <Icon name="info" size={18} />
        <p>{timings?.noticeNote || 'Timings may vary on special days. Check the Menu tab for the latest updates.'}</p>
      </div>
    </div>
  );
};
