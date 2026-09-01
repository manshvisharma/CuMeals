import { db } from '../firebase/config';
import { doc, setDoc, getDoc, collection, onSnapshot, query, where, deleteDoc, updateDoc, serverTimestamp, getDocs, orderBy, limit } from 'firebase/firestore';

export interface PlayerPresence {
  uid: string;
  playerName: string;
  status: 'available' | 'in_game' | 'offline';
  lastSeen: any;
}

export interface GameChallenge {
  id: string;
  challengerId: string;
  challengerName: string;
  challengedId: string;
  challengedName: string;
  gameType: string;
  status: 'pending' | 'accepted' | 'declined';
  sessionId?: string;
  createdAt: any;
}

export interface GameSession {
  id: string;
  gameType: string;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  status: 'starting' | 'playing' | 'finished';
  winnerId?: string | 'draw';
  player1Score?: number;
  player2Score?: number;
  gameState?: any;
  createdAt: any;
}

// Presence
export const setPresence = async (uid: string, playerName: string, status: 'available' | 'in_game' | 'offline') => {
  try {
    const ref = doc(db, 'presence', uid);
    await setDoc(ref, {
      uid,
      playerName,
      status,
      lastSeen: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.error("Presence error", e);
  }
};

export const subscribeToPresence = (onUpdate: (players: PlayerPresence[]) => void) => {
  const q = query(collection(db, 'presence'), where('status', 'in', ['available', 'in_game']));
  return onSnapshot(q, (snap) => {
    const players: PlayerPresence[] = [];
    snap.forEach(d => players.push(d.data() as PlayerPresence));
    // Filter out old presence (e.g. older than 2 minutes) if serverTimestamp doesn't exist yet, just keep it simple
    onUpdate(players);
  });
};

// Challenges
export const sendChallenge = async (challengerId: string, challengerName: string, challengedId: string, challengedName: string, gameType: string) => {
  const challengeId = `${challengerId}_${challengedId}`;
  const ref = doc(db, 'challenges', challengeId);
  await setDoc(ref, {
    id: challengeId,
    challengerId,
    challengerName,
    challengedId,
    challengedName,
    gameType,
    status: 'pending',
    createdAt: serverTimestamp()
  });
};

export const updateChallengeStatus = async (challengeId: string, status: 'accepted' | 'declined', sessionId?: string) => {
  const ref = doc(db, 'challenges', challengeId);
  const data: any = { status };
  if (sessionId) data.sessionId = sessionId;
  await updateDoc(ref, data);
};

export const subscribeToChallenges = (uid: string, onUpdate: (challenges: GameChallenge[]) => void) => {
  // Listen for incoming and outgoing
  const incomingQ = query(collection(db, 'challenges'), where('challengedId', '==', uid));
  const outgoingQ = query(collection(db, 'challenges'), where('challengerId', '==', uid));
  
  let allIncoming: GameChallenge[] = [];
  let allOutgoing: GameChallenge[] = [];
  
  const notify = () => {
    onUpdate([...allIncoming, ...allOutgoing]);
  };

  const unsubIncoming = onSnapshot(incomingQ, (snap) => {
    allIncoming = [];
    snap.forEach(d => allIncoming.push(d.data() as GameChallenge));
    notify();
  });
  
  const unsubOutgoing = onSnapshot(outgoingQ, (snap) => {
    allOutgoing = [];
    snap.forEach(d => allOutgoing.push(d.data() as GameChallenge));
    notify();
  });
  
  return () => {
    unsubIncoming();
    unsubOutgoing();
  };
};

// Game Session
export const createGameSession = async (player1Id: string, player1Name: string, player2Id: string, player2Name: string, gameType: string) => {
  const sessionId = `session_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  const ref = doc(db, 'game_sessions', sessionId);
  await setDoc(ref, {
    id: sessionId,
    gameType,
    player1Id,
    player1Name,
    player2Id,
    player2Name,
    status: 'starting',
    createdAt: serverTimestamp(),
    gameState: {}
  });
  return sessionId;
};

export const subscribeToGameSession = (sessionId: string, onUpdate: (session: GameSession | null) => void) => {
  const ref = doc(db, 'game_sessions', sessionId);
  return onSnapshot(ref, (doc) => {
    if (doc.exists()) {
      onUpdate(doc.data() as GameSession);
    } else {
      onUpdate(null);
    }
  });
};

export const updateGameState = async (sessionId: string, updates: Partial<GameSession>) => {
  const ref = doc(db, 'game_sessions', sessionId);
  await updateDoc(ref, updates);
};

