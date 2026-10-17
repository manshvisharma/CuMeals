import React, { useEffect, useRef, useState } from 'react';
import { TOAST_EVENT } from '../../utils/toast';

export const Toast: React.FC = () => {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const timer = useRef<number>();
  useEffect(() => {
    const on = (e: Event) => {
      setMsg(String((e as CustomEvent).detail || ''));
      setShow(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setShow(false), 2200);
    };
    window.addEventListener(TOAST_EVENT, on);
    return () => window.removeEventListener(TOAST_EVENT, on);
  }, []);
  return (
    <div id="cm-toast" className={show ? 'show' : ''} role="status" aria-live="polite">
      {msg}
    </div>
  );
};
