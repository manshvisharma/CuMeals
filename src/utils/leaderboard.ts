import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { LeaderboardEntry } from '../types';

const LOCAL_STORAGE_KEY = 'mess_game_leaderboards_v3';

// Initial seeded student entries for hostel atmosphere
const SEEDED_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  // Math Rush
  {
    id: 'seed_mr_1',
    game: 'mathRush',
    playerName: 'Aman K.',
    score: 4850,
    level: 9,
    date: '2026-08-19',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'seed_mr_2',
    game: 'mathRush',
    playerName: 'Priya Sharma',
    score: 4120,
    level: 8,
    date: '2026-08-18',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'seed_mr_3',
    game: 'mathRush',
    playerName: 'Rohan Verma',
    score: 3650,
    level: 7,
    date: '2026-08-19',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
  },
  {
    id: 'seed_mr_4',
    game: 'mathRush',
    playerName: 'Ananya Mehta',
    score: 2980,
    level: 6,
    date: '2026-08-15',
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString() // Lifetime only
  },
  {
    id: 'seed_mr_5',
    game: 'mathRush',
    playerName: 'Kabir Singh',
    score: 2400,
    level: 5,
    date: '2026-08-17',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },

  // Memory Match
  {
    id: 'seed_mem_1',
    game: 'memory',
    playerName: 'Monu Sharma',
    score: 12,
    moves: 12,
    date: '2026-08-19',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'seed_mem_2',
    game: 'memory',
    playerName: 'Sneha Patel',
    score: 14,
    moves: 14,
    date: '2026-08-18',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'seed_mem_3',
    game: 'memory',
    playerName: 'Devansh Roy',
    score: 16,
    moves: 16,
    date: '2026-08-17',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'seed_mem_4',
    game: 'memory',
    playerName: 'Vikram Joshi',
    score: 18,
    moves: 18,
    date: '2026-08-10',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() // Lifetime only
  },
  {
    id: 'seed_mem_5',
    game: 'memory',
    playerName: 'Pooja Nair',
    score: 20,
    moves: 20,
    date: '2026-08-19',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export async function saveGameScore(entry: Omit<LeaderboardEntry, 'id'>): Promise<void> {
  const timestamp = new Date().toISOString();
  const newEntry: LeaderboardEntry = {
    ...entry,
    id: `score_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    createdAt: timestamp
  };

  // 1. Save to LocalStorage immediately
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const list: LeaderboardEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift(newEntry);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Local storage save failed', e);
  }

  // 2. Save to Firestore so other hostel students see it in real-time
  try {
    const colRef = collection(db, 'leaderboards');
    await addDoc(colRef, {
      ...newEntry,
      createdAt: timestamp
    });
  } catch (e) {
    console.warn('Firestore leaderboard score sync error', e);
  }
}

export async function getGameLeaderboard(
  game: 'memory' | 'mathRush',
  timeframe: 'lifetime' | 'weekly' = 'weekly'
): Promise<LeaderboardEntry[]> {
  let firestoreEntries: LeaderboardEntry[] = [];

  // 1. Fetch from Firestore
  try {
    const colRef = collection(db, 'leaderboards');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      firestoreEntries = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          game: data.game || game,
          playerName: data.playerName || 'Student',
          userEmail: data.userEmail,
          score: Number(data.score) || 0,
          moves: data.moves ? Number(data.moves) : undefined,
          level: data.level ? Number(data.level) : undefined,
          date: data.date || 'Today',
          createdAt: data.createdAt || new Date().toISOString()
        } as LeaderboardEntry;
      });
    }
  } catch (e) {
    console.warn('Firestore leaderboard fetch fallback to local', e);
  }

  // 2. Fetch from LocalStorage
  let localEntries: LeaderboardEntry[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      localEntries = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Local storage read error', e);
  }

  // 3. Combine Firestore + Local + Seeded Entries
  const combined = [...firestoreEntries, ...localEntries, ...SEEDED_LEADERBOARD_ENTRIES];

  // 4. Filter by specific game
  const gameFiltered = combined.filter(e => e.game === game);

  // 5. Filter by timeframe ('weekly' = past 7 days, 'lifetime' = all time)
  const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const timeFiltered = gameFiltered.filter(e => {
    if (timeframe === 'lifetime') return true;
    if (!e.createdAt) return true;
    const entryTime = new Date(e.createdAt).getTime();
    return !isNaN(entryTime) ? entryTime >= sevenDaysAgoMs : true;
  });

  // 6. Deduplicate by Player Name: keep the best record per player
  const bestPerPlayer = new Map<string, LeaderboardEntry>();
  
  for (const entry of timeFiltered) {
    const key = (entry.playerName || 'Anonymous').trim().toLowerCase();
    const existing = bestPerPlayer.get(key);

    if (!existing) {
      bestPerPlayer.set(key, entry);
    } else {
      if (game === 'memory') {
        // Lower moves is better
        const currentMoves = entry.moves || entry.score || 999;
        const existingMoves = existing.moves || existing.score || 999;
        if (currentMoves < existingMoves) {
          bestPerPlayer.set(key, entry);
        }
      } else {
        // Higher score is better
        if (entry.score > existing.score) {
          bestPerPlayer.set(key, entry);
        }
      }
    }
  }

  const uniqueList = Array.from(bestPerPlayer.values());

  // 7. Sort rankings
  uniqueList.sort((a, b) => {
    if (game === 'memory') {
      const movesA = a.moves || a.score || 999;
      const movesB = b.moves || b.score || 999;
      return movesA - movesB;
    }
    return b.score - a.score;
  });

  return uniqueList.slice(0, 25);
}
