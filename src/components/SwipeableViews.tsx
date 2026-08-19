import React, { useRef, useEffect } from 'react';
import { ActiveTab } from '../types';

interface SwipeableViewsProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  children: {
    menu: React.ReactNode;
    timings: React.ReactNode;
    timepass: React.ReactNode;
    more: React.ReactNode;
  };
}

export const SwipeableViews: React.FC<SwipeableViewsProps> = ({
  activeTab,
  onChangeTab,
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInternalScroll = useRef(false);

  const tabIndexMap: Record<ActiveTab, number> = {
    menu: 0,
    timings: 1,
    timepass: 2,
    more: 3
  };

  const indexTabMap: Record<number, ActiveTab> = {
    0: 'menu',
    1: 'timings',
    2: 'timepass',
    3: 'more'
  };

  // Scroll to active tab programmatically when activeTab prop changes
  useEffect(() => {
    if (!containerRef.current) return;
    const targetIndex = tabIndexMap[activeTab];
    const width = containerRef.current.clientWidth;
    if (width === 0) return;

    isInternalScroll.current = true;
    containerRef.current.scrollTo({
      left: targetIndex * width,
      behavior: 'smooth'
    });

    const timer = setTimeout(() => {
      isInternalScroll.current = false;
    }, 350);

    return () => clearTimeout(timer);
  }, [activeTab]);

  // Handle manual swipe/scroll snap
  const handleScroll = () => {
    if (isInternalScroll.current || !containerRef.current) return;
    const scrollLeft = containerRef.current.scrollLeft;
    const width = containerRef.current.clientWidth;
    if (width === 0) return;

    const newIndex = Math.round(scrollLeft / width);
    const newTab = indexTabMap[newIndex];
    if (newTab && newTab !== activeTab) {
      onChangeTab(newTab);
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex w-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth"
      style={{ scrollSnapType: 'x mandatory' }}
    >
      <div className="w-full shrink-0 snap-start snap-always min-h-full">
        {children.menu}
      </div>
      <div className="w-full shrink-0 snap-start snap-always min-h-full">
        {children.timings}
      </div>
      <div className="w-full shrink-0 snap-start snap-always min-h-full">
        {children.timepass}
      </div>
      <div className="w-full shrink-0 snap-start snap-always min-h-full">
        {children.more}
      </div>
    </div>
  );
};
