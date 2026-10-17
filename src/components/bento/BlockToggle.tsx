import React from 'react';
import { SnackBlock } from '../../utils/mealTime';
import { haptics } from '../../utils/haptics';

export const BlockToggle: React.FC<{ value: SnackBlock; onChange: (b: SnackBlock) => void; className?: string }> = ({ value, onChange, className = '' }) => (
  <div className={`seg-ctl ${className}`} role="group" aria-label="Snacks block" onClick={(e) => e.stopPropagation()}>
    {(['boys', 'girls'] as SnackBlock[]).map((b) => (
      <button
        key={b}
        type="button"
        className={value === b ? 'on' : ''}
        aria-pressed={value === b}
        onClick={(e) => {
          e.stopPropagation();
          haptics.fire('select');
          onChange(b);
        }}
      >
        {b === 'boys' ? 'Boys' : 'Girls'}
      </button>
    ))}
  </div>
);
