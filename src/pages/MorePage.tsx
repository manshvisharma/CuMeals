import React, { useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { InstallPrompt } from '../components/InstallPrompt';
import { NoticeModal } from '../components/NoticeModal';
import { UserProfileModal } from '../components/UserProfileModal';
import { ThemeSettingCard } from '../components/ThemeSettingCard';
import { NotificationSettingsCard } from '../components/NotificationSettingsCard';
import { CuMealsLogo } from '../components/CuMealsLogo';
import { Icon } from '../components/bento/Icon';
import { Switch } from '../components/bento/Switch';
import { Sheet } from '../components/bento/Sheet';
import { useMessConfig } from '../hooks/useMenu';
import { subscribeToAuth } from '../firebase/auth';
import { submitFeedback } from '../firebase/firestore';
import { isUserAdmin } from '../utils/adminUtils';
import { haptics } from '../utils/haptics';
import { showToast } from '../utils/toast';

interface MorePageProps {
  onOpenAdmin: () => void;
}

type FbCat = 'food' | 'hygiene' | 'timing' | 'general';
const CATS: { id: FbCat; label: string }[] = [
  { id: 'food', label: '🍲 Food' },
  { id: 'hygiene', label: '✨ Hygiene' },
  { id: 'timing', label: '⏰ Timing' },
  { id: 'general', label: '💡 General' }
];

export const MorePage: React.FC<MorePageProps> = ({ onOpenAdmin }) => {
  const { notices } = useMessConfig();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sheet, setSheet] = useState<'about' | 'feedback' | null>(null);
  const [hapticsOn, setHapticsOn] = useState(haptics.isEnabled());

  const [text, setText] = useState('');
  const [cat, setCat] = useState<FbCat>('food');
  const [sending, setSending] = useState(false);

  useEffect(() => subscribeToAuth(setUser), []);

  const activeNotices = (notices || []).filter((n) => n.active !== false);
  const admin = isUserAdmin(user?.email);

  const share = async () => {
    haptics.fire('light');
    const url = window.location.origin;
    if (navigator.share) navigator.share({ title: 'CuMeals', text: "Check today's hostel mess menu on CuMeals!", url }).catch(() => {});
    else {
      try {
        await navigator.clipboard.writeText(url);
        showToast('Link copied');
      } catch {
        showToast(url);
      }
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await submitFeedback({
        message: text.trim(),
        userName: user?.displayName || user?.email?.split('@')[0] || 'Hostel Student',
        userEmail: user?.email || undefined,
        category: cat
      });
      haptics.fire('success');
      showToast('Feedback sent — thank you!');
      setText('');
      setSheet(null);
    } catch {
      haptics.fire('error');
      showToast('Could not send. Try again.');
    } finally {
      setSending(false);
    }
  };

  const Row: React.FC<{ icon: string; title: string; sub?: string; onClick: () => void; extra?: React.ReactNode }> = ({ icon, title, sub, onClick, extra }) => (
    <button type="button" className="row tap" onClick={() => (haptics.fire('light'), onClick())}>
      <span className="row-ico"><Icon name={icon} size={20} /></span>
      <span className="grow"><h3>{title}</h3>{sub && <p>{sub}</p>}</span>
      {extra}
      <Icon name="right" size={18} sw={2} />
    </button>
  );

  const initial = user ? (user.displayName || user.email || 'U')[0].toUpperCase() : '';

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>More</h1>
          <p>Profile, alerts & feedback</p>
        </div>
        <CuMealsLogo size="md" />
      </header>

      <button type="button" className="cm-card profile tap" onClick={() => (haptics.fire('light'), setProfileOpen(true))}>
        <div className="avatar">{initial || <Icon name="user" size={24} />}</div>
        <div className="grow">
          <h3>{user ? user.displayName || 'Student account' : 'Sign in / Account'}</h3>
          <p>{user ? user.email : 'Google & email sign-in'}</p>
        </div>
        <Icon name="right" size={18} sw={2} />
      </button>

      <InstallPrompt />

      <div className="group-label">Alerts</div>
      <NotificationSettingsCard currentUser={user} />

      <div className="group-label">General</div>
      <div className="list">
        <Row
          icon="bell"
          title="Notice board"
          sub={activeNotices.length ? `${activeNotices.length} from the mess committee` : 'No new announcements'}
          onClick={() => setNoticeOpen(true)}
          extra={activeNotices.length ? <span className="badge">{activeNotices.length}</span> : undefined}
        />
        <div className="row">
          <span className="row-ico"><Icon name="vibrate" size={20} /></span>
          <span className="grow"><h3>Haptic feedback</h3><p>{haptics.isSupported() ? 'Tap feedback on the navigation bar' : 'Not available on this device'}</p></span>
          <Switch
            on={hapticsOn}
            label="Haptic feedback"
            onChange={(v) => {
              haptics.setEnabled(v);
              setHapticsOn(v);
            }}
          />
        </div>
        <ThemeSettingCard />
      </div>

      <div className="group-label">Support</div>
      <div className="list">
        <Row icon="chat" title="Feedback & suggestions" sub="Food, hygiene, timing — tell us" onClick={() => setSheet('feedback')} />
        <Row icon="share" title="Share CuMeals" sub="Send the app link to friends" onClick={share} />
        <Row icon="info" title="About" sub="Version 2.0" onClick={() => setSheet('about')} />
        <Row
          icon="lock"
          title="Admin portal"
          sub={admin ? 'Menus, timings, notifications & feedback' : 'Mess committee only'}
          onClick={onOpenAdmin}
          extra={admin ? <span className="pill later">Admin</span> : undefined}
        />
      </div>

      <p style={{ textAlign: 'center', color: 'var(--fg3)', fontSize: 12, fontWeight: 600, margin: '28px 0 6px' }}>
        Made with ♥ for hostel students
      </p>

      <UserProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} currentUser={user} />
      <NoticeModal isOpen={noticeOpen} onClose={() => setNoticeOpen(false)} notices={notices} />

      <Sheet open={sheet === 'about'} onClose={() => setSheet(null)} label="About CuMeals">
        <div className="sh-hero">
          <CuMealsLogo size="lg" />
          <div><h2>CuMeals</h2><p>Good food, good mood.</p></div>
        </div>
        <p style={{ marginTop: 18, fontSize: 14, lineHeight: 1.6, color: 'var(--fg2)' }}>
          Daily hostel mess menu, live meal timings and meal alerts on your phone.
          <br />• Weekly menu kept up to date by the mess committee.
          <br />• Live “serving now” and “up next” countdown.
          <br />• Direct feedback line to the mess administration.
        </p>
      </Sheet>

      <Sheet open={sheet === 'feedback'} onClose={() => setSheet(null)} label="Send feedback">
        <div className="sh-title"><h2>Send feedback</h2><p>Goes straight to the mess committee</p></div>
        <form onSubmit={send}>
          <div className="chips">
            {CATS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="chip"
                style={cat === c.id ? { background: 'var(--accent)', color: 'var(--accent-fg)' } : undefined}
                onClick={() => (haptics.fire('select'), setCat(c.id))}
              >
                {c.label}
              </button>
            ))}
          </div>
          <textarea className="fb-text" rows={4} required value={text} onChange={(e) => setText(e.target.value)} placeholder="What can we do better?" />
          <button type="submit" className="btn primary block" disabled={sending}>{sending ? 'Sending…' : 'Send feedback'}</button>
        </form>
      </Sheet>
    </div>
  );
};
