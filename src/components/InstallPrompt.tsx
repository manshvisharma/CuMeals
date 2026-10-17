import React, { useEffect, useState } from 'react';
import { CuMealsLogo } from './CuMealsLogo';
import { Sheet } from './bento/Sheet';
import { Icon } from './bento/Icon';
import { haptics } from '../utils/haptics';

export const InstallPrompt: React.FC = () => {
  const [deferred, setDeferred] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onBefore = (e: any) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', onBefore);
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true) setInstalled(true);
    return () => window.removeEventListener('beforeinstallprompt', onBefore);
  }, []);

  const install = async () => {
    haptics.fire('medium');
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferred(null);
    } else {
      setHelp(true);
    }
  };

  if (installed || dismissed) return null;

  return (
    <>
      <div className="banner" style={{ marginTop: 14 }}>
        <CuMealsLogo size="sm" />
        <div className="grow">
          <h3>Install CuMeals</h3>
          <p>One-tap access from your home screen</p>
        </div>
        <button type="button" className="chip-btn" onClick={install}>Install</button>
        <button type="button" className="x" aria-label="Dismiss" onClick={() => setDismissed(true)}>
          <Icon name="x" size={16} sw={2.2} />
        </button>
      </div>

      <Sheet open={help} onClose={() => setHelp(false)} label="Install CuMeals">
        <div className="sh-title">
          <h2>Install CuMeals</h2>
          <p>Add it to your home screen in two taps</p>
        </div>
        <div className="notice"><div className="n-top"><b>1 · Open the browser menu</b></div><p>Tap Share (Safari, iPhone) or ⋮ (Chrome, Android / desktop).</p></div>
        <div className="notice"><div className="n-top"><b>2 · Add to Home Screen</b></div><p>Choose “Add to Home Screen” or “Install app”, then open CuMeals from your home screen.</p></div>
        <button type="button" className="btn primary block" onClick={() => setHelp(false)}>Got it</button>
      </Sheet>
    </>
  );
};
