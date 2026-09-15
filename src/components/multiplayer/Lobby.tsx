import React, { useState, useEffect } from 'react';
import { Users, Swords, Gamepad2, BrainCircuit, Type, Activity, UserPlus, Check, X, Skull } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { PlayerPresence, GameChallenge, setPresence, subscribeToPresence, subscribeToChallenges, sendChallenge, updateChallengeStatus, createGameSession } from '../../utils/multiplayer';

interface LobbyProps {
  currentUser: FirebaseUser | null;
  playerName: string;
  onJoinGame: (gameType: string, sessionId: string, opponentName: string, isPlayer1: boolean) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ currentUser, playerName, onJoinGame }) => {
  const [players, setPlayers] = useState<PlayerPresence[]>([]);
  const [challenges, setChallenges] = useState<GameChallenge[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('snake');
  const joinedChallenges = React.useRef(new Set<string>());
  
  const uid = currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    
    // Set presence
    setPresence(uid, playerName, 'available');
    
    // Setup listeners
    const unsubPresence = subscribeToPresence((p) => {
      // Filter out self and old presences (older than 3 minutes)
      const now = Date.now();
      const active = p.filter(x => {
        if (x.uid === uid) return false;
        if (!x.lastSeen) return true;
        const seenTime = x.lastSeen.toMillis ? x.lastSeen.toMillis() : Date.now();
        return (now - seenTime) < 3 * 60 * 1000;
      });
      setPlayers(active);
    });

    const unsubChallenges = subscribeToChallenges(uid, (c) => {
      // Clean up old challenges
      const recent = c.filter(x => {
        if (!x.createdAt) return true;
        const createdTime = x.createdAt.toMillis ? x.createdAt.toMillis() : Date.now();
        return (Date.now() - createdTime) < 2 * 60 * 1000; // 2 minutes expiry
      });
      setChallenges(recent);
      
      // Auto-join accepted challenges
      recent.forEach(ch => {
        if (ch.status === 'accepted' && ch.sessionId && !joinedChallenges.current.has(ch.id)) {
          joinedChallenges.current.add(ch.id);
          // If I was the challenger, I'm player 1
          if (ch.challengerId === uid) {
            onJoinGame(ch.gameType, ch.sessionId, ch.challengedName, true);
          } else if (ch.challengedId === uid) {
            // I was challenged, I'm player 2
            onJoinGame(ch.gameType, ch.sessionId, ch.challengerName, false);
          }
        }
      });
    });

    const heartbeat = setInterval(() => {
      setPresence(uid, playerName, 'available');
    }, 60000);

    return () => {
      unsubPresence();
      unsubChallenges();
      clearInterval(heartbeat);
    };
  }, [uid, playerName, onJoinGame]);

  const handleChallenge = async (opponentId: string, opponentName: string) => {
    if (!uid) return;
    await sendChallenge(uid, playerName, opponentId, opponentName, selectedGame);
  };

  const handleAccept = async (challenge: GameChallenge) => {
    if (!uid) return;
    // Create session
    const sessionId = await createGameSession(
      challenge.challengerId, challenge.challengerName,
      challenge.challengedId, challenge.challengedName,
      challenge.gameType
    );
    // Update challenge
    await updateChallengeStatus(challenge.id, 'accepted', sessionId);
  };

  const handleDecline = async (challenge: GameChallenge) => {
    await updateChallengeStatus(challenge.id, 'declined');
  };

  // Find active incoming and outgoing
  const incomingChallenges = challenges.filter(c => c.challengedId === uid && c.status === 'pending');
  const outgoingChallenges = challenges.filter(c => c.challengerId === uid && c.status === 'pending');

  if (!currentUser) {
    return (
      <div className="bg-amber-50 p-6 rounded-2xl text-amber-800 text-sm text-center">
        You must be logged in to play multiplayer games.
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Game Selector */}
      <div className="bg-white dark:bg-[#131722] rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Select Battle Mode</h4>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setSelectedGame('snake')}
            className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
              selectedGame === 'snake' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Skull size={20} />
            <span className="text-xs font-bold">Snake</span>
          </button>
          <button
            onClick={() => setSelectedGame('word')}
            className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
              selectedGame === 'word' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Type size={20} />
            <span className="text-xs font-bold">Word</span>
          </button>
          <button
            onClick={() => setSelectedGame('memory')}
            className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
              selectedGame === 'memory' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <BrainCircuit size={20} />
            <span className="text-xs font-bold">Memory</span>
          </button>
        </div>
      </div>

      {/* Incoming Challenges */}
      {incomingChallenges.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl p-4 border border-indigo-100 dark:border-indigo-800">
          <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Swords size={14} /> Challenge Received!
          </h4>
          <div className="space-y-2">
            {incomingChallenges.map(c => (
              <div key={c.id} className="bg-white dark:bg-slate-800 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{c.challengerName}</div>
                  <div className="text-xs text-slate-500">Wants to play {c.gameType}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAccept(c)} className="p-2 rounded-xl bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 active:scale-95">
                    <Check size={16} />
                  </button>
                  <button onClick={() => handleDecline(c)} className="p-2 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 hover:bg-rose-200 active:scale-95">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Outgoing Challenges */}
      {outgoingChallenges.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-3xl p-4 border border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity size={14} /> Waiting for opponent
          </h4>
          <div className="space-y-2">
            {outgoingChallenges.map(c => (
              <div key={c.id} className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Waiting for <strong>{c.challengedName}</strong>... ({c.status})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Online Players */}
      <div className="bg-white dark:bg-[#131722] rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Online Players</h4>
          <div className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {players.length} Active
          </div>
        </div>
        
        {players.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-400">
            No other players online right now.<br/>Invite some friends!
          </div>
        ) : (
          <div className="space-y-2">
            {players.map(p => (
              <div key={p.uid} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                      {p.playerName.charAt(0).toUpperCase()}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${p.status === 'in_game' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{p.playerName}</div>
                    <div className="text-[10px] text-slate-500 capitalize">{p.status === 'in_game' ? 'Playing a game' : 'Available'}</div>
                  </div>
                </div>
                
                {p.status === 'available' ? (
                  <button 
                    onClick={() => handleChallenge(p.uid, p.playerName)}
                    className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors active:scale-95"
                  >
                    Challenge
                  </button>
                ) : (
                  <div className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-500 text-xs font-bold rounded-xl cursor-not-allowed">
                    Busy
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
