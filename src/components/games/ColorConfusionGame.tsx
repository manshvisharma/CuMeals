import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Play, RotateCcw, BrainCircuit } from 'lucide-react';
import { saveGameScore } from '../../utils/leaderboard';

interface ColorConfusionGameProps {
  playerName: string;
  userEmail?: string;
  onBack: () => void;
}

const COLORS = [
  { name: 'RED', hex: '#ef4444', textClass: 'text-red-500', bgClass: 'bg-red-500', activeClass: 'active:bg-red-600' },
  { name: 'BLUE', hex: '#3b82f6', textClass: 'text-blue-500', bgClass: 'bg-blue-500', activeClass: 'active:bg-blue-600' },
  { name: 'GREEN', hex: '#22c55e', textClass: 'text-green-500', bgClass: 'bg-green-500', activeClass: 'active:bg-green-600' },
  { name: 'YELLOW', hex: '#eab308', textClass: 'text-yellow-500', bgClass: 'bg-yellow-500', activeClass: 'active:bg-yellow-600' },
  { name: 'PURPLE', hex: '#a855f7', textClass: 'text-purple-500', bgClass: 'bg-purple-500', activeClass: 'active:bg-purple-600' },
  { name: 'ORANGE', hex: '#f97316', textClass: 'text-orange-500', bgClass: 'bg-orange-500', activeClass: 'active:bg-orange-600' },
];

export const ColorConfusionGame: React.FC<ColorConfusionGameProps> = ({ playerName, userEmail, onBack }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(2000); // 2 seconds per round
  
  const [targetWord, setTargetWord] = useState(COLORS[0]);
  const [targetColor, setTargetColor] = useState(COLORS[1]);
  const [options, setOptions] = useState<typeof COLORS>([]);
  
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [savingScore, setSavingScore] = useState<boolean>(false);
  const [highScoreBeaten, setHighScoreBeaten] = useState<boolean>(false);

  // Timer reference
  const [lastTick, setLastTick] = useState<number>(Date.now());

  const generateRound = useCallback(() => {
    // Pick random text and color (usually different to create confusion)
    const randomWordIdx = Math.floor(Math.random() * COLORS.length);
    let randomColorIdx = Math.floor(Math.random() * COLORS.length);
    
    // 80% chance they are different
    if (Math.random() < 0.8 && randomColorIdx === randomWordIdx) {
      randomColorIdx = (randomColorIdx + 1) % COLORS.length;
    }
    
    const word = COLORS[randomWordIdx];
    const color = COLORS[randomColorIdx];
    
    setTargetWord(word);
    setTargetColor(color);
    
    // Generate 4 options including the correct one (which is targetColor.name)
    const selectedOptions = [color];
    const available = COLORS.filter(c => c.name !== color.name);
    
    // Shuffle available
    const shuffledAvailable = [...available].sort(() => Math.random() - 0.5);
    selectedOptions.push(...shuffledAvailable.slice(0, 3));
    
    // Shuffle final options
    setOptions(selectedOptions.sort(() => Math.random() - 0.5));
    
    setTimeLeft(2000); // Reset timer to 2 seconds
    setLastTick(Date.now());
  }, []);

  const startGame = () => {
    setScore(0);
    setGameOver(false);
    setHighScoreBeaten(false);
    setIsPlaying(true);
    generateRound();
  };

  const handleAnswer = (selectedName: string) => {
    if (!isPlaying || gameOver) return;
    
    // We match the visual color (targetColor), not the text
    if (selectedName === targetColor.name) {
      setScore(s => s + 1);
      generateRound();
    } else {
      endGame();
    }
  };

  const endGame = async () => {
    setIsPlaying(false);
    setGameOver(true);
    
    if (score > 0) {
      setSavingScore(true);
      try {
        const isNewBest = await saveGameScore({
          game: 'colorConfusion',
          playerName: playerName || 'Student',
          userEmail: userEmail,
          score: score,
          date: new Date().toISOString()
        });
        setHighScoreBeaten(isNewBest);
      } catch (err) {
        console.error("Failed to save score:", err);
      }
      setSavingScore(false);
    }
  };

  // Timer Loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTick;
      
      setTimeLeft(prev => {
        const newTime = prev - delta;
        if (newTime <= 0) {
          clearInterval(interval);
          endGame();
          return 0;
        }
        return newTime;
      });
      setLastTick(now);
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, gameOver, lastTick]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <BrainCircuit className="text-pink-500" size={24} />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Color Confusion</h2>
        </div>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      {/* Start Screen */}
      {!isPlaying && !gameOver ? (
        <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-[#131722] rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 w-full max-w-sm">
          <div className="w-20 h-20 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-6">
            <BrainCircuit size={40} className="text-pink-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Tap the COLOR, not the word!</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed">
            If you see the word <span className="font-bold text-red-500">BLUE</span>, tap the <strong>RED</strong> button.<br/>
            You only have <strong>2 seconds</strong> per round.
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-2 w-full py-4 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-lg justify-center transition-transform active:scale-95 shadow-[0_4px_14px_rgba(236,72,153,0.3)]"
          >
            <Play size={24} className="fill-current" />
            Play Now
          </button>
        </div>
      ) : gameOver ? (
        <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-[#131722] rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 w-full max-w-sm text-center">
          <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Game Over!</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Your brain got confused.</p>
          
          <div className="text-6xl font-black text-pink-500 mb-2">{score}</div>
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6">Score</div>
          
          {savingScore ? (
            <div className="text-xs text-slate-400 mb-6 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              Saving score...
            </div>
          ) : (
            <div className="mb-6 h-8 flex items-center justify-center">
              {highScoreBeaten ? (
                <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full">
                  🔥 New Personal Best!
                </span>
              ) : (
                <span className="text-xs text-slate-400">
                  {score > 0 ? "Score saved to leaderboard." : "Score too low to save."}
                </span>
              )}
            </div>
          )}
          
          <button
            onClick={startGame}
            className="flex items-center gap-2 w-full py-4 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-lg justify-center transition-transform active:scale-95 shadow-[0_4px_14px_rgba(236,72,153,0.3)]"
          >
            <RotateCcw size={20} />
            Play Again
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm flex flex-col items-center">
          {/* Game Stats & Timer */}
          <div className="w-full flex justify-between items-center mb-6">
            <div className="bg-white dark:bg-[#131722] px-4 py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Score</span>
              <span className="text-xl font-black text-slate-800 dark:text-slate-100">{score}</span>
            </div>
            
            {/* Timer Bar */}
            <div className="flex-1 ml-4 bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div 
                className="h-full bg-pink-500 rounded-full transition-all duration-75 ease-linear"
                style={{ width: `${(timeLeft / 2000) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* The Confusion Word */}
          <div className="w-full aspect-square max-h-[250px] bg-white dark:bg-[#131722] rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center mb-8 relative">
            <div className="absolute top-4 left-0 w-full text-center text-xs font-bold text-slate-400">WHAT COLOR IS THIS?</div>
            <span 
              className={`text-5xl md:text-6xl font-black tracking-tight ${targetColor.textClass}`}
              style={{ textShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
            >
              {targetWord.name}
            </span>
          </div>

          {/* Answer Options Grid */}
          <div className="w-full grid grid-cols-2 gap-3">
            {options.map((opt) => (
              <button
                key={opt.name}
                onClick={() => handleAnswer(opt.name)}
                className={`py-5 rounded-2xl font-bold text-lg text-white shadow-sm transition-transform active:scale-95 ${opt.bgClass} ${opt.activeClass}`}
              >
                {opt.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
