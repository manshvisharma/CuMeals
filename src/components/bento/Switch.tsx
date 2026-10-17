import React from 'react';
import { haptics } from '../../utils/haptics';

export const Switch: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }> = ({ on, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    className={`switch ${on ? 'on' : ''}`}
    style={disabled ? { opacity: 0.5 } : undefined}
    onClick={(e) => {
      e.stopPropagation();
      haptics.fire('medium');
      onChange(!on);
    }}
  >
    <i />
  </button>
);
