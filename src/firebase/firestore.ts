import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from './config';
import { DailyMenu, MealTimings, NoticeItem, MessSettings, FeedbackItem } from '../types';
import { generateMockMenus, defaultTimings, defaultNotices, defaultSettings } from './mockData';

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

function getLocalStorageMenu(date: string): DailyMenu | null {
  try {
    const saved = localStorage.getItem(`mess_menu_${date}`);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Local storage read error', e);
  }
  return localMockMenus[date] || null;
}

function setLocalStorageMenu(menu: DailyMenu) {
  try {
    localStorage.setItem(`mess_menu_${menu.date}`, JSON.stringify(menu));
  } catch (e) {
    console.error('Local storage write error', e);
  }
}

// 1. Fetch Menu for a specific date
export async function fetchMenuForDate(dateStr: string): Promise<DailyMenu | null> {
  const path = `menus/${dateStr}`;
  try {
    const docRef = doc(db, 'menus', dateStr);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as DailyMenu;
      setLocalStorageMenu(data);
      return data;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }

  // Fallback to local storage or generated mock
  return getLocalStorageMenu(dateStr);
}

// 2. Save/Update Menu for a date
export async function saveMenuForDate(menu: DailyMenu): Promise<boolean> {
  const path = `menus/${menu.date}`;
  const updatedMenu = {
    ...menu,
    updatedAt: new Date().toISOString(),
    updatedBy: auth.currentUser?.email || 'Admin'
  };

  // Always update local memory & storage first
  setLocalStorageMenu(updatedMenu);
  localMockMenus[menu.date] = updatedMenu;

  try {
    const docRef = doc(db, 'menus', menu.date);
    await setDoc(docRef, updatedMenu, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    // Even if Firestore fails, local changes persisted
    return true;
  }
}

// 3. Bulk Save Menus
export async function saveBulkMenus(menusList: DailyMenu[]): Promise<{ successCount: number; errors: string[] }> {
  let successCount = 0;
  const errors: string[] = [];

  for (const menu of menusList) {
    if (!menu.date) {
      errors.push('Menu missing required date property');
      continue;
    }
    const saved = await saveMenuForDate(menu);
    if (saved) successCount++;
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
      return docSnap.data() as MealTimings;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
  return defaultTimings;
}

// 5. Save Meal Timings
export async function saveTimings(timings: MealTimings): Promise<boolean> {
  const path = 'timings/default';
  try {
    const docRef = doc(db, 'timings', 'default');
    await setDoc(docRef, timings, { merge: true });
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
      return notices.filter(n => n.active !== false);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
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
      return snap.data() as MessSettings;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
  return defaultSettings;
}

// 10. Save Settings
export async function saveSettings(settings: MessSettings): Promise<boolean> {
  const path = 'settings/general';
  try {
    const docRef = doc(db, 'settings', 'general');
    await setDoc(docRef, settings, { merge: true });
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
    return true; // Persisted locally
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

