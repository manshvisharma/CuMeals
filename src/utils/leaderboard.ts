import { collection, addDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { LeaderboardEntry } from '../types';

const LOCAL_STORAGE_KEY = 'mess_game_leaderboards_real_v5';

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem('cumeals_device_id');
    if (!id) {
      id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('cumeals_device_id', id);
    }
    return id;
  } catch (e) {
    return `dev_fallback_${Math.random().toString(36).substring(2, 7)}`;
  }
}

function getISOWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

let cachedGlobalEntries: LeaderboardEntry[] = [];
let lastFetchTimestamp = 0;

/**
 * Pre-fetches all global scores from Firestore into memory and local storage.
 */
export async function prefetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    // Attempt to sync any local scores that were played offline / before firestore was ready
    await syncLocalScoresToFirestore();

    const colRef = collection(db, 'leaderboards');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const fetched: LeaderboardEntry[] = [];
      snap.forEach(d => {
        const data = d.data() as LeaderboardEntry;
        if (data && data.game && data.playerName) {
          fetched.push({ id: d.id, ...data });
        }
      });
      cachedGlobalEntries = fetched;
      lastFetchTimestamp = Date.now();

      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fetched));
      } catch (e) {
        console.warn('Failed to backup leaderboard to local storage', e);
      }
      return fetched;
    }
  } catch (e) {
    console.warn('Leaderboard prefetch warning:', e);
  }
  return cachedGlobalEntries;
}

/**
 * Uploads legacy/local scores to Firestore once, so users don't lose past progress.
 */
async function syncLocalScoresToFirestore() {
  const syncFlagKey = 'cumeals_scores_synced_v1';
  if (localStorage.getItem(syncFlagKey)) return;

  try {
    let localEntries: LeaderboardEntry[] = [];
    const keys = ['mess_game_leaderboards_real_v3', 'mess_game_leaderboards_real_v4', 'mess_game_leaderboards_real_v5'];
    keys.forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localEntries = [...localEntries, ...parsed];
        }
      }
    });

    // Remove duplicates and mock data
    const validLocal = localEntries.filter(e => e && e.playerName && !e.id?.startsWith('mock'));
    if (validLocal.length === 0) {
      localStorage.setItem(syncFlagKey, 'true');
      return; 
    }

    // Try to upload. If permission fails, it throws and won't set the flag.
    let uploadSuccess = true;
    for (const entry of validLocal) {
      try {
        const { id, ...dataToUpload } = entry;
        await addDoc(collection(db, 'leaderboards'), dataToUpload);
      } catch (err) {
        console.warn('Sync failed (likely permissions), will retry later.');
        uploadSuccess = false;
        break; 
      }
    }

    if (uploadSuccess) {
      localStorage.setItem(syncFlagKey, 'true');
      console.log(`Successfully synced local scores to Firestore.`);
    }
  } catch (err) {
    console.warn('Failed to sync local scores:', err);
  }
}

/**
 * Core processing logic to filter, deduplicate strictly by player name, and sort scores.
 */
export function processLeaderboardEntries(
  allRaw: LeaderboardEntry[],
  game: 'memory' | 'mathRush' | 'colorConfusion',
  timeframe: 'weekly' | 'lifetime'
): LeaderboardEntry[] {
  const currentWeekKey = getISOWeekKey();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  // 1. Timeframe & Game filtering
  const timeframeFiltered = allRaw.filter(e => {
    if (e.game !== game) return false;
    if (timeframe === 'lifetime') return true;

    if (e.weekKey && e.weekKey === currentWeekKey) return true;
    if (e.createdAt) {
      const createdTime = new Date(e.createdAt).getTime();
      if (!isNaN(createdTime)) {
        return createdTime >= sevenDaysAgo;
      }
    }
    return true;
  });

  // 2. Strict Deduplication by Name (so the same person isn't listed twice)
  const playerBestMap = new Map<string, LeaderboardEntry>();

  timeframeFiltered.forEach(entry => {
    const nameKey = (entry.playerName || 'Student').trim().toLowerCase();
    const existing = playerBestMap.get(nameKey);

    if (!existing) {
      playerBestMap.set(nameKey, entry);
    } else {
      if (game === 'mathRush' || game === 'colorConfusion') {
        if (entry.score > existing.score) {
          playerBestMap.set(nameKey, entry);
        }
      } else {
        const entryMoves = entry.moves || entry.score;
        const existingMoves = existing.moves || existing.score;
        if (entryMoves < existingMoves) {
          playerBestMap.set(nameKey, entry);
        }
      }
    }
  });

  const uniqueLeaders = Array.from(playerBestMap.values());

  // 3. Sort leaders globally
  uniqueLeaders.sort((a, b) => {
    if (game === 'memory') {
      const movesA = a.moves || a.score;
      const movesB = b.moves || b.score;
      return movesA - movesB;
    }
    return b.score - a.score;
  });

  return uniqueLeaders.slice(0, 10);
}

