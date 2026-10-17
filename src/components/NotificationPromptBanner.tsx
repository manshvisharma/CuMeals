import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { getPushStatus, subscribeToPushNotifications, PushStatus } from '../utils/pushNotifications';
import { Icon } from './bento/Icon';
import { haptics } from '../utils/haptics';

interface Props {
  currentUser: User | null;
}

export const NotificationPromptBanner: React.FC<Props> = ({ currentUser }) => {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tip, setTip] = useState(false);

  useEffect(() => {
    const s = getPushStatus();
    setStatus(s);
    let off = false;
    try {
      off = localStorage.getItem('cumeals_push_banner_dismissed') === 'true';
    } catch {
      /* ignore */
    }
    if (!s.isSubscribed && !off && (s.isSupported || s.isIOS)) setDismissed(false);
  }, []);

  if (!status || dismissed || status.isSubscribed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('cumeals_push_banner_dismissed', 'true');
    } catch {
      /* ignore */
    }
  };

  const enable = async () => {
    haptics.fire('medium');
    if (status.isIOS && !status.isStandalone) return setTip(true);
    setBusy(true);
    const res = await subscribeToPushNotifications(currentUser);
    setBusy(false);
    if (res.success) {
      setStatus(getPushStatus());
      setDismissed(true);
    } else if (res.requiresPWAInstall) setTip(true);
  };

  return (
    <div className="banner" role="region" aria-label="Enable meal alerts">
      <span className="row-ico"><Icon name="bell" size={20} /></span>
      <div className="grow">
        <h3>Get the menu before every meal</h3>
        <p>
          {tip
            ? 'On iPhone: tap Share → Add to Home Screen, then open CuMeals from your home screen.'
            : 'Lock-screen alerts, even when the app is closed.'}
        </p>
      </div>
      <button type="button" className="chip-btn" onClick={enable} disabled={busy}>
        {busy ? '…' : status.isIOS && !status.isStandalone ? 'How?' : 'Turn on'}
      </button>
      <button type="button" className="x" aria-label="Dismiss" onClick={dismiss}>
        <Icon name="x" size={16} sw={2.2} />
      </button>
    </div>
  );
};
