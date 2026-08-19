import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center justify-between w-full p-3.5 rounded-[22px] bg-white/70 dark:bg-slate-800/60 border border-white/80 dark:border-slate-800 shadow-sm active:scale-98 transition-all"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl transition-colors ${
          isDark 
            ? 'bg-indigo-950/80 text-indigo-400' 
            : 'bg-amber-100 text-amber-600'
        }`}>
          {isDark ? <Moon size={18} /> : <Sun size={18} />}
        </div>
        
        <div className="text-left">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </p>
          <p className="text-[11px] text-slate-400">
            {isDark ? 'OLED Friendly Dark Theme' : 'Clean Apple Light Theme'}
          </p>
        </div>
      </div>

      {/* Toggle Pill */}
      <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${
        isDark ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
      }`}>
        <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
      </div>
    </button>
  );
};
