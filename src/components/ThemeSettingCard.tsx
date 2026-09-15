import React from 'react';
import { Smartphone, Sun, Moon } from 'lucide-react';
import { useTheme, ThemePreference } from '../context/ThemeContext';

const OPTIONS: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { value: 'device', label: 'Device', icon: <Smartphone size={16} /> },
  { value: 'light', label: 'Light', icon: <Sun size={16} /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
];

export const ThemeSettingCard: React.FC = () => {
  const { themePreference, setThemePreference } = useTheme();

  return (
    <div className="p-3.5 rounded-[22px] bg-white/70 dark:bg-slate-800/60 border border-white/80 dark:border-slate-800 shadow-sm">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Appearance</p>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setThemePreference(opt.value)}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl text-xs font-medium transition-colors ${
              themePreference === opt.value
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400'
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};
