import webpush from 'web-push';
import type { Sender } from './alerts.js';

// Keys come from environment variables. The fallback is the key pair that shipped with the original project so that
// existing installs keep working – replace it with your own pair (see docs/NOTIFICATIONS_SETUP.md).
const FALLBACK_PUBLIC = 'BMw-6JzSeK_hA_1oQL4IuE8SCv8KK2jjbLuDLJIxfkEll1qoVMW_8Xx4fS2nF8tKZe4VAec7b3y34ok61zpQ4As';
const FALLBACK_PRIVATE = '2hmlKG6KQCeO8Z-a-oiD2kYvMxDo3S8Xhqk3yL4aJaM';

export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || FALLBACK_PUBLIC;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || FALLBACK_PRIVATE;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@cumeals.app';

let configured = false;
export function usingFallbackKeys(): boolean {
  return !process.env.VAPID_PRIVATE_KEY;
}

function configure() {
  if (configured) return;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  if (usingFallbackKeys()) {
    console.warn('[CuMeals push] VAPID_PRIVATE_KEY is not set – using the key bundled with the project. Set your own keys in production.');
  }
}

/** Real sender: delivers through the browser vendor's push service (Apple / Google / Mozilla). */
export const webPushSender: Sender = async (target, payload, opts) => {
  configure();
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: '/icon-192.png',
    badge: '/favicon.png',
    url: payload.url || '/',
    tag: payload.tag
  });
  try {
    const res = await webpush.sendNotification({ endpoint: target.endpoint, keys: target.keys }, body, {
      TTL: opts.ttl,
      urgency: 'high',
      topic: opts.topic || undefined
    });
    return { ok: true, statusCode: res.statusCode };
  } catch (err: any) {
    return { ok: false, statusCode: err?.statusCode };
  }
};
