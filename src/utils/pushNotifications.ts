import { db } from '../firebase/config';
import { doc, setDoc, deleteDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { User } from 'firebase/auth';

export const VAPID_PUBLIC_KEY = "BMw-6JzSeK_hA_1oQL4IuE8SCv8KK2jjbLuDLJIxfkEll1qoVMW_8Xx4fS2nF8tKZe4VAec7b3y34ok61zpQ4As";

export interface PushStatus {
  isSupported: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
}

export function detectIsIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const isAppleMobile = /iPad|iPhone|iPod/i.test(ua) || /iPad|iPhone|iPod/i.test(platform);
  const isIPadOS = platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isWebKitIOS = /AppleWebKit/i.test(ua) && /Mobile/i.test(ua) && !/Android/i.test(ua);
  return isAppleMobile || isIPadOS || isWebKitIOS;
}

// Convert VAPID base64 string to Uint8Array for PushManager
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Check platform compatibility
export function getPushStatus(): PushStatus {
  const isClient = typeof window !== 'undefined';
  if (!isClient) {
    return {
      isSupported: false,
      isIOS: false,
      isStandalone: false,
      permission: 'unsupported',
      isSubscribed: false
    };
  }

  const isIOS = detectIsIOS();
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches || 
    (navigator as any).standalone === true;

  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const permission = isSupported ? Notification.permission : 'unsupported';
  
  const savedSub = localStorage.getItem('cumeals_push_subscribed') === 'true';

  return {
    isSupported,
    isIOS,
    isStandalone,
    permission,
    isSubscribed: savedSub && permission === 'granted'
  };
}

// Normalize subscriber object and device type
export function normalizeSubscriber(sub: any): any {
  if (!sub) return null;
  const endpoint = String(sub.endpoint || '').toLowerCase();
  const rawType = String(sub.deviceType || '').toLowerCase();

  let deviceType: 'ios' | 'android' | 'desktop' = 'desktop';
  if (rawType === 'ios' || endpoint.includes('apple.com') || endpoint.includes('push.apple.com')) {
    deviceType = 'ios';
  } else if (rawType === 'android' || endpoint.includes('fcm.googleapis.com') || endpoint.includes('google.com')) {
    deviceType = 'android';
  }

  return {
    ...sub,
    deviceType
  };
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(currentUser?: User | null): Promise<{
  success: boolean;
  error?: string;
  subscription?: PushSubscription;
  requiresPWAInstall?: boolean;
}> {
  const status = getPushStatus();

  // iOS check: iOS 16.4+ requires the app to be installed to Home Screen (standalone)
  if (status.isIOS && !status.isStandalone) {
    return {
      success: false,
      requiresPWAInstall: true,
      error: 'On iPhone / iPad, Apple requires installing CuMeals to your Home Screen first (Tap Share → Add to Home Screen) before enabling notifications.'
    };
  }

  if (!status.isSupported) {
    return {
      success: false,
      error: 'Web Push is not supported in this browser.'
    };
  }

  try {
    // 1. Request user permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: permission === 'denied' 
          ? 'Notification permission was denied in your browser settings.' 
          : 'Notification permission was not granted.'
      };
    }

    // 2. Ensure Service Worker is ready
    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.ready;
    } catch {
      registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
    }

    // 3. Check for existing subscription or create new
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    // 4. Determine device type
    const isIOSDevice = status.isIOS || detectIsIOS() || subscription.endpoint.includes('apple.com');
    const isAndroidDevice = !isIOSDevice && (/Android/i.test(navigator.userAgent) || subscription.endpoint.includes('fcm.googleapis.com'));
    const deviceType: 'ios' | 'android' | 'desktop' = isIOSDevice ? 'ios' : (isAndroidDevice ? 'android' : 'desktop');

    // 5. Clean document id for Firestore
    const subJSON = subscription.toJSON();
    const cleanId = btoa(encodeURIComponent(subscription.endpoint))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      .slice(-40);
    
    const endpointHash = cleanId || `sub_${Date.now()}`;

    const subData = {
      endpoint: subscription.endpoint,
      keys: subJSON.keys,
      deviceType,
      isStandalone: status.isStandalone,
      userId: currentUser?.uid || 'anonymous',
      userEmail: currentUser?.email || 'Anonymous Student',
      userName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Student',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    };

    // Save to Firestore
    try {
      const subDocRef = doc(db, 'push_subscriptions', endpointHash);
      await setDoc(subDocRef, subData, { merge: true });
    } catch (dbErr: any) {
      console.warn('Firestore subscription sync error:', dbErr?.message);
    }

    // Also register with server backend API directly
    try {
      await fetch('/api/register-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: endpointHash,
          ...subData,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        })
      });
    } catch (apiErr) {
      // Ignore background network error
    }

    // Local marker
    localStorage.setItem('cumeals_push_subscribed', 'true');
    localStorage.setItem('cumeals_push_endpoint_hash', endpointHash);
    localStorage.setItem('cumeals_cached_push_subscription', JSON.stringify({
      id: endpointHash,
      ...subData,
      deviceType,
      updatedAt: new Date().toISOString()
    }));

    // Send immediate confirmation / welcome alert
    try {
      await registration.showNotification('CuMeals Alerts Activated! 🔔', {
        body: 'Meal timings, upcoming dishes, and hostel mess alerts are now active for your device.',
        icon: '/icon-192.png',
        badge: '/favicon.png',
        data: { url: '/' }
      });
    } catch (swErr) {
      console.warn('SW notification note:', swErr);
    }

    return {
      success: true,
      subscription
    };
  } catch (err: any) {
    console.error('Failed to subscribe to push notifications:', err);
    return {
      success: false,
      error: err?.message || 'Failed to complete push subscription.'
    };
  }
}

