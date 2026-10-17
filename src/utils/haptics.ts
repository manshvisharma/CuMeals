/**
 * Haptic feedback for the navigation bar and buttons.
 *
 *  • Android (Chrome / Edge / Samsung Internet): uses navigator.vibrate().
 *  • iPhone / iPad (Safari 17.4+, also the installed home-screen app):
 *    Apple has no vibrate API, but toggling an <input type="checkbox" switch>
 *    makes iOS play its native "selection" tap. We keep one hidden switch on the
 *    page and click its <label> – this only works from inside a real tap/click
 *    (user gesture), which is how it is used here.
 *  • Desktop browsers: silently does nothing.
 *
 * Students can switch haptics off in More → Haptic feedback (saved on the device).
 */

export type HapticKind = 'select' | 'light' | 'medium' | 'success' | 'error';

const STORAGE_KEY = 'cumeals_haptics';

let enabled = true;
try {
  enabled = localStorage.getItem(STORAGE_KEY) !== 'off';
} catch {
  /* private mode – keep default */
}

let iosLabel: HTMLLabelElement | null = null;
let lastFire = 0;

function ensureIosSwitch(): HTMLLabelElement | null {
  if (typeof document === 'undefined') return null;
  if (iosLabel && iosLabel.isConnected) return iosLabel;
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  label.appendChild(input);
  (document.head || document.body).appendChild(label);
  iosLabel = label;
  return label;
}

function iosTap() {
  try {
    ensureIosSwitch()?.click();
  } catch {
    /* ignore */
  }
}

const VIBRATE_PATTERNS: Record<HapticKind, number | number[]> = {
  select: 6,
  light: 10,
  medium: 16,
  success: [12, 45, 12],
  error: [22, 40, 22, 40, 22]
};

/** Number of native taps on iOS per kind (spaced 110 ms apart). */
const IOS_TAPS: Record<HapticKind, number> = { select: 1, light: 1, medium: 1, success: 2, error: 3 };

export const haptics = {
  /** true if this device can probably give haptic feedback */
  isSupported(): boolean {
    if (typeof navigator === 'undefined') return false;
    const hasVibrate = typeof (navigator as any).vibrate === 'function';
    const ua = navigator.userAgent || '';
    const isApple = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
    return hasVibrate || isApple;
  },

  isEnabled(): boolean {
    return enabled;
  },

  setEnabled(value: boolean) {
    enabled = value;
    try {
      localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
    } catch {
      /* ignore */
    }
    if (value) haptics.fire('medium');
  },

  fire(kind: HapticKind = 'light') {
    if (!enabled || typeof navigator === 'undefined') return;
    const now = Date.now();
    if (now - lastFire < 18) return; // avoid buzzing twice for one gesture
    lastFire = now;

    try {
      const vibrate = (navigator as any).vibrate;
      if (typeof vibrate === 'function') vibrate.call(navigator, VIBRATE_PATTERNS[kind]);
    } catch {
      /* ignore */
    }

    // iOS: native tap(s). Harmless no-op everywhere else.
    iosTap();
    const extra = IOS_TAPS[kind] - 1;
    for (let i = 1; i <= extra; i++) setTimeout(iosTap, 110 * i);
  }
};

// Create the hidden iOS switch early, so it already exists when the first tap happens.
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ensureIosSwitch(), { once: true });
  } else {
    ensureIosSwitch();
  }
}
