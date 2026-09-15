import React, { useState, useEffect } from 'react';
import { Trophy, ArrowLeft, BrainCircuit } from 'lucide-react';
import { GameSession, updateGameState, subscribeToGameSession, setPresence } from '../../utils/multiplayer';
import { User } from 'firebase/auth';

interface MemoryBattleProps {
  currentUser: User | null;
  sessionId: string;
  opponentName: string;
  isPlayer1: boolean;
  onLeave: () => void;
}

const EMOJIS = ['🚀', '🎸', '🍔', '🎨', '🏀', '🎮', '🧩', '⚡'];

export const MemoryBattle: React.FC<MemoryBattleProps> = ({ currentUser, sessionId, opponentName, isPlayer1, onLeave }) => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [cards, setCards] = useState<{emoji: string, id: number}[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);

  const uid = currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    setPresence(uid, currentUser?.displayName || 'Player', 'in_game');
    
    if (isPlayer1) {
      const deck = [...EMOJIS, ...EMOJIS].sort(() => 0.5 - Math.random()).map((emoji, id) => ({ emoji, id }));
      updateGameState(sessionId, {
        status: 'playing',
        gameState: {
          deck,
          player1Score: 0,
          player2Score: 0,
          endTime: Date.now() + 60000
        }
      });
    }

    const unsub = subscribeToGameSession(sessionId, (s) => {
      setSession(s);
      if (s?.gameState?.deck && cards.length === 0) {
        setCards(s.gameState.deck);
      }
    });

    return () => {
      unsub();
      setPresence(uid, currentUser?.displayName || 'Player', 'available');
    };
  }, [uid, sessionId, isPlayer1]);

  useEffect(() => {
    if (session?.status !== 'playing' || !session.gameState?.endTime) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((session.gameState.endTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0 && isPlayer1 && session.status === 'playing') {
        const p1Score = session.gameState.player1Score || 0;
        const p2Score = session.gameState.player2Score || 0;
        let winnerId = 'draw';
        if (p1Score > p2Score) winnerId = session.player1Id;
        else if (p2Score > p1Score) winnerId = session.player2Id;

        updateGameState(sessionId, {
          status: 'finished',
          winnerId,
          player1Score: p1Score,
          player2Score: p2Score
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [session, isPlayer1, sessionId]);

  const handleCardClick = (index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      if (cards[first].emoji === cards[second].emoji) {
        setMatched([...matched, first, second]);
        
        // Update score
        const scoreKey = isPlayer1 ? 'player1Score' : 'player2Score';
        const newScore = (session?.gameState?.[scoreKey] || 0) + 10;
        
        if (newScore === (cards.length / 2) * 10) {
          updateGameState(sessionId, {
            status: 'finished',
            winnerId: currentUser?.uid,
            gameState: {
              ...session?.gameState,
              [scoreKey]: newScore
            }
          });
        } else {
          updateGameState(sessionId, {
            gameState: {
              ...session?.gameState,
              [scoreKey]: newScore
            }
          });
        }
        
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  if (!session) return <div className="text-center p-8">Loading match...</div>;

  const state = session.gameState || {};
  const myScore = isPlayer1 ? (state.player1Score || 0) : (state.player2Score || 0);
  const oppScore = isPlayer1 ? (state.player2Score || 0) : (state.player1Score || 0);

  return (
    <div className="w-full bg-white dark:bg-[#131722] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onLeave} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
          <BrainCircuit size={24} className="text-indigo-500" /> Memory Battle
        </div>
        <div className="w-10" />
      </div>

      {session.status === 'finished' ? (
        <div className="text-center py-8">
          <Trophy size={64} className={`mx-auto mb-4 ${session.winnerId === currentUser?.uid ? 'text-amber-500' : session.winnerId === 'draw' ? 'text-slate-400' : 'text-rose-500'}`} />
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
            {session.winnerId === currentUser?.uid ? 'You Won!' : session.winnerId === 'draw' ? "It's a Draw!" : 'You Lost!'}
          </h2>
          <div className="flex justify-center items-center gap-8 my-6">
            <div className="text-center">
              <div className="text-sm font-bold text-slate-500 mb-1">You</div>
              <div className="text-3xl font-black text-indigo-600">{myScore}</div>
            </div>
            <div className="text-slate-300 font-bold text-2xl">vs</div>
            <div className="text-center">
              <div className="text-sm font-bold text-slate-500 mb-1">{opponentName}</div>
              <div className="text-3xl font-black text-rose-500">{oppScore}</div>
            </div>
          </div>
          <button onClick={onLeave} className="mt-4 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold shadow-sm hover:scale-105 transition-all">
            Back to Lobby
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-8 px-4">
            <div className="text-center">
              <div className="text-xs font-bold text-slate-400 mb-1">YOU</div>
              <div className="text-2xl font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-2xl">{myScore}</div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Time Left</div>
              <div className={`text-3xl font-black ${timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-slate-800 dark:text-slate-200'}`}>
                {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2, '0')}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-xs font-bold text-slate-400 mb-1 uppercase truncate max-w-[80px]">{opponentName}</div>
              <div className="text-2xl font-black text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-4 py-2 rounded-2xl">{oppScore}</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 md:gap-4 max-w-sm mx-auto">
            {cards.map((card, index) => {
              const isFlipped = flipped.includes(index) || matched.includes(index);
              return (
                <button
                  key={index}
                  onClick={() => handleCardClick(index)}
                  className={`aspect-square text-3xl flex items-center justify-center rounded-2xl transition-all duration-300 transform ${
                    isFlipped 
                      ? 'bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900 rotate-y-180' 
                      : 'bg-indigo-500 hover:bg-indigo-600 shadow-[0_4px_0_rgb(67,56,202)] active:translate-y-1 active:shadow-none'
                  }`}
                >
                  <span className={`transition-opacity duration-300 ${isFlipped ? 'opacity-100' : 'opacity-0'}`}>
                    {card.emoji}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
