import { MealTimings, MealType } from '../types';
import { getTodayString, parseTimeToMinutes } from './dateUtils';

export interface MealWindow {
  start: number; // minutes since midnight
  end: number;
}

/** "8:00 AM – 9:30 AM (Boys Block)" -> { start: 480, end: 570 } */
export function parseMealWindow(range?: string | null): MealWindow | null {
  if (!range) return null;
  const matches = String(range).match(/\d{1,2}:\d{2}\s*(?:AM|PM)/gi);
  if (!matches || matches.length < 2) return null;
  const start = parseTimeToMinutes(matches[0]);
  const end = parseTimeToMinutes(matches[1]);
  if (start === null || end === null) return null;
  return { start, end: end > start ? end : end + 24 * 60 };
}

export function nowMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function formatClock(min: number): string {
  const m = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(mm).padStart(2, '0')} ${ap}`;
}

export function formatDuration(mins: number): string {
  const total = Math.max(0, Math.round(mins));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/** The four rows shown on the dashboard. Snacks follows the Boys/Girls choice. */
export type DashMeal = 'breakfast' | 'lunch' | 'snacks' | 'dinner';
export const DASH_MEALS: DashMeal[] = ['breakfast', 'lunch', 'snacks', 'dinner'];
export type SnackBlock = 'boys' | 'girls';

export function menuKeyFor(meal: DashMeal, block: SnackBlock): MealType {
  if (meal === 'snacks') return block === 'boys' ? 'snacksBoys' : 'snacksGirls';
  return meal;
}

export function timingFor(timings: MealTimings | null | undefined, meal: DashMeal, block: SnackBlock): string {
  if (!timings) return '';
  if (meal === 'snacks') return (block === 'boys' ? timings.snacksBoys : timings.snacksGirls) || timings.snacksBoys || timings.snacksGirls || '';
  return timings[meal] || '';
}

export type MealState = 'live' | 'later' | 'done' | 'unknown';

/** State of one meal on `dateStr` at time `now`. Past dates are "done", future dates "later". */
export function mealState(win: MealWindow | null, dateStr: string, now: Date = new Date()): MealState {
  const today = getTodayString();
  if (dateStr < today) return 'done';
  if (dateStr > today) return 'later';
  if (!win) return 'unknown';
  const n = nowMinutes(now);
  if (n >= win.start && n < win.end) return 'live';
  if (n >= win.end) return 'done';
  return 'later';
}

export interface NowInfo {
  kind: 'live' | 'next' | 'tomorrow';
  meal: DashMeal;
  window: MealWindow;
  /** minutes until the meal ends (live) or starts (next / tomorrow) */
  minutes: number;
  /** 0..1 progress through a live meal */
  progress: number;
}

/**
 * What is happening right now (for today):
 *  - a meal is being served  -> kind "live"
 *  - between meals           -> kind "next" (the next meal today)
 *  - after the last meal     -> kind "tomorrow" (tomorrow's first meal)
 */
export function getNowInfo(
  windows: Partial<Record<DashMeal, MealWindow | null>>,
  now: Date = new Date()
): NowInfo | null {
  const n = nowMinutes(now);
  const list = DASH_MEALS.map((meal) => ({ meal, window: windows[meal] || null })).filter(
    (x): x is { meal: DashMeal; window: MealWindow } => !!x.window
  );
  if (list.length === 0) return null;
  list.sort((a, b) => a.window.start - b.window.start);

  for (const x of list) {
    if (n >= x.window.start && n < x.window.end) {
      const total = Math.max(1, x.window.end - x.window.start);
      return { kind: 'live', meal: x.meal, window: x.window, minutes: x.window.end - n, progress: Math.min(1, Math.max(0, (n - x.window.start) / total)) };
    }
  }
  for (const x of list) {
    if (n < x.window.start) {
      return { kind: 'next', meal: x.meal, window: x.window, minutes: x.window.start - n, progress: 0 };
    }
  }
  const first = list[0];
  return { kind: 'tomorrow', meal: first.meal, window: first.window, minutes: 24 * 60 - n + first.window.start, progress: 0 };
}
