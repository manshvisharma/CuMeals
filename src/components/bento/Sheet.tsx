import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { haptics } from '../../utils/haptics';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label?: string;
}

/** Bottom sheet on phones, centered sheet on desktop. Closes with Esc / backdrop / ✕ / swipe-down. */
export const Sheet: React.FC<SheetProps> = ({ open, onClose, children, label }) => {
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const drag = useRef({
    active: false,
    startY: 0,
    currentY: 0,
    startTime: 0,
    isGrabBar: false
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 220);
  }, [closing, onClose]);

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

  const handleTouchStart = (e: React.TouchEvent, fromGrab = false) => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    // Only allow drag if scrolled to top or dragging from the grab bar
    if (!fromGrab && sheet.scrollTop > 5) return;

    const y = e.touches[0].clientY;
    drag.current = {
      active: true,
      startY: y,
      currentY: y,
      startTime: Date.now(),
      isGrabBar: fromGrab
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!drag.current.active) return;
    const sheet = sheetRef.current;
    if (!sheet) return;

    const y = e.touches[0].clientY;
    const deltaY = y - drag.current.startY;

    // If pulling up, don't drag sheet upward
    if (deltaY < 0) {
      sheet.style.transform = '';
      return;
    }

    // Cancel drag if user scrolls down into content when not on grab bar
    if (!drag.current.isGrabBar && sheet.scrollTop > 5) {
      drag.current.active = false;
      sheet.style.transform = '';
      return;
    }

    drag.current.currentY = y;
    sheet.style.transform = `translateY(${deltaY}px)`;
    sheet.style.transition = 'none';

    if (backRef.current) {
      const opacity = Math.max(0, 1 - deltaY / 400);
      backRef.current.style.opacity = `${opacity}`;
    }
  };

  const handleTouchEnd = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    const sheet = sheetRef.current;
    if (!sheet) return;

    const deltaY = drag.current.currentY - drag.current.startY;
    const duration = Date.now() - drag.current.startTime;
    const velocity = deltaY / Math.max(1, duration);

    // If dragged > 80px down or swiped quickly (>0.4px/ms)
    if (deltaY > 80 || (deltaY > 30 && velocity > 0.4)) {
      haptics.fire('light');
      sheet.style.transition = 'transform 0.22s cubic-bezier(0.32, 1, 0.23, 1)';
      sheet.style.transform = 'translateY(100%)';
      if (backRef.current) {
        backRef.current.style.transition = 'opacity 0.22s ease-out';
        backRef.current.style.opacity = '0';
      }
      window.setTimeout(() => {
        if (sheet) {
          sheet.style.transform = '';
          sheet.style.transition = '';
        }
        if (backRef.current) {
          backRef.current.style.opacity = '';
          backRef.current.style.transition = '';
        }
        onClose();
      }, 220);
    } else {
      // Snap back up
      sheet.style.transition = 'transform 0.3s cubic-bezier(0.2, 1.25, 0.35, 1)';
      sheet.style.transform = 'translateY(0px)';
      if (backRef.current) {
        backRef.current.style.transition = 'opacity 0.25s ease-out';
        backRef.current.style.opacity = '';
      }
      window.setTimeout(() => {
        if (sheet) {
          sheet.style.transform = '';
          sheet.style.transition = '';
        }
      }, 300);
    }
  };

  if (!open || !mounted) return null;

  const content = (
    <div className={`sheet-root ${closing ? 'closing' : ''}`}>
      <div ref={backRef} className="sheet-back" onClick={close} />
      <div
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onTouchStart={(e) => handleTouchStart(e, false)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          className="sheet-grab-area"
          onTouchStart={(e) => {
            e.stopPropagation();
            handleTouchStart(e, true);
          }}
        >
          <div className="sheet-grab" />
        </div>

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

        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