// Unsubscribe
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
    }

    const endpointHash = localStorage.getItem('cumeals_push_endpoint_hash');
    if (endpointHash) {
      try {
        await deleteDoc(doc(db, 'push_subscriptions', endpointHash));
      } catch (e) {
        console.error('Error removing subscription from DB', e);
      }
    }

    localStorage.removeItem('cumeals_push_subscribed');
    localStorage.removeItem('cumeals_push_endpoint_hash');
    localStorage.removeItem('cumeals_cached_push_subscription');
    return true;
  } catch (err) {
    console.error('Error unsubscribing:', err);
    return false;
  }
}

// Fetch all active subscribers for Admin (Firestore + Server API + Local device sync)
export async function getAllPushSubscribers(): Promise<any[]> {
  const map = new Map<string, any>();

  // 1. Try Firestore
  try {
    const snap = await getDocs(collection(db, 'push_subscriptions'));
    snap.forEach(d => {
      const data = d.data();
      if (data && data.endpoint) {
        map.set(data.endpoint, normalizeSubscriber({ id: d.id, ...data }));
      }
    });
  } catch (e) {
    console.warn('Firestore fetch push_subscriptions note:', e);
  }

  // 2. Try Server API backend
  try {
    const res = await fetch('/api/subscribers');
    if (res.ok) {
      const data = await res.json();
      if (data.subscribers && Array.isArray(data.subscribers)) {
        for (const sub of data.subscribers) {
          if (sub && sub.endpoint) {
            const normalized = normalizeSubscriber(sub);
            if (!map.has(sub.endpoint)) {
              map.set(sub.endpoint, normalized);
            } else {
              // Merge if deviceType was more accurate from server
              const existing = map.get(sub.endpoint);
              if (existing.deviceType === 'desktop' && normalized.deviceType !== 'desktop') {
                map.set(sub.endpoint, { ...existing, deviceType: normalized.deviceType });
              }
            }
          }
        }
      }
    }
  } catch (e) {
    // Ignore server error
  }

  // 3. Fallback: If current device is subscribed locally, ensure it appears
  try {
    const localCached = localStorage.getItem('cumeals_cached_push_subscription');
    if (localCached) {
      const parsed = JSON.parse(localCached);
      if (parsed?.endpoint && !map.has(parsed.endpoint)) {
        map.set(parsed.endpoint, normalizeSubscriber(parsed));
      }
    }

    // Also check PushManager directly if available
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      const currentSub = await reg.pushManager.getSubscription();
      if (currentSub && !map.has(currentSub.endpoint)) {
        const subJSON = currentSub.toJSON();
        const isIOS = detectIsIOS() || currentSub.endpoint.includes('apple.com');
        const isAndroid = !isIOS && (/Android/i.test(navigator.userAgent) || currentSub.endpoint.includes('fcm.googleapis.com'));
        const deviceType = isIOS ? 'ios' : (isAndroid ? 'android' : 'desktop');
        
        const fallbackSub = {
          id: 'device_current',
          endpoint: currentSub.endpoint,
          keys: subJSON.keys,
          deviceType,
          isStandalone: window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true,
          userName: 'Current Device',
          userEmail: 'Active Subscriber',
          updatedAt: new Date().toISOString()
        };
        map.set(currentSub.endpoint, fallbackSub);
      }
    }
  } catch (e) {
    // Ignore
  }

  return Array.from(map.values()).map(normalizeSubscriber);
}
