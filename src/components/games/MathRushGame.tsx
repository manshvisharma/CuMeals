import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Flame, Zap, Heart, Trophy, RefreshCw, AlertCircle } from 'lucide-react';
import { saveGameScore } from '../../utils/leaderboard';

interface MathQuestion {
  expression: string;
  correctAnswer: number;
  options: number[];
}

interface MathRushGameProps {
  playerName: string;
  userEmail?: string;
  onBack: () => void;
}

export const MathRushGame: React.FC<MathRushGameProps> = ({ playerName, userEmail, onBack }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(4.0);
  const [maxTime, setMaxTime] = useState<number>(4.0);
  const [currentQuestion, setCurrentQuestion] = useState<MathQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [bestScore, setBestScore] = useState<number>(() => {
    const saved = localStorage.getItem('math_rush_best');
    return saved ? parseInt(saved, 10) : 0;
  });

  const timerRef = useRef<any>(null);

  // Generate question based on level
  const generateQuestion = (currentLevel: number): MathQuestion => {
    let expr = '';
    let answer = 0;

    if (currentLevel <= 2) {
      // Simple addition / subtraction (2 numbers)
      const isAdd = Math.random() > 0.5;
      const a = Math.floor(Math.random() * 15) + 2;
      const b = Math.floor(Math.random() * 12) + 1;
      if (isAdd) {
        expr = `${a} + ${b}`;
        answer = a + b;
      } else {
        const big = Math.max(a, b);
        const small = Math.min(a, b);
        expr = `${big} - ${small}`;
        answer = big - small;
      }
    } else if (currentLevel <= 4) {
      // 3 numbers with + and - OR single multiplication
      const type = Math.floor(Math.random() * 3);
      if (type === 0) {
        // e.g. 7 + 8 - 4
        const a = Math.floor(Math.random() * 12) + 2;
        const b = Math.floor(Math.random() * 10) + 1;
        const c = Math.floor(Math.random() * (a + b - 1)) + 1;
        expr = `${a} + ${b} - ${c}`;
        answer = a + b - c;
      } else if (type === 1) {
        // e.g. 12 - 5 + 3
        const a = Math.floor(Math.random() * 15) + 6;
        const b = Math.floor(Math.random() * (a - 1)) + 1;
        const c = Math.floor(Math.random() * 10) + 1;
        expr = `${a} - ${b} + ${c}`;
        answer = a - b + c;
      } else {
        // e.g. 6 × 4
        const a = Math.floor(Math.random() * 9) + 2;
        const b = Math.floor(Math.random() * 8) + 2;
        expr = `${a} × ${b}`;
        answer = a * b;
      }
    } else {
      // Harder: division with addition/subtraction or 3-step arithmetic
      const type = Math.floor(Math.random() * 3);
      if (type === 0) {
        // e.g. 24 ÷ 6 + 7
        const b = Math.floor(Math.random() * 7) + 2; // divisor
        const quotient = Math.floor(Math.random() * 8) + 2;
        const a = b * quotient; // dividend
        const c = Math.floor(Math.random() * 12) + 1;
        expr = `${a} ÷ ${b} + ${c}`;
        answer = quotient + c;
      } else if (type === 1) {
        // e.g. 8 × 7 - 15
        const a = Math.floor(Math.random() * 8) + 3;
        const b = Math.floor(Math.random() * 8) + 2;
        const c = Math.floor(Math.random() * 15) + 2;
        expr = `${a} × ${b} - ${c}`;
        answer = a * b - c;
      } else {
        // e.g. 15 + 28 - 14
        const a = Math.floor(Math.random() * 30) + 10;
        const b = Math.floor(Math.random() * 30) + 10;
        const c = Math.floor(Math.random() * 20) + 5;
        expr = `${a} + ${b} - ${c}`;
        answer = a + b - c;
      }
    }

    // Generate 3 wrong distractors close to answer
    const optionsSet = new Set<number>([answer]);
    while (optionsSet.size < 4) {
      const delta = (Math.floor(Math.random() * 7) + 1) * (Math.random() > 0.5 ? 1 : -1);
      const wrong = answer + delta;
      if (wrong >= 0 && wrong !== answer) {
        optionsSet.add(wrong);
      }
    }

    const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);

    return {
      expression: expr,
      correctAnswer: answer,
      options
    };
  };

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);
    setStreak(0);
    setLevel(1);
    setCorrectCount(0);
    const initialTime = 4.5;
    setMaxTime(initialTime);
    setTimeLeft(initialTime);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    setCurrentQuestion(generateQuestion(1));
  };

  const nextQuestion = (newLevel: number, newScore: number, newStreak: number, newCorrect: number) => {
    // Dynamic timer based on level: minimum 2.2 seconds
    const timeForLevel = Math.max(2.2, 4.5 - (newLevel - 1) * 0.25);
    setMaxTime(timeForLevel);
    setTimeLeft(timeForLevel);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    setCurrentQuestion(generateQuestion(newLevel));
  };

  // Timer loop
  useEffect(() => {
    if (!isPlaying || gameOver || isAnswerCorrect !== null) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        return parseFloat((prev - 0.1).toFixed(1));
      });
    }, 100);

    return () => clearInterval(timerRef.current);
  }, [isPlaying, gameOver, isAnswerCorrect, currentQuestion]);

  const handleTimeOut = () => {
    handleWrongAnswer();
  };

  const handleAnswerClick = (chosen: number) => {
    if (selectedAnswer !== null || !currentQuestion || gameOver) return;

    clearInterval(timerRef.current);
    setSelectedAnswer(chosen);

    const isCorrect = chosen === currentQuestion.correctAnswer;
    setIsAnswerCorrect(isCorrect);

    if (isCorrect) {
      // Calculate points based on time left & streak
      const timeBonus = Math.round(timeLeft * 100);
      const streakBonus = streak * 50;
      const points = 200 + timeBonus + streakBonus;

      const newScore = score + points;
      const newStreak = streak + 1;
      const newCorrect = correctCount + 1;
      const newLevel = Math.floor(newCorrect / 4) + 1;

      setScore(newScore);
      setStreak(newStreak);
      setCorrectCount(newCorrect);
      setLevel(newLevel);

      // Best score check
      if (newScore > bestScore) {
        setBestScore(newScore);
        localStorage.setItem('math_rush_best', newScore.toString());
      }

      setTimeout(() => {
        nextQuestion(newLevel, newScore, newStreak, newCorrect);
      }, 400);
    } else {
      handleWrongAnswer();
    }
  };

  const handleWrongAnswer = () => {
    // Single mistake = instant Game Over
    setTimeout(() => {
      endGame();
    }, 600);
  };

  const endGame = async () => {
    setGameOver(true);
    setIsPlaying(false);
    clearInterval(timerRef.current);

    if (score > 0) {
      await saveGameScore({
        game: 'mathRush',
        playerName: playerName || 'Student',
        userEmail,
        score,
        level,
        date: new Date().toISOString().split('T')[0]
      });
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="p-2.5 rounded-2xl bg-[#131722] text-slate-200 border border-slate-800 shadow-sm active:scale-95 transition-all flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft size={16} />
          <span>Exit</span>
        </button>

        {isPlaying && (
          <div className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-extrabold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>1 Mistake = Game Over</span>
          </div>
        )}

        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 block">Best Score</span>
          <span className="text-xs font-extrabold text-amber-500">{bestScore.toLocaleString()}</span>
        </div>
      </div>

      {!isPlaying && !gameOver ? (
        /* Welcome / Start Screen */
        <div className="p-7 rounded-[32px] bg-[#131722] border border-slate-800 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-[24px] bg-gradient-to-tr from-amber-500 to-rose-500 text-white mx-auto flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Zap size={32} />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">
              Math Rush ⚡
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Solve rapid-fire mental arithmetic equations against the countdown clock!
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 text-xs text-left space-y-2 font-medium">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-amber-400 font-bold">⚡ Fast Math:</span> 4 choices per question.
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-rose-400 font-bold">💀 Sudden Death:</span> 1 wrong answer or timeout ends the game!
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-indigo-400 font-bold">🏆 Real Leaderboard:</span> Compete with fellow students for #1 rank.
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-extrabold text-sm shadow-xl shadow-amber-500/25 active:scale-95 transition-all"
          >
            Start Math Rush 🚀
          </button>
        </div>
      ) : gameOver ? (
        /* Game Over Screen */
        <div className="p-7 rounded-[32px] bg-[#131722] border border-slate-800 shadow-2xl text-center space-y-4 animate-scaleUp">
          <div className="w-16 h-16 rounded-[24px] bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
            <Trophy size={32} />
          </div>

          <h2 className="text-2xl font-black text-white">
            Game Over!
          </h2>

          <div className="grid grid-cols-3 gap-2.5 py-2">
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-750">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Final Score</span>
              <span className="text-base font-black text-indigo-400">
                {score.toLocaleString()}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-750">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Level</span>
              <span className="text-base font-black text-white">
                {level}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-750">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Correct</span>
              <span className="text-base font-black text-emerald-400">
                {correctCount}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Score saved to hostel leaderboard under <strong>{playerName || 'Student'}</strong>!
          </p>

          <div className="flex gap-2.5 pt-2">
            <button
              onClick={startGame}
              className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={15} />
              <span>Play Again</span>
            </button>

            <button
              onClick={onBack}
              className="px-5 py-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold active:scale-95 transition-all"
            >
              Leaderboard
            </button>
          </div>
        </div>
      ) : (
        /* Active Game Arena */
        <div className="space-y-4">
          {/* Status Bar */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-800 text-slate-200 border border-slate-700">
                Level {level}
              </span>
              {streak > 1 && (
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1 animate-bounce">
                  <Flame size={14} className="fill-amber-500" />
                  <span>{streak} Streak!</span>
                </span>
              )}
            </div>

            <div className="text-right">
              <span className="text-sm font-black text-indigo-400">
                {score.toLocaleString()} pts
              </span>
            </div>
          </div>

          {/* Time Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative">
            <div
              className={`h-full transition-all duration-100 ease-linear rounded-full ${
                timeLeft < 1.2 ? 'bg-rose-500 animate-pulse' : 'bg-gradient-to-r from-amber-500 to-indigo-500'
              }`}
              style={{ width: `${(timeLeft / maxTime) * 100}%` }}
            />
          </div>

          <div className="text-right text-[11px] font-bold text-slate-400 pr-1">
            {timeLeft.toFixed(1)}s remaining
          </div>

          {/* Question Equation Display */}
          <div className="p-8 rounded-[32px] bg-[#131722] border border-slate-800 shadow-none text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">
              Solve Calculation
            </span>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {currentQuestion?.expression} = ?
            </div>
          </div>

          {/* 4 Choices Grid (2x2) */}
          <div className="grid grid-cols-2 gap-3">
            {currentQuestion?.options.map((opt, idx) => {
              const isSelected = selectedAnswer === opt;
              const isCorrectAnswer = opt === currentQuestion.correctAnswer;
              
              let btnStyle = 'bg-[#131722] text-white hover:bg-slate-800 border border-slate-800';

              if (selectedAnswer !== null) {
                if (isCorrectAnswer) {
                  btnStyle = 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-102';
                } else if (isSelected && !isAnswerCorrect) {
                  btnStyle = 'bg-rose-500 text-white shadow-lg shadow-rose-500/30';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswerClick(opt)}
                  disabled={selectedAnswer !== null}
                  className={`
                    py-5 rounded-[24px] font-black text-xl sm:text-2xl transition-all duration-150 select-none active:scale-95
                    ${btnStyle}
                  `}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
