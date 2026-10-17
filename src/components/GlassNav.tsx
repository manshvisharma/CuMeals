import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActiveTab } from '../types';
import { Icon } from './bento/Icon';
import { haptics } from '../utils/haptics';

interface GlassNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

const TABS: { id: ActiveTab; label: string; icon: string }[] = [
  { id: 'menu', label: 'Menu', icon: 'menu' },
  { id: 'timings', label: 'Timings', icon: 'clock' },
  { id: 'timepass', label: 'Timepass', icon: 'game' },
  { id: 'more', label: 'More', icon: 'more' }
];

type Orient = 'h' | 'v';

function useDesktop(): boolean {
  const query = '(min-width: 1024px)';
  const [matches, setMatches] = useState<boolean>(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return matches;
}

/**
 * Floating "liquid glass" tab bar.
 *  - Tap a tab, or press and drag the glass bubble across tabs (the bubble swells while held).
 *  - Horizontal bar at the bottom on phones/tablets, vertical rail on the left on desktop.
 *  - Navigation happens ONLY through this bar (no page swiping).
 */
export const GlassNav: React.FC<GlassNavProps> = ({ activeTab, onChangeTab }) => {
  const orient: Orient = useDesktop() ? 'v' : 'h';
  const navRef = useRef<HTMLElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [hover, setHover] = useState<number | null>(null);

  const press = useRef({ down: false, dragging: false, idx: 0, sx: 0, sy: 0, hover: null as number | null });
  const activeIdx = Math.max(0, TABS.findIndex((t) => t.id === activeTab));
  const activeRef = useRef(activeIdx);
  activeRef.current = activeIdx;
  const orientRef = useRef<Orient>(orient);
  orientRef.current = orient;

  const place = useCallback((i: number, instant = false) => {
    const lens = lensRef.current;
    const b = btnRefs.current[i];
    if (!lens || !b) return;
    if (instant) lens.classList.add('no-anim');
    lens.style.setProperty('--lx', `${b.offsetLeft}px`);
    lens.style.setProperty('--ly', `${b.offsetTop}px`);
    lens.style.setProperty('--lw', `${b.offsetWidth}px`);
    lens.style.setProperty('--lh', `${b.offsetHeight}px`);
    if (instant) {
      void lens.offsetWidth;
      lens.classList.remove('no-anim');
    }
  }, []);

  // Position the bubble whenever the active tab / orientation changes, and on resize.
  useLayoutEffect(() => {
    place(activeIdx, true);
  }, [orient, place]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!press.current.down) place(activeIdx);
  }, [activeIdx, place]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => place(activeRef.current, true));
    ro.observe(nav);
    const onLoad = () => place(activeRef.current, true);
    window.addEventListener('load', onLoad);
    (document as any).fonts?.ready?.then(onLoad);
    return () => {
      ro.disconnect();
      window.removeEventListener('load', onLoad);
    };
  }, [place]);

  const nearest = (x: number, y: number) => {
    const v = orientRef.current === 'v';
    let best = 0;
    let bd = Infinity;
    btnRefs.current.forEach((b, i) => {
      if (!b) return;
      const c = v ? b.offsetTop + b.offsetHeight / 2 : b.offsetLeft + b.offsetWidth / 2;
      const d = Math.abs((v ? y : x) - c);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== undefined && e.button !== 0) return;
    const nav = navRef.current;
    const lens = lensRef.current;
    if (!nav || !lens) return;
    const r = nav.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const idx = nearest(x, y);
    press.current = { down: true, dragging: false, idx, sx: x, sy: y, hover: idx };
    try {
      nav.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    lens.classList.add('pressed');
    setHover(idx);
    place(idx);
    haptics.fire('light');
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const p = press.current;
    const nav = navRef.current;
    const lens = lensRef.current;
    if (!p.down || !nav || !lens) return;
    const r = nav.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (!p.dragging && Math.hypot(x - p.sx, y - p.sy) > 6) {
      p.dragging = true;
      lens.classList.add('dragging');
    }
    if (!p.dragging) return;
    const first = btnRefs.current[0]!;
    const last = btnRefs.current[btnRefs.current.length - 1]!;
    const b = btnRefs.current[p.idx]!;
    if (orientRef.current === 'v') {
      const lo = first.offsetTop;
      const hi = last.offsetTop + last.offsetHeight - b.offsetHeight;
      lens.style.setProperty('--ly', `${Math.min(hi, Math.max(lo, y - b.offsetHeight / 2))}px`);
      lens.style.setProperty('--lx', `${b.offsetLeft}px`);
    } else {
      const lo = first.offsetLeft;
      const hi = last.offsetLeft + last.offsetWidth - b.offsetWidth;
      lens.style.setProperty('--lx', `${Math.min(hi, Math.max(lo, x - b.offsetWidth / 2))}px`);
      lens.style.setProperty('--ly', `${b.offsetTop}px`);
    }
    const n = nearest(x, y);
    if (n !== p.hover) {
      p.hover = n;
      setHover(n);
      haptics.fire('select');
    }
  };

  const finish = () => {
    const p = press.current;
    const lens = lensRef.current;
    if (!p.down || !lens) return;
    p.down = false;
    lens.classList.remove('pressed', 'dragging');
    const target = p.hover ?? p.idx;
    setHover(null);
    place(target);
    if (target !== activeRef.current) {
      haptics.fire('medium');
      onChangeTab(TABS[target].id);
    } else {
      lens.classList.add('bump');
      window.setTimeout(() => lens.classList.remove('bump'), 320);
    }
  };

  const shown = hover ?? activeIdx;

  return (
    <div className="nav-wrap">
      <nav
        ref={navRef}
        className="gnav"
        data-orient={orient}
        role="tablist"
        aria-label="Main navigation"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="gn-bg" />
        <div className="gn-lens" ref={lensRef} />
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={i === activeIdx}
            aria-label={t.label}
            data-tab={t.id}
            className={`gn-btn ${i === shown ? 'on' : ''}`}
            onClick={(e) => {
              // keyboard activation only (pointer taps are handled above)
              if (e.detail === 0 && t.id !== activeTab) {
                haptics.fire('medium');
                onChangeTab(t.id);
              }
            }}
          >
            <Icon name={t.icon} size={24} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
