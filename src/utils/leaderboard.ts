import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { LeaderboardEntry } from '../types';

const LOCAL_STORAGE_KEY = 'mess_game_leaderboards_real';

export async function saveGameScore(entry: Omit<LeaderboardEntry, 'id'>): Promise<void> {
  const newEntry: LeaderboardEntry = {
    ...entry,
    id: `score_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
  };

  // 1. Save to LocalStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const list: LeaderboardEntry[] = raw ? JSON.parse(raw) : [];
    list.push(newEntry);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Local storage save failed', e);
  }

  // 2. Save to Firestore
  try {
    await addDoc(collection(db, 'leaderboards'), {
      ...entry,
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn('Firestore leaderboard write failed (using local storage)', e);
  }
}

export async function getGameLeaderboard(game: 'memory' | 'mathRush'): Promise<LeaderboardEntry[]> {
  let entries: LeaderboardEntry[] = [];

  // Try Firestore
  try {
    const q = query(
      collection(db, 'leaderboards'),
      orderBy('score', game === 'memory' ? 'asc' : 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      entries = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as LeaderboardEntry))
        .filter(e => e.game === game);
    }
  } catch (e) {
    // Firestore might not be populated or offline
  }

  // Merge with local storage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localList: LeaderboardEntry[] = raw ? JSON.parse(raw) : [];
    const gameLocal = localList.filter(e => e.game === game);
    
    // Combine and deduplicate
    const combined = [...entries, ...gameLocal];
    const unique = Array.from(new Map(combined.map(item => [item.playerName + (item.score || 0), item])).values());

    // Sort: Memory is least moves first (asc), MathRush is highest score first (desc)
    unique.sort((a, b) => {
      if (game === 'memory') {
        return (a.moves || a.score) - (b.moves || b.score);
      }
      return b.score - a.score;
    });

    return unique.slice(0, 15);
  } catch (e) {
    return [];
  }
}
