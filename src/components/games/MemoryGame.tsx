import React, { useState, useEffect } from 'react';
import { RefreshCw, Trophy, ArrowLeft, Zap, Sparkles, CheckCircle2 } from 'lucide-react';
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
  const [gridSize, setGridSize] = useState<4 | 6>(4); // 4x4 (8 pairs) or 6x6 (18 pairs)
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [gameWon, setGameWon] = useState<boolean>(false);
  const [bestScore, setBestScore] = useState<number | null>(() => {
    const saved = localStorage.getItem(`memory_best_${gridSize}`);
    return saved ? parseInt(saved, 10) : null;
  });

  const totalPairs = (gridSize * gridSize) / 2;

  // Initialize randomized game board
  const initGame = (size: 4 | 6 = gridSize) => {
    const pairsCount = (size * size) / 2;
    // Generate random numbers between 1 and 99
    const numbers: number[] = [];
    const used = new Set<number>();
    while (used.size < pairsCount) {
      const rand = Math.floor(Math.random() * 89) + 10;
      if (!used.has(rand)) {
        used.add(rand);
        numbers.push(rand);
      }
    }

    // Duplicate numbers to create pairs and shuffle completely
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

    const saved = localStorage.getItem(`memory_best_${size}`);
    setBestScore(saved ? parseInt(saved, 10) : null);
  };

  useEffect(() => {
    initGame(gridSize);
  }, [gridSize]);

  // Card click handler
  const handleCardClick = (index: number) => {
    if (isLocked) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;

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
        // Matched!
        setTimeout(() => {
          newCards[firstIdx].isMatched = true;
          newCards[secondIdx].isMatched = true;
          setCards([...newCards]);
          setFlippedIndices([]);
          setIsLocked(false);
          const nextPairs = matchedPairs + 1;
          setMatchedPairs(nextPairs);

          if (nextPairs === totalPairs) {
            handleVictory(moves + 1);
          }
        }, 500);
      } else {
        // Mismatch - flip back
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

  const handleVictory = async (finalMoves: number) => {
    setGameWon(true);
    // Update local best score
    const currentBest = bestScore;
    if (!currentBest || finalMoves < currentBest) {
      setBestScore(finalMoves);
      localStorage.setItem(`memory_best_${gridSize}`, finalMoves.toString());
    }

    // Save to Leaderboard
    await saveGameScore({
      game: 'memory',
      playerName: playerName || 'Student',
      userEmail,
      score: finalMoves,
      moves: finalMoves,
      date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="animate-fadeIn">
      {/* Top Controls */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="p-2.5 rounded-2xl bg-white dark:bg-[#131722] text-slate-700 dark:text-slate-200 shadow-sm active:scale-95 transition-all flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft size={16} />
          <span>Exit</span>
        </button>

        {/* Grid Size Switcher */}
        <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setGridSize(4)}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              gridSize === 4
                ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            4×4 (8 Pairs)
          </button>
          <button
            onClick={() => setGridSize(6)}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              gridSize === 6
                ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            6×6 (18 Pairs)
          </button>
        </div>

        <button
          onClick={() => initGame(gridSize)}
          className="p-2.5 rounded-2xl bg-white dark:bg-[#131722] text-slate-700 dark:text-slate-200 shadow-sm active:scale-95 transition-all"
          title="Restart Game"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats Header Box */}
      <div className="grid grid-cols-3 gap-2.5 mb-4 text-center">
        <div className="p-3 rounded-2xl bg-white dark:bg-[#131722] shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Moves</span>
          <span className="text-lg font-black text-slate-900 dark:text-white">{moves}</span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-[#131722] shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pairs</span>
          <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
            {matchedPairs} <span className="text-xs text-slate-400">/ {totalPairs}</span>
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-[#131722] shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Best Score</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            {bestScore ? `${bestScore}m` : '—'}
          </span>
        </div>
      </div>

      {/* Memory Board Grid */}
      <div
        className={`grid gap-2 mb-4 ${
          gridSize === 4 ? 'grid-cols-4' : 'grid-cols-6'
        }`}
      >
        {cards.map((card, index) => {
          const isRevealed = card.isFlipped || card.isMatched;

          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(index)}
              disabled={isRevealed || isLocked}
              className={`
                aspect-square rounded-2xl font-black text-base sm:text-lg flex items-center justify-center transition-all duration-300 select-none active:scale-95 shadow-sm
                ${card.isMatched
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-95 opacity-90'
                  : card.isFlipped
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-102'
                  : 'bg-white dark:bg-[#181d2a] text-transparent hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800'
                }
              `}
            >
              {isRevealed ? (
                <span className="animate-scaleUp">{card.value}</span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
              )}
            </button>
          );
        })}
      </div>

      {/* Victory Celebration Modal / Banner */}
      {gameWon && (
        <div className="p-6 rounded-[28px] bg-white dark:bg-[#131722] shadow-2xl text-center border border-indigo-100 dark:border-indigo-900/40 animate-scaleUp">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-3">
            <Trophy size={28} />
          </div>

          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Puzzle Solved! 🎉
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Completed in <strong className="text-indigo-600 dark:text-indigo-400">{moves} moves</strong>! Score posted to hostel rankboard.
          </p>

          <div className="flex gap-2.5 mt-5">
            <button
              onClick={() => initGame(gridSize)}
              className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 active:scale-95 transition-all"
            >
              Play Again
            </button>
            <button
              onClick={onBack}
              className="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold active:scale-95 transition-all"
            >
              Rankboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
