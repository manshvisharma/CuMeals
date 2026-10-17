import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  getPushStatus, subscribeToPushNotifications, unsubscribeFromPushNotifications, PushStatus,
  getAlertPrefs, saveAlertPrefs
} from '../utils/pushNotifications';
import { DeviceAlertPrefs } from '../types';
import { Icon } from './bento/Icon';
import { Switch } from './bento/Switch';
import { BlockToggle } from './bento/BlockToggle';
import { useSnackBlock } from '../utils/prefs';
import { showToast } from '../utils/toast';

interface Props {
  currentUser: User | null;
}

const MEALS: { id: 'breakfast' | 'lunch' | 'snacks' | 'dinner'; label: string; emoji: string }[] = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🥞' },
  { id: 'lunch', label: 'Lunch', emoji: '🍛' },
  { id: 'snacks', label: 'Snacks', emoji: '☕' },
  { id: 'dinner', label: 'Dinner', emoji: '🍽️' }
];

export const NotificationSettingsCard: React.FC<Props> = ({ currentUser }) => {
  const [status, setStatus] = useState<PushStatus>(getPushStatus());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<DeviceAlertPrefs>(getAlertPrefs());
  const [block, setBlock] = useSnackBlock();

  useEffect(() => setStatus(getPushStatus()), []);

  // keep the stored block in sync with the dashboard's Boys/Girls choice
  useEffect(() => {
    if (prefs.snacksBlock !== block) {
      const next = { ...prefs, snacksBlock: block };
      setPrefs(next);
      if (status.isSubscribed) saveAlertPrefs(next);
    }
  }, [block]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMaster = async (on: boolean) => {
    setBusy(true);
    setError(null);
    if (on) {
      const res = await subscribeToPushNotifications(currentUser);
      if (!res.success) setError(res.error || 'Could not turn on notifications.');
      else showToast('Meal alerts are on 🔔');
    } else {
      await unsubscribeFromPushNotifications();
      showToast('Meal alerts turned off on this device');
    }
    setStatus(getPushStatus());
    setBusy(false);
  };

  const setMeal = (id: keyof DeviceAlertPrefs, v: boolean) => {
    const next = { ...prefs, [id]: v } as DeviceAlertPrefs;
    setPrefs(next);
    saveAlertPrefs(next);
  };

  const iosBlocked = status.isIOS && !status.isStandalone;
  const unsupported = !status.isSupported && !iosBlocked;

  return (
    <div className="list">
      <div className="row">
        <span className="row-ico"><Icon name="bell" size={20} /></span>
        <span className="grow">
          <h3>Meal alerts</h3>
          <p>
            {status.isSubscribed
              ? 'Menu reminder before each meal + when it starts'
              : iosBlocked
              ? 'Install to Home Screen first (see below)'
              : unsupported
              ? 'Not supported in this browser'
              : 'Get the menu on your lock screen'}
          </p>
        </span>
        <Switch on={status.isSubscribed} onChange={toggleMaster} label="Meal alerts" disabled={busy || unsupported} />
      </div>

      {iosBlocked && (
        <div className="row col">
          <div className="warn-box">
            On iPhone / iPad: tap <b>Share</b> → <b>Add to Home Screen</b>, then open CuMeals from your home screen and turn alerts on.
          </div>
        </div>
      )}

      {error && (
        <div className="row col">
          <div className="warn-box" role="alert">{error}</div>
        </div>
      )}

      {status.isSubscribed && (
        <>
          <div className="row col">
            <div className="row-line"><span className="grow"><p style={{ marginTop: 0 }}>Which meals should alert you?</p></span></div>
            <div className="chips">
              {MEALS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`chip ${prefs[m.id] ? '' : ''}`}
                  style={prefs[m.id] ? { background: 'var(--accent)', color: 'var(--accent-fg)' } : undefined}
                  aria-pressed={prefs[m.id]}
                  onClick={() => setMeal(m.id, !prefs[m.id])}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="row">
            <span className="grow"><h3>Snacks block</h3><p>Alert shows your block's snacks</p></span>
            <BlockToggle value={block} onChange={setBlock} />
          </div>
        </>
      )}
    </div>
  );
};
