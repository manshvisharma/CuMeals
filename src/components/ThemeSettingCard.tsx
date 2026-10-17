import React from 'react';
import { useTheme, ThemePreference } from '../context/ThemeContext';
import { Icon } from './bento/Icon';
import { haptics } from '../utils/haptics';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'device', label: 'Auto' }
];

export const ThemeSettingCard: React.FC = () => {
  const { themePreference, setThemePreference } = useTheme();
  return (
    <div className="row col">
      <div className="row-line">
        <span className="row-ico"><Icon name="sun" size={20} /></span>
        <span className="grow"><h3>Appearance</h3></span>
      </div>
      <div className="seg-ctl wide">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={themePreference === o.value ? 'on' : ''}
            aria-pressed={themePreference === o.value}
            onClick={() => {
              haptics.fire('select');
              setThemePreference(o.value);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
};