/**
 * Real-time listener for the leaderboard. Automatically updates the UI when ANY user plays!
 */
export function subscribeToLeaderboard(
  game: 'memory' | 'mathRush' | 'colorConfusion',
  timeframe: 'weekly' | 'lifetime',
  onUpdate: (entries: LeaderboardEntry[]) => void
): () => void {
  try {
    const q = query(collection(db, 'leaderboards'), where('game', '==', game));
    
    return onSnapshot(q, (snap) => {
      const firestoreEntries: LeaderboardEntry[] = [];
      snap.forEach(doc => {
        firestoreEntries.push({ id: doc.id, ...doc.data() } as LeaderboardEntry);
      });
      
      // Update global cache
      cachedGlobalEntries = [...cachedGlobalEntries.filter(e => e.game !== game), ...firestoreEntries];
      lastFetchTimestamp = Date.now();

      // Mix with any local un-synced entries to be safe
      let localEntries: LeaderboardEntry[] = [];
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) localEntries = JSON.parse(raw);
      } catch (e) {}

      const combined = [...firestoreEntries, ...localEntries];
      const processed = processLeaderboardEntries(combined, game, timeframe);
      onUpdate(processed);
    }, (error) => {
      console.warn("Real-time leaderboard subscribe error (permissions issue?), falling back to local:", error);
      // Fallback
      let localEntries: LeaderboardEntry[] = [];
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) localEntries = JSON.parse(raw);
      } catch (e) {}
      onUpdate(processLeaderboardEntries([...cachedGlobalEntries, ...localEntries], game, timeframe));
    });
  } catch (error) {
    console.warn("Query error:", error);
    return () => {};
  }
}

/**
 * Gets top 10 global leaderboard scores for a game and timeframe. (Legacy fallback)
 */
export async function getGameLeaderboard(
  game: 'memory' | 'mathRush' | 'colorConfusion',
  timeframe: 'weekly' | 'lifetime' = 'lifetime'
): Promise<LeaderboardEntry[]> {
  if (Date.now() - lastFetchTimestamp > 5000 || cachedGlobalEntries.length === 0) {
    await prefetchLeaderboard();
  }

  let localEntries: LeaderboardEntry[] = [];
  try {
    const keys = ['mess_game_leaderboards_real_v3', 'mess_game_leaderboards_real_v4', 'mess_game_leaderboards_real_v5'];
    keys.forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localEntries = [...localEntries, ...parsed];
        }
      }
    });
  } catch (e) {
    console.warn('Local storage parse error', e);
  }

  const combined = [...cachedGlobalEntries, ...localEntries];
  return processLeaderboardEntries(combined, game, timeframe);
}

/**
 * Saves a new game score globally if it replaces or surpasses the player's personal best score.
 */
export async function saveGameScore(entry: Omit<LeaderboardEntry, 'id'>): Promise<boolean> {
  const now = new Date();
  const weekKey = getISOWeekKey(now);
  const formattedDate = `${now.getDate()} ${now.toLocaleString('en-US', { month: 'short' })}`;
  const currentUserId = entry.userId || getDeviceId();

  // Find existing best score for this user
  const currentLeaderboard = await getGameLeaderboard(entry.game, 'lifetime');
  const existingBest = currentLeaderboard.find(e => {
    if (entry.userEmail && e.userEmail) {
      return e.userEmail.toLowerCase() === entry.userEmail.toLowerCase();
    }
    if (e.userId && currentUserId) {
      return e.userId === currentUserId;
    }
    return (e.playerName || '').trim().toLowerCase() === (entry.playerName || '').trim().toLowerCase();
  });

  let isNewBest = false;
  if (!existingBest) {
    isNewBest = true;
  } else if (entry.game === 'mathRush' || entry.game === 'colorConfusion') {
    if (entry.score > existingBest.score) {
      isNewBest = true;
    }
  } else if (entry.game === 'memory') {
    const newMoves = entry.moves || entry.score;
    const existingMoves = existingBest.moves || existingBest.score;
    if (newMoves < existingMoves) {
      isNewBest = true;
    }
  }

  if (!isNewBest) {
    console.log('Score did not beat player previous record. Skipping submission.');
    return false;
  }

  const newEntry: LeaderboardEntry = {
    ...entry,
    userId: currentUserId,
    id: `score_${now.getTime()}_${Math.random().toString(36).substr(2, 5)}`,
    createdAt: now.toISOString(),
    weekKey,
    date: entry.date || formattedDate
  };

  cachedGlobalEntries.unshift(newEntry);
  lastFetchTimestamp = Date.now();

  // Save to local storage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const list: LeaderboardEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift(newEntry);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Local storage save warning:', e);
  }

  // Push to Firestore globally
  try {
    await addDoc(collection(db, 'leaderboards'), {
      ...newEntry
    });
    console.log('Global score saved successfully to Firestore!');
  } catch (e) {
    console.warn('Firestore addDoc warning:', e);
  }

  return true;
}
