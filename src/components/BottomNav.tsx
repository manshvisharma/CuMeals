import React from 'react';
import { Utensils, Clock, Gamepad2, MoreHorizontal } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const tabs: { id: ActiveTab; label: string; icon: React.FC<{ size?: number; strokeWidth?: number }> }[] = [
    { id: 'menu', label: 'Menu', icon: Utensils },
    { id: 'timings', label: 'Timings', icon: Clock },
    { id: 'timepass', label: 'Timepass', icon: Gamepad2 },
    { id: 'more', label: 'More', icon: MoreHorizontal }
  ];

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="fixed bottom-6 sm:bottom-7 left-0 right-0 z-40 px-4 max-w-[360px] mx-auto pointer-events-none select-none pb-[env(safe-area-inset-bottom,10px)]"
    >
      <nav className="pointer-events-auto bg-white dark:bg-[#131722] h-16 rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex items-center justify-around px-1.5 relative overflow-hidden border border-slate-100 dark:border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              onContextMenu={(e) => e.preventDefault()}
              className={`
                relative flex-1 py-1.5 px-1 rounded-[22px] flex flex-col items-center justify-center transition-all duration-200 ease-out active:scale-95 z-10 select-none
                ${isActive
                  ? 'text-slate-900 dark:text-white font-extrabold'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-medium'
                }
              `}
            >
              {/* Active Background Pill matching image */}
              {isActive && (
                <div className="absolute inset-1 rounded-[18px] bg-slate-100 dark:bg-slate-800 -z-10 animate-fadeIn" />
              )}

              <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
              
              <span className="text-[10px] mt-0.5 font-bold tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
