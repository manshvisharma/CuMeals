import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { subscribeToChallenges, setPresence, GameChallenge, updateChallengeStatus, createGameSession } from '../utils/multiplayer';
import { Swords, X, Check } from 'lucide-react';

interface GlobalMultiplayerProps {
  currentUser: User | null;
  onNavigateToGame: (gameType: string, sessionId: string, opponentName: string, isPlayer1: boolean) => void;
}

export const GlobalMultiplayer: React.FC<GlobalMultiplayerProps> = ({ currentUser, onNavigateToGame }) => {
  const [incomingChallenge, setIncomingChallenge] = useState<GameChallenge | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    
    const uid = currentUser.uid;
    const playerName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Hostel Student';

    // Set online presence every minute
    setPresence(uid, playerName, 'available');
    const heartbeat = setInterval(() => {
      setPresence(uid, playerName, 'available');
    }, 60000);

    // Listen for challenges globally
    const unsub = subscribeToChallenges(uid, (challenges) => {
      const now = Date.now();
      const recent = challenges.filter(c => (now - c.createdAt?.toMillis?.() || now) < 60000); // 1 min expiry
      
      const pendingIncoming = recent.find(c => c.challengedId === uid && c.status === 'pending');
      
      if (pendingIncoming && (!incomingChallenge || incomingChallenge.id !== pendingIncoming.id)) {
        setIncomingChallenge(pendingIncoming);
      } else if (!pendingIncoming && incomingChallenge) {
        setIncomingChallenge(null);
      }
    });

    return () => {
      clearInterval(heartbeat);
      unsub();
    };
  }, [currentUser?.uid]);

  const handleAccept = async () => {
    if (!incomingChallenge || !currentUser?.uid) return;
    const challenge = incomingChallenge;
    setIncomingChallenge(null);
    
    // Create game session
    const sessionId = await createGameSession(
      challenge.challengerId,
      challenge.challengerName,
      challenge.challengedId,
      challenge.challengedName,
      challenge.gameType
    );
    await updateChallengeStatus(challenge.id, 'accepted', sessionId);
    
    // Auto-navigate to Timepass page & start game
    // Emit global event so TimepassPage can open it
    window.dispatchEvent(new CustomEvent('join-multiplayer-game', {
      detail: { gameType: challenge.gameType, sessionId, opponentName: challenge.challengerName, isPlayer1: false }
    }));
    // Navigate to timepass tab
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'timepass' }));
  };

  const handleDecline = async () => {
    if (!incomingChallenge) return;
    await updateChallengeStatus(incomingChallenge.id, 'declined');
    setIncomingChallenge(null);
  };

  if (!incomingChallenge) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[9999] bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-2xl border border-indigo-500/30 flex items-center justify-between gap-4 animate-slideDown">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
          <Swords size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Game Challenge!</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-indigo-500">{incomingChallenge.challengerName}</span> wants to play <span className="capitalize">{incomingChallenge.gameType}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={handleDecline} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500">
          <X size={18} />
        </button>
        <button onClick={handleAccept} className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 shadow-md">
          <Check size={18} />
        </button>
      </div>
    </div>
  );
};
