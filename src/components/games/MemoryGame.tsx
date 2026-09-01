import React, { useState, useEffect } from 'react';
import { RefreshCw, Trophy, ArrowLeft, Clock } from 'lucide-react';
import { saveGameScore } from '../../utils/leaderboard';

interface MemoryCard {
  id: number;
  value: number;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryGameProps {
  playerName: string;
  userEmail?: string;
  onBack: () => void;
}

export const MemoryGame: React.FC<MemoryGameProps> = ({ playerName, userEmail, onBack }) => {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [gameWon, setGameWon] = useState<boolean>(false);
  
  // Timer states
  const [timeTaken, setTimeTaken] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  const [bestScore, setBestScore] = useState<number | null>(() => {
    const saved = localStorage.getItem('memory_best_v3_moves');
    return saved ? parseInt(saved, 10) : null;
  });

  // 5x4 Grid = 20 cards (10 pairs)
  const COLS = 6;
  const ROWS = 6;
  const totalPairs = (COLS * ROWS) / 2;

  const initGame = () => {
    const pairsCount = totalPairs;

    const numbers: number[] = [];
    const used = new Set<number>();
    while (used.size < pairsCount) {
      const rand = Math.floor(Math.random() * 89) + 10;
      if (!used.has(rand)) {
        used.add(rand);
        numbers.push(rand);
      }
    }

    const deck = [...numbers, ...numbers].sort(() => Math.random() - 0.5);

    const newCards: MemoryCard[] = deck.map((value, idx) => ({
      id: idx,
      value,
      isFlipped: false,
      isMatched: false
    }));

    setCards(newCards);
    setFlippedIndices([]);
    setMoves(0);
    setMatchedPairs(0);
    setIsLocked(false);
    setGameWon(false);
    setTimeTaken(0);
    setIsTimerRunning(false);

    const saved = localStorage.getItem('memory_best_v3_moves');
    setBestScore(saved ? parseInt(saved, 10) : null);
  };

  useEffect(() => {
    initGame();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning && !gameWon) {
      interval = setInterval(() => {
        setTimeTaken(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, gameWon]);

  const handleCardClick = (index: number) => {
    if (isLocked) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;

    if (!isTimerRunning) {
      setIsTimerRunning(true);
    }

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      setIsLocked(true);

      const [firstIdx, secondIdx] = newFlipped;
      const firstCard = newCards[firstIdx];
      const secondCard = newCards[secondIdx];

      if (firstCard.value === secondCard.value) {
        setTimeout(() => {
          newCards[firstIdx].isMatched = true;
          newCards[secondIdx].isMatched = true;
          setCards([...newCards]);
          setFlippedIndices([]);
          setIsLocked(false);

          const nextPairs = matchedPairs + 1;
          setMatchedPairs(nextPairs);

          if (nextPairs === totalPairs) {
            handleVictory(moves + 1, timeTaken);
          }
        }, 500);
      } else {
        setTimeout(() => {
          newCards[firstIdx].isFlipped = false;
          newCards[secondIdx].isFlipped = false;
          setCards([...newCards]);
          setFlippedIndices([]);
          setIsLocked(false);
        }, 900);
      }
    }
  };

  const handleVictory = async (finalMoves: number, finalTime: number) => {
    setIsTimerRunning(false);
    setGameWon(true);

    const currentBestMoves = bestScore;
    
    // We update local best if moves is lower, OR if moves is equal but time is lower.
    let isLocalBest = false;
    if (!currentBestMoves) {
      isLocalBest = true;
    } else if (finalMoves < currentBestMoves) {
      isLocalBest = true;
    } else if (finalMoves === currentBestMoves) {
      const savedTime = localStorage.getItem('memory_best_v3_time');
      const currentBestTime = savedTime ? parseInt(savedTime, 10) : Infinity;
      if (finalTime < currentBestTime) {
        isLocalBest = true;
      }
    }

    if (isLocalBest) {
      setBestScore(finalMoves);
      localStorage.setItem('memory_best_v3_moves', finalMoves.toString());
      localStorage.setItem('memory_best_v3_time', finalTime.toString());
    }

    await saveGameScore({
      game: 'memory_v3',
      playerName: playerName || 'Student',
      userEmail,
      score: finalMoves, // Store moves in score
      moves: finalMoves,
      timeTaken: finalTime,
      date: new Date().toISOString().split('T')[0]
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="animate-fadeIn pb-8">
      {/* Top Controls */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="p-2.5 rounded-2xl bg-white dark:bg-[#131722] text-slate-700 dark:text-slate-200 shadow-sm active:scale-95 transition-all flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft size={16} />
          <span>Exit</span>
        </button>

        <div className="flex items-center gap-2">
           <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm">
             6×6 Board
           </span>
        </div>

        <button
          onClick={() => initGame()}
          className="p-2.5 rounded-2xl bg-white dark:bg-[#131722] text-slate-700 dark:text-slate-200 shadow-sm active:scale-95 transition-all"
          title="Restart Game"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats Header Box */}
      <div className="grid grid-cols-4 gap-2.5 mb-4 text-center">
        <div className="p-3 rounded-2xl bg-white dark:bg-[#131722] shadow-[0_4px_16px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-800">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Moves</span>
          <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{moves}</span>
        </div>
        <div className="p-3 rounded-2xl bg-white dark:bg-[#131722] shadow-[0_4px_16px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-800">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pairs</span>
          <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
            {matchedPairs} <span className="text-xs text-slate-400">/ {totalPairs}</span>
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-white dark:bg-[#131722] shadow-[0_4px_16px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 justify-center w-full">
            <Clock size={10} /> Time
          </span>
          <span className="text-base sm:text-lg font-black text-rose-500 dark:text-rose-400 mt-1">
            {formatTime(timeTaken)}
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-white dark:bg-[#131722] shadow-[0_4px_16px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-800">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Best</span>
          <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
            {bestScore ? `${bestScore}m` : '—'}
          </span>
        </div>
      </div>

      {/* Memory Board Grid (5 Cols x 4 Rows) */}
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2 mb-4 max-w-lg mx-auto">
        {cards.map((card, index) => {
          const isRevealed = card.isFlipped || card.isMatched;
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(index)}
              disabled={isRevealed || isLocked}
              className={`
                aspect-square rounded-md sm:rounded-2xl font-black text-sm sm:text-base md:text-lg flex items-center justify-center transition-all duration-300 select-none active:scale-95 shadow-sm
                ${card.isMatched
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-95 opacity-90'
                  : card.isFlipped
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                  : 'bg-white dark:bg-[#181d2a] text-transparent hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50'
                }
              `}
            >
              {isRevealed ? (
                <span className="animate-scaleUp">{card.value}</span>
              ) : (
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
              )}
            </button>
          );
        })}
      </div>

      {/* Victory Celebration Modal / Banner */}
      {gameWon && (
        <div className="p-6 rounded-[28px] bg-white dark:bg-[#131722] shadow-2xl text-center border border-indigo-100 dark:border-indigo-900/40 animate-scaleUp max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-3 shadow-inner">
            <Trophy size={28} />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Puzzle Solved! 🎉
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Completed in <strong className="text-indigo-600 dark:text-indigo-400">{moves} moves</strong> and <strong className="text-rose-500">{formatTime(timeTaken)}</strong>!
          </p>
          <div className="flex gap-2.5 mt-5">
            <button
              onClick={() => initGame()}
              className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 active:scale-95 transition-all"
            >
              Play Again
            </button>
            <button
              onClick={onBack}
              className="px-5 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold active:scale-95 transition-all"
            >
              Rankboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
