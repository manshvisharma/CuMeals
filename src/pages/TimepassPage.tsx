import React, { useState, useEffect } from 'react';
import { Gamepad2, Brain, Zap, Trophy, Medal, Sparkles, User as UserIcon } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { MemoryGame } from '../components/games/MemoryGame';
import { MathRushGame } from '../components/games/MathRushGame';
import { getGameLeaderboard } from '../utils/leaderboard';
import { LeaderboardEntry } from '../types';

interface TimepassPageProps {
  currentUser: FirebaseUser | null;
}

export const TimepassPage: React.FC<TimepassPageProps> = ({ currentUser }) => {
  const [activeGame, setActiveGame] = useState<'memory' | 'mathRush' | null>(null);
  const [leaderboardTab, setLeaderboardTab] = useState<'mathRush' | 'memory'>('mathRush');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false);

  const playerName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Hostel Student';

  const loadScores = async (tab: 'mathRush' | 'memory') => {
    setLoadingLeaderboard(true);
    const data = await getGameLeaderboard(tab);
    setLeaderboard(data);
    setLoadingLeaderboard(false);
  };

  useEffect(() => {
    if (!activeGame) {
      loadScores(leaderboardTab);
    }
  }, [leaderboardTab, activeGame]);

  if (activeGame === 'memory') {
    return (
      <div className="pb-28 pt-2">
        <MemoryGame
          playerName={playerName}
          userEmail={currentUser?.email || undefined}
          onBack={() => setActiveGame(null)}
        />
      </div>
    );
  }

  if (activeGame === 'mathRush') {
    return (
      <div className="pb-28 pt-2">
        <MathRushGame
          playerName={playerName}
          userEmail={currentUser?.email || undefined}
          onBack={() => setActiveGame(null)}
        />
      </div>
    );
  }

  return (
    <div className="pb-28 animate-fadeIn pt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Gamepad2 size={24} className="text-slate-900 dark:text-white" strokeWidth={2.6} />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Timepass Games
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Challenge your brain & compete on hostel rankboards
          </p>
        </div>

        {/* Player Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#131722] shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-slate-800">
          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
            {playerName[0]?.toUpperCase() || 'P'}
          </div>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 max-w-[80px] truncate">
            {playerName}
          </span>
        </div>
      </div>

      {/* Game Cards Hub */}
      <div className="space-y-3.5 mb-6">
        
        {/* Game 1: Math Rush */}
        <div
          onClick={() => setActiveGame('mathRush')}
          className="relative overflow-hidden p-5 rounded-[28px] bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent dark:from-amber-950/30 dark:via-rose-950/20 bg-white dark:bg-[#131722] border border-amber-200/50 dark:border-amber-900/40 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all cursor-pointer active:scale-[0.98] group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25 group-hover:scale-105 transition-transform">
                <Zap size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Math Rush
                  </h3>
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white uppercase tracking-wider">
                    HOT
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  Rapid-fire mental math against the clock
                </p>
              </div>
            </div>

            <button className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-amber-500 text-white text-xs font-bold shadow-sm group-hover:bg-amber-600 transition-colors">
              Play
            </button>
          </div>
        </div>

        {/* Game 2: Memory Game */}
        <div
          onClick={() => setActiveGame('memory')}
          className="relative overflow-hidden p-5 rounded-[28px] bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent dark:from-indigo-950/30 dark:via-purple-950/20 bg-white dark:bg-[#131722] border border-indigo-200/50 dark:border-indigo-900/40 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all cursor-pointer active:scale-[0.98] group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                <Brain size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Memory Match
                  </h3>
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500 text-white uppercase tracking-wider">
                    PUZZLE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  Match random number pairs in lowest moves
                </p>
              </div>
            </div>

            <button className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-bold shadow-sm group-hover:bg-indigo-700 transition-colors">
              Play
            </button>
          </div>
        </div>

      </div>

      {/* Rankboard / Leaderboard Section */}
      <div className="p-5 rounded-[32px] bg-white dark:bg-[#131722] shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-slate-800">
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-amber-500" />
            <h2 className="font-bold text-slate-900 dark:text-white text-base">
              Hostel Rankboard
            </h2>
          </div>

          {/* Leaderboard Game Switcher */}
          <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
            <button
              onClick={() => setLeaderboardTab('mathRush')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                leaderboardTab === 'mathRush'
                  ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Math Rush
            </button>
            <button
              onClick={() => setLeaderboardTab('memory')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                leaderboardTab === 'memory'
                  ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Memory
            </button>
          </div>
        </div>

        {/* Rankboard List */}
        {loadingLeaderboard ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 font-medium">
            No scores recorded yet. Be the first to play!
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((item, index) => {
              const rank = index + 1;
              const isCurrentUser = item.playerName === playerName;

              return (
                <div
                  key={item.id || index}
                  className={`
                    flex items-center justify-between p-3 rounded-2xl transition-all
                    ${isCurrentUser
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80'
                      : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs">
                      {rank === 1 ? (
                        <span className="text-amber-500 text-base">🥇</span>
                      ) : rank === 2 ? (
                        <span className="text-slate-400 text-base">🥈</span>
                      ) : rank === 3 ? (
                        <span className="text-amber-700 text-base">🥉</span>
                      ) : (
                        <span className="text-slate-400 font-bold">#{rank}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.playerName}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-indigo-600 text-white">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {item.date}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 dark:text-white block">
                      {leaderboardTab === 'mathRush'
                        ? `${item.score.toLocaleString()} pts`
                        : `${item.moves || item.score} moves`
                      }
                    </span>
                    {leaderboardTab === 'mathRush' && item.level && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                        Level {item.level}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
