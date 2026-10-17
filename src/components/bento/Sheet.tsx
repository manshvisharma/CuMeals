import React, { useCallback, useEffect, useState } from 'react';
import { Icon } from './Icon';
import { haptics } from '../../utils/haptics';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label?: string;
}

/** Bottom sheet on phones, centred modal on desktop. Closes with Esc / backdrop / ✕. */
export const Sheet: React.FC<SheetProps> = ({ open, onClose, children, label }) => {
  const [closing, setClosing] = useState(false);

  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 230);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!open) return null;
  return (
    <div className={`sheet-root ${closing ? 'closing' : ''}`}>
      <div className="sheet-back" onClick={close} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        <button
          type="button"
          className="sheet-x"
          aria-label="Close"
          onClick={() => {
            haptics.fire('select');
            close();
          }}
        >
          <Icon name="x" size={18} sw={2.4} />
        </button>
        <div className="sheet-grab" />
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
};
