import React, { useState, useEffect } from 'react';
import { Gamepad2, Brain, Zap, Trophy, Flame, Calendar, Users, Timer, Clock } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { MemoryGame } from '../components/games/MemoryGame';
import { MathRushGame } from '../components/games/MathRushGame';
import { ColorConfusionGame } from '../components/games/ColorConfusionGame';
import { getGameLeaderboard, subscribeToLeaderboard } from '../utils/leaderboard';
import { LeaderboardEntry } from '../types';

interface TimepassPageProps {
  currentUser: FirebaseUser | null;
}

export const TimepassPage: React.FC<TimepassPageProps> = ({ currentUser }) => {
  const [activeGame, setActiveGame] = useState<'memory_v3' | 'mathRush' | 'colorConfusion_v2' | null>(null);
  const [leaderboardTab, setLeaderboardTab] = useState<'mathRush' | 'memory_v3' | 'colorConfusion_v2'>('mathRush');
  const [timeframe, setTimeframe] = useState<'weekly' | 'lifetime'>('lifetime');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false);
  const [weekEndString, setWeekEndString] = useState<string>('');

  const [customName, setCustomName] = useState<string>(() => {
    try {
      return localStorage.getItem('cumeals_custom_nickname') || '';
    } catch {
      return '';
    }
  });
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempNameInput, setTempNameInput] = useState<string>('');

  const playerName = currentUser?.displayName || currentUser?.email?.split('@')[0] || customName || 'Hostel Student';

  const saveNickname = () => {
    const val = tempNameInput.trim();
    if (val) {
      setCustomName(val);
      try {
        localStorage.setItem('cumeals_custom_nickname', val);
      } catch (e) {
        console.warn(e);
      }
    }
    setIsEditingName(false);
  };

  // Weekly countdown logic
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const day = now.getDay();
      const daysUntilSunday = day === 0 ? 0 : 7 - day;
      const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59, 999);
      const diff = endOfWeek.getTime() - now.getTime();
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      setWeekEndString(`${d}d ${h}h ${m}m`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  // Real-time live scores listener
  useEffect(() => {
    if (activeGame) return;
    setLoadingLeaderboard(true);
    
    const unsubscribe = subscribeToLeaderboard(leaderboardTab, timeframe, (entries) => {
      setLeaderboard(entries);
      setLoadingLeaderboard(false);
    });

    return () => unsubscribe();
  }, [leaderboardTab, timeframe, activeGame]);

  if (activeGame === 'memory_v3') {
    return (
      <div className="pb-32 pt-2">
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
      <div className="pb-32 pt-2">
        <MathRushGame
          playerName={playerName}
          userEmail={currentUser?.email || undefined}
          onBack={() => setActiveGame(null)}
        />
      </div>
    );
  }

  if (activeGame === 'colorConfusion_v2') {
    return (
      <div className="pb-32 pt-2">
        <ColorConfusionGame
          playerName={playerName}
          userEmail={currentUser?.email || undefined}
          onBack={() => setActiveGame(null)}
        />
      </div>
    );
  }

  return (
    <div className="pb-32 animate-fadeIn pt-2">
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
        {isEditingName ? (
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-white dark:bg-[#131722] border border-indigo-500">
            <input
              type="text"
              autoFocus
              placeholder="Your Name..."
              value={tempNameInput}
              onChange={(e) => setTempNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveNickname(); }}
              className="px-2.5 py-1 text-xs bg-transparent text-slate-800 dark:text-slate-100 outline-none w-24 font-bold"
            />
            <button
              onClick={saveNickname}
              className="px-2.5 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              if (!currentUser) {
                setTempNameInput(customName || '');
                setIsEditingName(true);
              }
            }}
            title={currentUser ? 'Logged in user' : 'Click to edit your player nickname'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#131722] shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-slate-800 active:scale-95 transition-all cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
              {playerName[0]?.toUpperCase() || 'P'}
            </div>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 max-w-[80px] truncate">
              {playerName}
            </span>
            {!currentUser && <span className="text-[9px] text-indigo-500 font-extrabold ml-0.5">Edit</span>}
          </button>
        )}
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

        {/* Game 2: Color Confusion */}
        <div
          onClick={() => setActiveGame('colorConfusion_v2')}
          className="relative overflow-hidden p-5 rounded-[28px] bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-transparent dark:from-pink-950/30 dark:via-rose-950/20 bg-white dark:bg-[#131722] border border-pink-200/50 dark:border-pink-900/40 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all cursor-pointer active:scale-[0.98] group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-pink-500/25 group-hover:scale-105 transition-transform">
                <Brain size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Color Confusion
                  </h3>
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-pink-500 text-white uppercase tracking-wider">
                    NEW
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  Tap the color, not the word! 2s per round.
                </p>
              </div>
            </div>

            <button className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-pink-600 text-white text-xs font-bold shadow-sm group-hover:bg-pink-700 transition-colors">
              Play
            </button>
          </div>
        </div>

        {/* Game 3: Memory Game */}
        <div
          onClick={() => setActiveGame('memory_v3')}
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
        
        {/* Header & Controls */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-amber-500" />
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Hostel Rankboard (Top 10)
              </h2>
            </div>

            {/* Sync Badge */}
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Synced</span>
            </div>
          </div>

          {/* Timeframe & Game Switcher Controls */}
          <div className="grid grid-cols-2 gap-2">
            {/* Lifetime vs Weekly Tab */}
            <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
              <button
                onClick={() => setTimeframe('lifetime')}
                className={`flex-1 py-1.5 rounded-xl transition-all text-center flex items-center justify-center gap-1 ${
                  timeframe === 'lifetime'
                    ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Flame size={12} />
                <span>Lifetime</span>
              </button>
              <button
                onClick={() => setTimeframe('weekly')}
                className={`flex-1 py-1.5 rounded-xl transition-all text-center flex items-center justify-center gap-1 ${
                  timeframe === 'weekly'
                    ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Calendar size={12} />
                <span>Weekly</span>
              </button>
            </div>

            {/* Game Selection Tab */}
            <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
              <button
                onClick={() => setLeaderboardTab('mathRush')}
                className={`flex-1 py-1.5 rounded-xl transition-all text-center ${
                  leaderboardTab === 'mathRush'
                    ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Math
              </button>
              <button
                onClick={() => setLeaderboardTab('colorConfusion_v2')}
                className={`flex-1 py-1.5 rounded-xl transition-all text-center ${
                  leaderboardTab === 'colorConfusion_v2'
                    ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Colors
              </button>
              <button
                onClick={() => setLeaderboardTab('memory_v3')}
                className={`flex-1 py-1.5 rounded-xl transition-all text-center ${
                  leaderboardTab === 'memory_v3'
                    ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Memory
              </button>
            </div>
          </div>
          
          {/* Weekly Countdown */}
          {timeframe === 'weekly' && (
            <div className="flex items-center justify-center gap-1.5 pt-1.5 pb-1 text-[11px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
              <Timer size={12} />
              <span>Week ends in {weekEndString}</span>
            </div>
          )}
        </div>

        {/* Rankboard List */}
        {loadingLeaderboard ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 font-medium">
            <Users size={24} className="mx-auto mb-2 text-slate-500 opacity-60" />
            No scores recorded for this view yet. Play a game to set the top score!
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((item, index) => {
              const rank = index + 1;
              const isCurrentUser = (item.playerName || '').toLowerCase().trim() === (playerName || '').toLowerCase().trim();

              return (
                <div
                  key={item.id || index}
                  className={`
                    flex items-center justify-between p-3 rounded-2xl transition-all
                    ${isCurrentUser
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/80 shadow-sm'
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
                        <span className="text-slate-400 font-bold text-xs">#{rank}</span>
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
                      {leaderboardTab === 'mathRush' || leaderboardTab === 'colorConfusion_v2'
                        ? `${(item.score || 0).toLocaleString()} pts`
                        : `${item.moves || item.score || 0} moves`
                      }
                    </span>
                    {leaderboardTab === 'mathRush' && item.level && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block">
                        Level {item.level}
                      </span>
                    )}
                    {leaderboardTab === 'memory_v3' && item.timeTaken !== undefined && (
                      <span className="text-[10px] text-rose-500 font-bold flex items-center gap-0.5 justify-end mt-0.5">
                        <Clock size={10} />
                        {Math.floor(item.timeTaken / 60)}:{(item.timeTaken % 60).toString().padStart(2, '0')}
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
