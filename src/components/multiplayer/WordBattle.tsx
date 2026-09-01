import React, { useState, useEffect } from 'react';
import { Trophy, Clock, X, Check, Type, ArrowLeft } from 'lucide-react';
import { GameSession, updateGameState, subscribeToGameSession, setPresence } from '../../utils/multiplayer';
import { User } from 'firebase/auth';

interface WordBattleProps {
  currentUser: User | null;
  sessionId: string;
  opponentName: string;
  isPlayer1: boolean;
  onLeave: () => void;
}

const WORDS = [
  'BATTLE', 'HOSTEL', 'COLLEGE', 'FRIEND', 'WINNER', 
  'GENIUS', 'STUDENT', 'LIBRARY', 'MESS', 'MIDNIGHT',
  'ALARM', 'EXAM', 'PROJECT', 'SUBMISSION', 'DEADLINE',
  'WEEKEND', 'VACATION', 'CANTEEN', 'COFFEE', 'LAPTOP'
];

export const WordBattle: React.FC<WordBattleProps> = ({ currentUser, sessionId, opponentName, isPlayer1, onLeave }) => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [input, setInput] = useState('');
  const [localScore, setLocalScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);

  const uid = currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    setPresence(uid, currentUser?.displayName || 'Player', 'in_game');
    
    // Init game state if player 1
    if (isPlayer1) {
      const words = [...WORDS].sort(() => 0.5 - Math.random()).slice(0, 20);
      updateGameState(sessionId, {
        status: 'playing',
        gameState: {
          currentWordIndex: 0,
          words,
          player1Score: 0,
          player2Score: 0,
          endTime: Date.now() + 60000
        }
      });
    }

    const unsub = subscribeToGameSession(sessionId, (s) => {
      setSession(s);
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
        // End game
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

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setInput(val);

    const state = session?.gameState;
    if (!state || session.status !== 'playing') return;

    const currentWord = state.words[state.currentWordIndex];
    if (val === currentWord) {
      // Score!
      setInput('');
      const scoreKey = isPlayer1 ? 'player1Score' : 'player2Score';
      const newScore = (state[scoreKey] || 0) + 10;
      
      const newIndex = state.currentWordIndex + 1;
      
      updateGameState(sessionId, {
        gameState: {
          ...state,
          [scoreKey]: newScore,
          currentWordIndex: newIndex < state.words.length ? newIndex : 0 // loop if needed
        }
      });
    }
  };

  if (!session) return <div className="text-center p-8">Loading match...</div>;

  const state = session.gameState || {};
  const currentWord = state.words ? state.words[state.currentWordIndex] : 'WAIT';
  
  const myScore = isPlayer1 ? (state.player1Score || 0) : (state.player2Score || 0);
  const oppScore = isPlayer1 ? (state.player2Score || 0) : (state.player1Score || 0);

  return (
    <div className="w-full bg-white dark:bg-[#131722] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onLeave} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
          <Type size={24} className="text-indigo-500" /> Word Battle
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

          <div className="text-center mb-8">
            <div className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-widest">Type this word</div>
            <div className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-widest">
              {currentWord}
            </div>
          </div>

          <div className="max-w-xs mx-auto">
            <input
              type="text"
              value={input}
              onChange={handleInput}
              autoFocus
              className="w-full text-center text-2xl font-bold p-4 bg-slate-50 dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl focus:outline-none focus:border-indigo-500 transition-colors uppercase"
              placeholder="TYPE HERE..."
            />
          </div>
        </>
      )}
    </div>
  );
};
