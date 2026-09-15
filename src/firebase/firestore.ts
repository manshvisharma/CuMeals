import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from './config';
import { DailyMenu, MealTimings, NoticeItem, MessSettings, FeedbackItem } from '../types';
import { generateMockMenus, defaultTimings, defaultNotices, defaultSettings } from './mockData';
import { getDayOfWeekFromDate } from '../utils/dateUtils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.warn(`[Firestore ${operationType} on ${path}]:`, errInfo.error);
}

// In-memory cache synced with local storage for instant fallback
const localMockMenus = generateMockMenus();

export function getLocalStorageMenu(key: string): DailyMenu | null {
  try {
    const saved = localStorage.getItem(`mess_menu_${key.toLowerCase()}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure the saved menu matches this exact date key
      if (parsed && (parsed.date === key || parsed.day === key)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Local storage read error', e);
  }
  return localMockMenus[key.toLowerCase()] || null;
}

export function setLocalStorageMenu(menu: DailyMenu) {
  try {
    const key = (menu.date || menu.day || '').toLowerCase();
    if (key) {
      localStorage.setItem(`mess_menu_${key}`, JSON.stringify(menu));
    }
  } catch (e) {
    console.error('Local storage write error', e);
  }
}

export function getLocalStorageConfig<T>(key: string): T | null {
  try {
    const saved = localStorage.getItem(`mess_config_${key}`);
    if (saved) return JSON.parse(saved) as T;
  } catch (e) {
    console.error('Local storage config read error', e);
  }
  return null;
}

export function setLocalStorageConfig<T>(key: string, data: T) {
  try {
    localStorage.setItem(`mess_config_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error('Local storage config write error', e);
  }
}

// 1. Fetch Menu for a specific date (e.g. "2026-08-20")
export async function fetchMenuForDate(dateOrDayStr: string): Promise<DailyMenu | null> {
  const key = dateOrDayStr.trim().toLowerCase();
  const isSpecificDate = /^\d{4}-\d{2}-\d{2}$/.test(key);

  // 1. Try direct date key in Firestore
  const path = `menus/${key}`;
  try {
    const docRef = doc(db, 'menus', key);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as DailyMenu;
      setLocalStorageMenu(data);
      return data;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }

  // 2. Check local memory / storage for this exact date
  const localDirect = getLocalStorageMenu(key);
  if (localDirect) {
    return localDirect;
  }

  // 3. If searching for a day name (e.g. "thursday") only, check day doc
  if (!isSpecificDate) {
    try {
      const dayRef = doc(db, 'menus', key);
      const daySnap = await getDoc(dayRef);
      if (daySnap.exists()) {
        const data = daySnap.data() as DailyMenu;
        return data;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `menus/${key}`);
    }
  }

  // If date has no menu uploaded, return null (do not show wrong menu from another week/day)
  return null;
}

// 2. Save/Update Menu for a day or date (Always overwrites with latest version)
export async function saveMenuForDate(menu: DailyMenu): Promise<boolean> {
  const key = (menu.date || menu.day || 'monday').trim().toLowerCase();
  const path = `menus/${key}`;
  
  const updatedMenu: DailyMenu = {
    ...menu,
    date: key,
    day: (menu.day || (key.includes('-') ? getDayOfWeekFromDate(key) : key)) as any,
    updatedAt: new Date().toISOString(),
    updatedBy: auth.currentUser?.email || 'Admin'
  };

  // Always update local memory & storage first so immediate refresh gets the latest
  setLocalStorageMenu(updatedMenu);
  localMockMenus[key] = updatedMenu;

  try {
    const docRef = doc(db, 'menus', key);
    // Overwrite completely so stale/deleted items don't linger
    await setDoc(docRef, updatedMenu);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return true;
  }
}

// 3. Bulk Save Menus (Overwrites each date menu with the latest)
export async function saveBulkMenus(menusList: DailyMenu[]): Promise<{ successCount: number; errors: string[] }> {
  let successCount = 0;
  const errors: string[] = [];

  for (const menu of menusList) {
    const key = (menu.date || menu.day || '').trim();
    if (!key) {
      errors.push('Menu missing required date or day property');
      continue;
    }
    const saved = await saveMenuForDate(menu);
    if (saved) {
      successCount++;
    } else {
      errors.push(`Failed to save menu for ${key}`);
    }
  }

  return { successCount, errors };
}

// 4. Fetch Meal Timings
export async function fetchTimings(): Promise<MealTimings> {
  const path = 'timings/default';
  try {
    const docRef = doc(db, 'timings', 'default');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as MealTimings;
      setLocalStorageConfig('timings', data);
      return data;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
  
  const local = getLocalStorageConfig<MealTimings>('timings');
  if (local) return local;
  
  return defaultTimings;
}

// 5. Save Meal Timings
export async function saveTimings(timings: MealTimings): Promise<boolean> {
  const path = 'timings/default';
  try {
    const docRef = doc(db, 'timings', 'default');
    await setDoc(docRef, timings, { merge: true });
    setLocalStorageConfig('timings', timings);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

// 6. Fetch Notices
export async function fetchNotices(): Promise<NoticeItem[]> {
  const path = 'notices';
  try {
    const colRef = collection(db, 'notices');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const notices: NoticeItem[] = [];
      snap.forEach(d => notices.push({ id: d.id, ...d.data() } as NoticeItem));
      const active = notices.filter(n => n.active !== false);
      setLocalStorageConfig('notices', active);
      return active;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
  
  const local = getLocalStorageConfig<NoticeItem[]>('notices');
  if (local) return local;
  
  return defaultNotices;
}

// 7. Save Notice
export async function saveNotice(notice: NoticeItem): Promise<boolean> {
  const path = `notices/${notice.id}`;
  try {
    const docRef = doc(db, 'notices', notice.id);
    await setDoc(docRef, notice, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

// 8. Delete Notice
export async function deleteNotice(id: string): Promise<boolean> {
  const path = `notices/${id}`;
  try {
    await deleteDoc(doc(db, 'notices', id));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
    return false;
  }
}

// 9. Fetch Settings
export async function fetchSettings(): Promise<MessSettings> {
  const path = 'settings/general';
  try {
    const docRef = doc(db, 'settings', 'general');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as MessSettings;
      setLocalStorageConfig('settings', data);
      return data;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
  
  const local = getLocalStorageConfig<MessSettings>('settings');
  if (local) return local;
  
  return defaultSettings;
}

// 10. Save Settings
export async function saveSettings(settings: MessSettings): Promise<boolean> {
  const path = 'settings/general';
  try {
    const docRef = doc(db, 'settings', 'general');
    await setDoc(docRef, settings, { merge: true });
    setLocalStorageConfig('settings', settings);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

// 11. Feedbacks & Suggestions Management
const FEEDBACKS_STORAGE_KEY = 'mess_feedbacks_store';

export async function submitFeedback(feedback: Omit<FeedbackItem, 'id' | 'createdAt' | 'status'>): Promise<boolean> {
  const newFeedback: FeedbackItem = {
    ...feedback,
    id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    createdAt: new Date().toISOString(),
    status: 'new'
  };

  // Local storage save
  try {
    const raw = localStorage.getItem(FEEDBACKS_STORAGE_KEY);
    const list: FeedbackItem[] = raw ? JSON.parse(raw) : [];
    list.unshift(newFeedback);
    localStorage.setItem(FEEDBACKS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Local storage feedback write failed', e);
  }

  // Firestore save
  try {
    const docRef = doc(db, 'feedbacks', newFeedback.id);
    await setDoc(docRef, newFeedback);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `feedbacks/${newFeedback.id}`);
    return true;
  }
}

export async function fetchFeedbacks(): Promise<FeedbackItem[]> {
  let list: FeedbackItem[] = [];

  // Firestore fetch
  try {
    const colRef = collection(db, 'feedbacks');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as FeedbackItem));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'feedbacks');
  }

  // Merge with local storage
  try {
    const raw = localStorage.getItem(FEEDBACKS_STORAGE_KEY);
    const localList: FeedbackItem[] = raw ? JSON.parse(raw) : [];
    const combined = [...list, ...localList];
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    
    unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return unique;
  } catch (e) {
    return list;
  }
}

export async function updateFeedbackStatus(id: string, status: 'new' | 'reviewed' | 'resolved'): Promise<boolean> {
  // Update local storage
  try {
    const raw = localStorage.getItem(FEEDBACKS_STORAGE_KEY);
    if (raw) {
      const list: FeedbackItem[] = JSON.parse(raw);
      const updated = list.map(item => item.id === id ? { ...item, status } : item);
      localStorage.setItem(FEEDBACKS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn(e);
  }

  // Update Firestore
  try {
    const docRef = doc(db, 'feedbacks', id);
    await setDoc(docRef, { status }, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `feedbacks/${id}`);
    return true;
  }
}

export async function deleteFeedback(id: string): Promise<boolean> {
  // Delete from local storage
  try {
    const raw = localStorage.getItem(FEEDBACKS_STORAGE_KEY);
    if (raw) {
      const list: FeedbackItem[] = JSON.parse(raw);
      const updated = list.filter(item => item.id !== id);
      localStorage.setItem(FEEDBACKS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn(e);
  }

  // Delete from Firestore
  try {
    await deleteDoc(doc(db, 'feedbacks', id));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `feedbacks/${id}`);
    return true;
  }
}
