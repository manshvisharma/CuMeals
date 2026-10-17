import React, { useMemo, useState } from 'react';
import { DateSelector } from '../components/DateSelector';
import { CalendarModal } from '../components/CalendarModal';
import { MealDetailModal } from '../components/MealDetailModal';
import { NoticeModal } from '../components/NoticeModal';
import { NotificationPromptBanner } from '../components/NotificationPromptBanner';
import { BlockToggle } from '../components/bento/BlockToggle';
import { Icon } from '../components/bento/Icon';
import { showToast } from '../utils/toast';
import { useMenu, useMessConfig } from '../hooks/useMenu';
import { DailyMenu, MealData } from '../types';
import { auth } from '../firebase/config';
import { submitFeedback } from '../firebase/firestore';
import { addDays, getTodayString } from '../utils/dateUtils';
import { iconsForItems } from '../utils/foodIcons';
import {
  DASH_MEALS, DashMeal, MealWindow, formatClock, formatDuration, getNowInfo, mealState,
  menuKeyFor, parseMealWindow, timingFor
} from '../utils/mealTime';
import { useNow, useSnackBlock } from '../utils/prefs';
import { haptics } from '../utils/haptics';

interface MenuPageProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const META: Record<DashMeal, { title: string; emoji: string }> = {
  breakfast: { title: 'Breakfast', emoji: '🥞' },
  lunch: { title: 'Lunch', emoji: '🍛' },
  snacks: { title: 'Snacks', emoji: '☕' },
  dinner: { title: 'Dinner', emoji: '🍽️' }
};

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const REACTIONS: [string, string][] = [['😋', 'Loved it'], ['🙂', 'Okay'], ['😕', 'Not good']];

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function greeting(h: number): string {
  return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
}

function hasAnyMenu(menu: DailyMenu | null): boolean {
  return !!menu && (['breakfast', 'lunch', 'snacksBoys', 'snacksGirls', 'dinner'] as const).some((k) => menu[k]?.items?.length);
}

