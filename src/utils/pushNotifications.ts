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

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
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
      error: 'On iPhone / iPad, Apple requires installing CuMeals to your Home Screen first before enabling notifications.'
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
      // In case registration wasn't triggered yet
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

    // 4. Save subscription to Firestore for backend dispatch
    const subJSON = subscription.toJSON();
    const endpointHash = btoa(subscription.endpoint).slice(-32).replace(/[^a-zA-Z0-9]/g, '_');
    
    const deviceType = status.isIOS 
      ? 'ios' 
      : (/Android/i.test(navigator.userAgent) ? 'android' : 'desktop');

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

    const subDocRef = doc(db, 'push_subscriptions', endpointHash);
    try {
      await setDoc(subDocRef, subData, { merge: true });
    } catch (dbErr: any) {
      console.warn('Firestore subscription sync warning:', dbErr?.message);
    }

    // Local marker
    localStorage.setItem('cumeals_push_subscribed', 'true');
    localStorage.setItem('cumeals_push_endpoint_hash', endpointHash);

    // Show initial confirmation via SW
    try {
      await registration.showNotification('CuMeals Alerts Activated! 🔔', {
        body: 'You will now receive meal timings, daily menu changes, and announcements even when CuMeals is closed.',
        icon: '/icon-192.png',
        badge: '/favicon.png',
        data: { url: '/' }
      });
    } catch (swErr) {
      console.warn('SW initial notification note:', swErr);
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
    return true;
  } catch (err) {
    console.error('Error unsubscribing:', err);
    return false;
  }
}

// Send test notification (via server API and fallback via local SW)
export async function sendTestPushAlert(title = 'CuMeals Test Alert', body = 'Test notification delivered successfully!'): Promise<{ success: boolean; message: string }> {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        // Trigger server-side push through web-push
        const res = await fetch('/api/test-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: sub.toJSON(),
            title,
            body,
            url: '/'
          })
        });

        if (res.ok) {
          return { success: true, message: 'Push notification sent through Web Push server!' };
        }
      }

      // Fallback direct SW display
      await reg.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/favicon.png',
        data: { url: '/' }
      });

      return { success: true, message: 'Notification displayed directly on device!' };
    }
    return { success: false, message: 'Service worker is not active.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to send test push alert.' };
  }
}

// Fetch all active subscribers from Firestore for Admin
export async function getAllPushSubscribers(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'push_subscriptions'));
    const list: any[] = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (e) {
    console.error('Error fetching subscribers', e);
    return [];
  }
}
