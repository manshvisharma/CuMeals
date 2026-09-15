import React, { useState, useEffect, useRef } from 'react';
import { Trophy, ArrowLeft, Skull, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { GameSession, updateGameState, subscribeToGameSession, setPresence } from '../../utils/multiplayer';
import { User } from 'firebase/auth';

interface SnakeBattleProps {
  currentUser: User | null;
  sessionId: string;
  opponentName: string;
  isPlayer1: boolean;
  onLeave: () => void;
}

const GRID_SIZE = 15;
const TICK_RATE = 300; // Slower for network tolerance

export const SnakeBattle: React.FC<SnakeBattleProps> = ({ currentUser, sessionId, opponentName, isPlayer1, onLeave }) => {
  const [session, setSession] = useState<GameSession | null>(null);
  const uid = currentUser?.uid;

  // Local React state for rendering
  const [p1Snake, setP1Snake] = useState([{x: 2, y: 2}]);
  const [p2Snake, setP2Snake] = useState([{x: 12, y: 12}]);
  const [food, setFood] = useState({x: 7, y: 7});
  
  // Mutable refs for the local game loop prediction
  const p1Dir = useRef({x: 1, y: 0});
  const p2Dir = useRef({x: -1, y: 0});
  const p1SnakeRef = useRef([{x: 2, y: 2}]);
  const p2SnakeRef = useRef([{x: 12, y: 12}]);
  const foodRef = useRef({x: 7, y: 7});
  const isDead = useRef(false);

  useEffect(() => {
    if (!uid) return;
    setPresence(uid, currentUser?.displayName || 'Player', 'in_game');
    
    if (isPlayer1) {
      updateGameState(sessionId, {
        status: 'playing',
        gameState: {
          p1Dir: {x: 1, y: 0},
          p2Dir: {x: -1, y: 0},
          food: {x: 7, y: 7},
          p1Dead: false,
          p2Dead: false,
          player1Score: 0,
          player2Score: 0
        }
      });
    }

    const unsub = subscribeToGameSession(sessionId, (s) => {
      setSession(s);
      
      if (s?.gameState) {
        // Sync opponent directions from network
        if (s.gameState.p1Dir && !isPlayer1) p1Dir.current = s.gameState.p1Dir;
        if (s.gameState.p2Dir && isPlayer1) p2Dir.current = s.gameState.p2Dir;
        
        if (s.gameState.food) {
          foodRef.current = s.gameState.food;
          setFood(s.gameState.food);
        }
        
        // Handle death
        if (s.gameState.p1Dead || s.gameState.p2Dead) {
          isDead.current = true;
          let winnerId = 'draw';
          if (s.gameState.p1Dead && !s.gameState.p2Dead) winnerId = s.player2Id;
          if (s.gameState.p2Dead && !s.gameState.p1Dead) winnerId = s.player1Id;
          
          if (isPlayer1 && s.status === 'playing') {
            updateGameState(sessionId, { status: 'finished', winnerId });
          }
        }
      }
    });

    return () => {
      unsub();
      setPresence(uid, currentUser?.displayName || 'Player', 'available');
    };
  }, [uid, sessionId, isPlayer1]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDead.current || session?.status !== 'playing') return;
      
      let newDir = null;
      const currentDir = isPlayer1 ? p1Dir.current : p2Dir.current;
      
      switch (e.key) {
        case 'ArrowUp': if (currentDir.y === 0) newDir = {x: 0, y: -1}; break;
        case 'ArrowDown': if (currentDir.y === 0) newDir = {x: 0, y: 1}; break;
        case 'ArrowLeft': if (currentDir.x === 0) newDir = {x: -1, y: 0}; break;
        case 'ArrowRight': if (currentDir.x === 0) newDir = {x: 1, y: 0}; break;
      }

      if (newDir) {
        const dirKey = isPlayer1 ? 'p1Dir' : 'p2Dir';
        // Local update
        if (isPlayer1) p1Dir.current = newDir; else p2Dir.current = newDir;
        
        // Remote update
        updateGameState(sessionId, {
          gameState: {
            ...session?.gameState,
            [dirKey]: newDir
          }
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlayer1, session]);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    
    let key = '';
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 20) {
        key = dx > 0 ? 'ArrowRight' : 'ArrowLeft';
      }
    } else {
      if (Math.abs(dy) > 20) {
        key = dy > 0 ? 'ArrowDown' : 'ArrowUp';
      }
    }
    
    if (key) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    }
    
    touchStartX.current = 0;
    touchStartY.current = 0;
  };

  // Game Loop
  useEffect(() => {
    if (session?.status !== 'playing') return;

    const gameLoop = setInterval(() => {
      if (isDead.current) return;

      const p1Head = { ...p1SnakeRef.current[0] };
      const p2Head = { ...p2SnakeRef.current[0] };

      p1Head.x += p1Dir.current.x;
      p1Head.y += p1Dir.current.y;
      
      p2Head.x += p2Dir.current.x;
      p2Head.y += p2Dir.current.y;

      let p1Died = false;
      let p2Died = false;

      // Wall collision
      if (p1Head.x < 0 || p1Head.x >= GRID_SIZE || p1Head.y < 0 || p1Head.y >= GRID_SIZE) p1Died = true;
      if (p2Head.x < 0 || p2Head.x >= GRID_SIZE || p2Head.y < 0 || p2Head.y >= GRID_SIZE) p2Died = true;

      // Head to Head collision
      if (p1Head.x === p2Head.x && p1Head.y === p2Head.y) {
        p1Died = true;
        p2Died = true;
      }

      // Self collision and opponent body collision
      const checkBodyCollision = (head: {x:number, y:number}, ownBody: any[], oppBody: any[]) => {
        if (ownBody.some(segment => segment.x === head.x && segment.y === head.y)) return true;
        if (oppBody.some(segment => segment.x === head.x && segment.y === head.y)) return true;
        return false;
      };

      if (!p1Died && checkBodyCollision(p1Head, p1SnakeRef.current, p2SnakeRef.current)) p1Died = true;
      if (!p2Died && checkBodyCollision(p2Head, p2SnakeRef.current, p1SnakeRef.current)) p2Died = true;

      if (p1Died || p2Died) {
        isDead.current = true;
        // The one who updates network death state first (usually player 1 to avoid race condition)
        if (isPlayer1) {
          updateGameState(sessionId, {
            gameState: {
              ...session?.gameState,
              p1Dead: p1Died,
              p2Dead: p2Died
            }
          });
        }
        return;
      }

      // Move P1
      const newP1 = [p1Head, ...p1SnakeRef.current];
      let p1ScoreAdd = 0;
      if (p1Head.x === foodRef.current.x && p1Head.y === foodRef.current.y) {
        p1ScoreAdd = 10;
      } else {
        newP1.pop();
      }

      // Move P2
      const newP2 = [p2Head, ...p2SnakeRef.current];
      let p2ScoreAdd = 0;
      if (p2Head.x === foodRef.current.x && p2Head.y === foodRef.current.y) {
        p2ScoreAdd = 10;
      } else {
        newP2.pop();
      }

      p1SnakeRef.current = newP1;
      p2SnakeRef.current = newP2;

      setP1Snake(newP1);
      setP2Snake(newP2);

      // Handle Food respawn by Player 1
      if (p1ScoreAdd > 0 || p2ScoreAdd > 0) {
        if (isPlayer1) {
          const nextFood = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
          };
          updateGameState(sessionId, {
            gameState: {
              ...session?.gameState,
              food: nextFood,
              player1Score: (session?.gameState?.player1Score || 0) + p1ScoreAdd,
              player2Score: (session?.gameState?.player2Score || 0) + p2ScoreAdd
            }
          });
        }
      }

    }, TICK_RATE);

    return () => clearInterval(gameLoop);
  }, [session, isPlayer1, sessionId]);

  if (!session) return <div className="text-center p-8">Loading match...</div>;

  const state = session.gameState || {};
  const myScore = isPlayer1 ? (state.player1Score || 0) : (state.player2Score || 0);
  const oppScore = isPlayer1 ? (state.player2Score || 0) : (state.player1Score || 0);
  
  // Assign colors
  const mySnake = isPlayer1 ? p1Snake : p2Snake;
  const oppSnake = isPlayer1 ? p2Snake : p1Snake;
  const myColor = 'bg-emerald-500';
  const oppColor = 'bg-rose-500';

  return (
    <div className="w-full bg-white dark:bg-[#131722] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onLeave} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
          <Skull size={24} className="text-indigo-500" /> Snake Battle
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
          <div className="flex justify-between items-center mb-6 px-4">
            <div className="text-center">
              <div className="text-xs font-bold text-emerald-500 mb-1 flex items-center gap-1 justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> YOU
              </div>
              <div className="text-xl font-black text-white bg-emerald-500 px-4 py-1.5 rounded-2xl shadow-sm">{myScore}</div>
            </div>
            
            <div className="text-center">
              <div className="text-xs font-bold text-rose-500 mb-1 flex items-center gap-1 justify-center uppercase truncate max-w-[80px]">
                THEM <div className="w-2 h-2 rounded-full bg-rose-500" />
              </div>
              <div className="text-xl font-black text-white bg-rose-500 px-4 py-1.5 rounded-2xl shadow-sm">{oppScore}</div>
            </div>
          </div>

          <div 
            className="w-full max-w-[300px] mx-auto aspect-square bg-slate-100 dark:bg-[#0f111a] rounded-xl relative overflow-hidden shadow-inner border-2 border-slate-200 dark:border-slate-800"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
              touchAction: 'none'
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Grid Cells */}
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
              <div key={i} className="border border-slate-800/50" />
            ))}

            {/* Food */}
            <div 
              className="absolute bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]"
              style={{
                width: `${100/GRID_SIZE}%`, height: `${100/GRID_SIZE}%`,
                left: `${food.x * (100/GRID_SIZE)}%`, top: `${food.y * (100/GRID_SIZE)}%`
              }}
            />

            {/* My Snake */}
            {mySnake.map((segment, idx) => (
              <div 
                key={`my-${idx}`}
                className={`absolute ${myColor} ${idx === 0 ? 'rounded-md z-10' : 'rounded-sm opacity-90'}`}
                style={{
                  width: `${100/GRID_SIZE}%`, height: `${100/GRID_SIZE}%`,
                  left: `${segment.x * (100/GRID_SIZE)}%`, top: `${segment.y * (100/GRID_SIZE)}%`,
                  transform: idx === 0 ? 'scale(1.1)' : 'scale(0.85)',
                  boxShadow: idx === 0 ? '0 0 10px rgba(16, 185, 129, 0.6)' : 'none'
                }}
              />
            ))}

            {/* Opponent Snake */}
            {oppSnake.map((segment, idx) => (
              <div 
                key={`opp-${idx}`}
                className={`absolute ${oppColor} ${idx === 0 ? 'rounded-md z-10' : 'rounded-sm opacity-90'}`}
                style={{
                  width: `${100/GRID_SIZE}%`, height: `${100/GRID_SIZE}%`,
                  left: `${segment.x * (100/GRID_SIZE)}%`, top: `${segment.y * (100/GRID_SIZE)}%`,
                  transform: idx === 0 ? 'scale(1.1)' : 'scale(0.85)',
                  boxShadow: idx === 0 ? '0 0 10px rgba(244, 63, 94, 0.6)' : 'none'
                }}
              />
            ))}
          </div>

          <div className="text-center mt-4 text-xs font-bold text-slate-400">
            Swipe on the board to move
          </div>

          {/* Mobile Controls (Since arrows won't work on mobile well) */}
          <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto mt-4">
            <div />
            <button 
              onClick={() => {
                const e = new KeyboardEvent('keydown', { key: 'ArrowUp' });
                window.dispatchEvent(e);
              }}
              className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-center active:scale-95 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
            ><ChevronUp size={24} strokeWidth={3} /></button>
            <div />
            <button 
              onClick={() => {
                const e = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
                window.dispatchEvent(e);
              }}
              className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-center active:scale-95 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
            ><ChevronLeft size={24} strokeWidth={3} /></button>
            <button 
              onClick={() => {
                const e = new KeyboardEvent('keydown', { key: 'ArrowDown' });
                window.dispatchEvent(e);
              }}
              className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-center active:scale-95 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
            ><ChevronDown size={24} strokeWidth={3} /></button>
            <button 
              onClick={() => {
                const e = new KeyboardEvent('keydown', { key: 'ArrowRight' });
                window.dispatchEvent(e);
              }}
              className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-center active:scale-95 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
            ><ChevronRight size={24} strokeWidth={3} /></button>
          </div>
        </>
      )}
    </div>
  );
};