export const MenuPage: React.FC<MenuPageProps> = ({ selectedDate, onSelectDate }) => {
  const todayStr = getTodayString();
  const tomorrowStr = addDays(todayStr, 1);
  const { menu, loading, error, refresh } = useMenu(selectedDate);
  const { menu: tomorrowMenu } = useMenu(tomorrowStr);
  const { notices, timings } = useMessConfig();
  const [block, setBlock] = useSnackBlock();
  const now = useNow(30000);

  const [openMeal, setOpenMeal] = useState<DashMeal | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [rated, setRated] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('cumeals_ratings') || '{}');
    } catch {
      return {};
    }
  });

  const isToday = selectedDate === todayStr;
  const activeNotices = (notices || []).filter((n) => n.active !== false);
  const d = parseDate(selectedDate);

  /** Menu data + admin timing for one meal on one day. */
  const mealOn = (m: DailyMenu | null, meal: DashMeal): MealData => {
    const base = (m && m[menuKeyFor(meal, block)]) || { time: '', items: [] };
    return { ...base, time: timingFor(timings, meal, block) || base.time || '' };
  };

  const windows = useMemo(() => {
    const w: Partial<Record<DashMeal, MealWindow | null>> = {};
    DASH_MEALS.forEach((m) => {
      w[m] = parseMealWindow(timingFor(timings, m, block) || (menu && menu[menuKeyFor(m, block)]?.time));
    });
    return w;
  }, [timings, block, menu]);

  const nowInfo = isToday ? getNowInfo(windows, now) : null;
  const dayTotal = DASH_MEALS.reduce((n, m) => n + mealOn(menu, m).items.length, 0);

  // Which meal the rating tile is about: latest meal that is live/finished today
  const rateMeal: DashMeal | null = isToday
    ? ([...DASH_MEALS].reverse().find((m) => ['live', 'done'].includes(mealState(windows[m] || null, selectedDate, now))) || null)
    : null;
  const rateKey = rateMeal ? `${rateMeal}-${selectedDate}` : '';

  const rate = async (label: string) => {
    if (!rateMeal) return;
    haptics.fire('success');
    const next = { ...rated, [rateKey]: label };
    setRated(next);
    try {
      localStorage.setItem('cumeals_ratings', JSON.stringify(next));
    } catch {
      /* ignore */
    }
    const user = auth.currentUser;
    try {
      await submitFeedback({
        message: `Meal rating — ${META[rateMeal].title} (${selectedDate}): ${label}`,
        userName: user?.displayName || user?.email?.split('@')[0] || 'Hostel Student',
        userEmail: user?.email || undefined,
        category: 'food'
      });
    } catch {
      /* local copy is kept anyway */
    }
    showToast('Thanks for the feedback!');
  };

  // ---------- hero ("Serving now" / "Up next" / "Tomorrow" / day summary) ----------
  const renderHero = () => {
    let tag = '';
    let big = '';
    let sub = '';
    let emoji = '🍴';
    let items: { name: string; icon: string }[] = [];
    let progress = 0;
    let live = false;
    let target: DashMeal | null = null;

    if (isToday && nowInfo) {
      target = nowInfo.meal;
      emoji = META[nowInfo.meal].emoji;
      big = formatDuration(nowInfo.minutes);
      if (nowInfo.kind === 'live') {
        live = true;
        tag = 'Serving now';
        sub = `left in ${META[nowInfo.meal].title} · ends ${formatClock(nowInfo.window.end)}`;
        progress = nowInfo.progress;
      } else if (nowInfo.kind === 'next') {
        tag = 'Up next';
        sub = `until ${META[nowInfo.meal].title} · starts ${formatClock(nowInfo.window.start)}`;
      } else {
        tag = 'Up next · Tomorrow';
        sub = `until ${META[nowInfo.meal].title} · starts ${formatClock(nowInfo.window.start)}`;
      }
      const src = nowInfo.kind === 'tomorrow' ? tomorrowMenu : menu;
      const md = mealOn(src, nowInfo.meal);
      items = iconsForItems(md.items, md.icons);
    } else if (isToday) {
      tag = 'Today';
      big = String(dayTotal);
      sub = 'dishes on the menu';
    } else {
      tag = selectedDate === tomorrowStr ? 'Tomorrow' : selectedDate < todayStr ? 'Past menu' : 'Upcoming';
      big = String(dayTotal);
      sub = dayTotal === 1 ? 'dish on the menu' : 'dishes on the menu';
      emoji = '📅';
    }

    return (
      <div
        className={`b-tile b-now ${live ? 'live' : ''}`}
        role={target ? 'button' : undefined}
        tabIndex={target ? 0 : undefined}
        onClick={() => target && (haptics.fire('light'), setOpenMeal(target))}
        onKeyDown={(e) => target && (e.key === 'Enter' || e.key === ' ') && setOpenMeal(target)}
        aria-label={`${tag} ${big} ${sub}`}
      >
        <div className="b-now-top">
          <span className="b-tag">{live && <i />}{tag}</span>
          <span className="b-emoji-now">{emoji}</span>
        </div>
        <div className="b-big">{big}</div>
        <div className="b-sub">{sub}</div>
        {live && (
          <div className="b-prog"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        )}
        {items.length > 0 && (
          <div className="b-now-items">
            {items.slice(0, 5).map((it, i) => (
              <span key={i}>{it.icon} {it.name}</span>
            ))}
            {items.length > 5 && <span>+{items.length - 5}</span>}
          </div>
        )}
      </div>
    );
  };

  // ---------- one full-width tile per meal ----------
  const renderMeal = (meal: DashMeal) => {
    const md = mealOn(menu, meal);
    const st = mealState(windows[meal] || null, selectedDate, now);
    const list = iconsForItems(md.items, md.icons);
    const max = 7;
    return (
      <div
        key={meal}
        className={`b-tile b-meal t-${meal} ${st === 'live' ? 'live' : st === 'done' ? 'done' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => (haptics.fire('light'), setOpenMeal(meal))}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpenMeal(meal))}
        aria-label={`${META[meal].title} details`}
      >
        <div className="b-meal-top">
          <div>
            <div className="b-meal-title">
              <h3>{META[meal].title}</h3>
              {st === 'live' && <span className="pill live"><i />Now</span>}
              {st === 'done' && <span className="b-check"><Icon name="check" size={14} sw={3} /></span>}
            </div>
            <div className="b-meal-sub">{md.time || 'Timing not set'}</div>
          </div>
          <span className="b-emoji" aria-hidden="true">{META[meal].emoji}</span>
        </div>
        {list.length ? (
          <div className="b-dishes">
            {list.slice(0, max).map((it, i) => (
              <span key={i} className="b-dish"><em>{it.icon}</em>{it.name}</span>
            ))}
            {list.length > max && <span className="b-dish more">+{list.length - max} more</span>}
          </div>
        ) : (
          <div className="b-empty">Menu not posted yet</div>
        )}
        {meal === 'snacks' && (
          <div className="b-snack"><BlockToggle value={block} onChange={setBlock} /></div>
        )}
      </div>
    );
  };

  const openData = openMeal ? mealOn(menu, openMeal) : undefined;

  return (
    <div>
      <header className="b-head">
        <div>
          <p className="b-greet">{greeting(now.getHours())} · <b>CuMeals</b></p>
          <h1><span>{DOW[d.getDay()]},</span> {d.getDate()} {MON[d.getMonth()]}</h1>
        </div>
        <div className="b-actions">
          <button
            type="button"
            className="icon-btn"
            aria-label="Notice board"
            onClick={() => (haptics.fire('light'), setNoticeOpen(true))}
          >
            <Icon name="bell" size={20} sw={2} />
            {activeNotices.length > 0 && <span className="dot" />}
          </button>
        </div>
      </header>

      <NotificationPromptBanner currentUser={auth.currentUser} />

      <DateSelector selectedDate={selectedDate} onSelectDate={onSelectDate} onOpenCalendar={() => setCalOpen(true)} />

      {!isToday && (
        <div className="b-datebar">
          <span>{selectedDate < todayStr ? 'Past menu' : 'Upcoming menu'}</span>
          <button type="button" onClick={() => onSelectDate(todayStr)}>Back to today</button>
        </div>
      )}

      {loading ? (
        <div className="b-grid">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" />)}
        </div>
      ) : error ? (
        <div className="cm-card" style={{ textAlign: 'center' }}>
          <p style={{ color: '#FF3B30', fontWeight: 650, fontSize: 13, marginBottom: 12 }}>{error}</p>
          <button type="button" className="btn primary" onClick={refresh}>Retry</button>
        </div>
      ) : !hasAnyMenu(menu) ? (
        <div className="cm-card" style={{ textAlign: 'center', padding: 28 }}>
          <div style={{ fontSize: 46, marginBottom: 8 }}>🍽️</div>
          <h3 style={{ fontSize: 19, fontWeight: 750, marginBottom: 6 }}>Menu will be updated soon</h3>
          <p style={{ fontSize: 13, color: 'var(--fg2)', lineHeight: 1.5, marginBottom: 18 }}>
            The menu for this day hasn't been posted by the mess committee yet. Please check back later.
          </p>
          {!isToday && (
            <button type="button" className="btn primary" onClick={() => onSelectDate(todayStr)}>Back to today's menu</button>
          )}
        </div>
      ) : (
        <div className="b-grid">
          {renderHero()}
          {DASH_MEALS.map(renderMeal)}
          {rateMeal && (
            <div className="b-tile b-rate">
              <h3>How was {META[rateMeal].title.toLowerCase()}?</h3>
              <p>Your rating goes straight to the mess committee</p>
              <div className="react">
                {REACTIONS.map(([e, l]) => (
                  <button key={l} type="button" className={rated[rateKey] === l ? 'on' : ''} onClick={() => rate(l)}>
                    <span>{e}</span>{l}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {openMeal && (
        <MealDetailModal
          isOpen
          onClose={() => setOpenMeal(null)}
          type={menuKeyFor(openMeal, block)}
          title={META[openMeal].title}
          emoji={META[openMeal].emoji}
          data={openData}
          selectedDate={selectedDate}
          blockToggle={openMeal === 'snacks' ? <BlockToggle value={block} onChange={setBlock} /> : undefined}
        />
      )}

      <NoticeModal isOpen={noticeOpen} onClose={() => setNoticeOpen(false)} notices={notices} />
      <CalendarModal isOpen={calOpen} onClose={() => setCalOpen(false)} selectedDate={selectedDate} onSelectDate={onSelectDate} />
    </div>
  );
};
