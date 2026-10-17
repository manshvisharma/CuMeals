import { useCallback, useEffect, useState } from 'react';
import type { SnackBlock } from './mealTime';

const SNACK_KEY = 'cumeals_snacks_block';

export function getSnackBlock(): SnackBlock {
  try {
    return localStorage.getItem(SNACK_KEY) === 'girls' ? 'girls' : 'boys';
  } catch {
    return 'boys';
  }
}

/** Which hostel block's snacks to show (shared by the dashboard and meal alerts). */
export function useSnackBlock(): [SnackBlock, (b: SnackBlock) => void] {
  const [block, setBlockState] = useState<SnackBlock>(getSnackBlock);
  const setBlock = useCallback((b: SnackBlock) => {
    try {
      localStorage.setItem(SNACK_KEY, b);
    } catch {
      /* ignore */
    }
    setBlockState(b);
    window.dispatchEvent(new CustomEvent('cumeals-snack-block', { detail: b }));
  }, []);
  useEffect(() => {
    const on = (e: Event) => setBlockState((e as CustomEvent).detail === 'girls' ? 'girls' : 'boys');
    window.addEventListener('cumeals-snack-block', on);
    return () => window.removeEventListener('cumeals-snack-block', on);
  }, []);
  return [block, setBlock];
}

/** Re-render every `ms` (and when the tab becomes visible again) so countdowns stay fresh. */
export function useNow(ms = 30000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, ms);
    const vis = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [ms]);
  return now;
}
