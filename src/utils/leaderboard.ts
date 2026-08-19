import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { LeaderboardEntry } from '../types';

const LOCAL_STORAGE_KEY = 'mess_game_leaderboards_real_v3';

function getISOWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

export async function saveGameScore(entry: Omit<LeaderboardEntry, 'id'>): Promise<void> {
  const now = new Date();
  const weekKey = getISOWeekKey(now);
  const formattedDate = `${now.getDate()} ${now.toLocaleString('en-US', { month: 'short' })}`;

  const newEntry: LeaderboardEntry = {
    ...entry,
    id: `score_${now.getTime()}_${Math.random().toString(36).substr(2, 5)}`,
    createdAt: now.toISOString(),
    weekKey,
    date: entry.date || formattedDate
  };

  // 1. Save to LocalStorage instantly
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const list: LeaderboardEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift(newEntry);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Local storage save failed', e);
  }

  // 2. Sync to Firestore globally so all real players see each other
  try {
    await addDoc(collection(db, 'leaderboards'), {
      ...newEntry
    });
  } catch (e) {
    console.warn('Firestore write warning:', e);
  }
}

export async function getGameLeaderboard(
  game: 'memory' | 'mathRush',
  timeframe: 'weekly' | 'lifetime' = 'weekly'
): Promise<LeaderboardEntry[]> {
  let firestoreEntries: LeaderboardEntry[] = [];

  // 1. Fetch real scores from Firestore
  try {
    const colRef = collection(db, 'leaderboards');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      snap.forEach(d => {
        const data = d.data() as LeaderboardEntry;
        if (data.game === game && data.playerName) {
          firestoreEntries.push({ id: d.id, ...data });
        }
      });
    }
  } catch (e) {
    console.warn('Firestore leaderboard fetch warning:', e);
  }

  // 2. Fetch real scores from Local Storage
  let localEntries: LeaderboardEntry[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      localEntries = (JSON.parse(raw) as LeaderboardEntry[]).filter(
        e => e.game === game && e.playerName
      );
    }
  } catch (e) {
    console.warn(e);
  }

  // Combine ONLY real player entries (no fake/seeded users)
  const allRaw = [...localEntries, ...firestoreEntries];

  // Current week timestamp window (7 days)
  const currentWeekKey = getISOWeekKey();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  // Filter by timeframe
  const timeframeFiltered = allRaw.filter(e => {
    if (timeframe === 'lifetime') return true;
    
    // Weekly check
    if (e.weekKey === currentWeekKey) return true;
    if (e.createdAt) {
      const createdTime = new Date(e.createdAt).getTime();
      return !isNaN(createdTime) && createdTime >= sevenDaysAgo;
    }
    return false;
  });

  // Group by unique player name to pick each real player's single BEST score
  const playerBestMap = new Map<string, LeaderboardEntry>();

  timeframeFiltered.forEach(entry => {
    const key = entry.playerName.trim().toLowerCase();
    const existing = playerBestMap.get(key);

    if (!existing) {
      playerBestMap.set(key, entry);
    } else {
      if (game === 'mathRush') {
        // Higher score is better
        if (entry.score > existing.score) {
          playerBestMap.set(key, entry);
        }
      } else {
        // Fewer moves is better for memory
        const entryMoves = entry.moves || entry.score;
        const existingMoves = existing.moves || existing.score;
        if (entryMoves < existingMoves) {
          playerBestMap.set(key, entry);
        }
      }
    }
  });

  const uniqueLeaders = Array.from(playerBestMap.values());

  // Sort real players
  uniqueLeaders.sort((a, b) => {
    if (game === 'memory') {
      const movesA = a.moves || a.score;
      const movesB = b.moves || b.score;
      return movesA - movesB;
    }
    return b.score - a.score;
  });

  // Return strictly top 5 real users
  return uniqueLeaders.slice(0, 5);
}
