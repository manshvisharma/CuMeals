import React, { useState, useEffect } from 'react';
import { Gamepad2, Brain, Zap, Trophy, Flame, Calendar, Users, Timer, Clock, Swords } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

import { MemoryGame } from '../components/games/MemoryGame';
import { MathRushGame } from '../components/games/MathRushGame';
import { ColorConfusionGame } from '../components/games/ColorConfusionGame';
import { getGameLeaderboard, subscribeToLeaderboard } from '../utils/leaderboard';
import { LeaderboardEntry } from '../types';

import { Lobby } from '../components/multiplayer/Lobby';
import { SnakeBattle } from '../components/multiplayer/SnakeBattle';
import { WordBattle } from '../components/multiplayer/WordBattle';
import { MemoryBattle } from '../components/multiplayer/MemoryBattle';

interface TimepassPageProps {
  currentUser: FirebaseUser | null;
}

export const TimepassPage: React.FC<TimepassPageProps> = ({ currentUser }) => {
  const [mainTab, setMainTab] = useState<'minigames' | 'battles' | 'leaderboards'>('minigames');

  const [activeGame, setActiveGame] = useState<'memory_v3' | 'mathRush' | 'colorConfusion_v2' | null>(null);
  
  // Multiplayer State
  const [activeBattle, setActiveBattle] = useState<{type: string, sessionId: string, opponentName: string, isPlayer1: boolean} | null>(null);

  const [leaderboardTab, setLeaderboardTab] = useState<'mathRush' | 'memory_v3' | 'colorConfusion_v2'>('mathRush');
  const [timeframe, setTimeframe] = useState<'weekly' | 'lifetime'>('lifetime');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false);
  const [weekEndString, setWeekEndString] = useState<string>('');

  const [customName, setCustomName] = useState<string>(() => {
    try { return localStorage.getItem('cumeals_custom_nickname') || ''; } catch { return ''; }
  });
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempNameInput, setTempNameInput] = useState<string>('');

  const playerName = currentUser?.displayName || currentUser?.email?.split('@')[0] || customName || 'Hostel Student';

  const saveNickname = () => {
    const val = tempNameInput.trim();
    if (val) {
      setCustomName(val);
      try { localStorage.setItem('cumeals_custom_nickname', val); } catch (e) {}
    }
    setIsEditingName(false);
  };

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

  useEffect(() => {
    if (mainTab !== 'leaderboards' || activeGame || activeBattle) return;
    setLoadingLeaderboard(true);
    
    const unsubscribe = subscribeToLeaderboard(leaderboardTab, timeframe, (entries) => {
      setLeaderboard(entries);
      setLoadingLeaderboard(false);
    });
    return () => unsubscribe();
  }, [leaderboardTab, timeframe, activeGame, activeBattle, mainTab]);


  // Active Solo Game Renders
  if (activeGame === 'memory_v3') return <div className="pb-32 pt-2"><MemoryGame playerName={playerName} userEmail={currentUser?.email || undefined} onBack={() => setActiveGame(null)} /></div>;
  if (activeGame === 'mathRush') return <div className="pb-32 pt-2"><MathRushGame playerName={playerName} userEmail={currentUser?.email || undefined} onBack={() => setActiveGame(null)} /></div>;
  if (activeGame === 'colorConfusion_v2') return <div className="pb-32 pt-2"><ColorConfusionGame playerName={playerName} userEmail={currentUser?.email || undefined} onBack={() => setActiveGame(null)} /></div>;

  // Active Multiplayer Battle Renders
  if (activeBattle) {
    if (activeBattle.type === 'snake') {
      return (
        <div className="pb-32 pt-2">
          <SnakeBattle currentUser={currentUser} sessionId={activeBattle.sessionId} opponentName={activeBattle.opponentName} isPlayer1={activeBattle.isPlayer1} onLeave={() => setActiveBattle(null)} />
        </div>
      );
    }
    if (activeBattle.type === 'word') {
      return (
        <div className="pb-32 pt-2">
          <WordBattle currentUser={currentUser} sessionId={activeBattle.sessionId} opponentName={activeBattle.opponentName} isPlayer1={activeBattle.isPlayer1} onLeave={() => setActiveBattle(null)} />
        </div>
      );
    }
    if (activeBattle.type === 'memory') {
      return (
        <div className="pb-32 pt-2">
          <MemoryBattle currentUser={currentUser} sessionId={activeBattle.sessionId} opponentName={activeBattle.opponentName} isPlayer1={activeBattle.isPlayer1} onLeave={() => setActiveBattle(null)} />
        </div>
      );
    }
  }

  return (
    <div className="pb-32 animate-fadeIn pt-2 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Gamepad2 className="text-indigo-500" />
            Timepass
          </h1>
          
          <div className="flex items-center gap-2 mt-1">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempNameInput}
                  onChange={(e) => setTempNameInput(e.target.value)}
                  placeholder="Enter nickname"
                  className="px-3 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                  maxLength={15}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && saveNickname()}
                />
                <button onClick={saveNickname} className="text-xs bg-indigo-500 text-white px-2 py-1 rounded-md font-bold">Save</button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                  {playerName}
                </span>
                {(!currentUser?.displayName) && (
                  <button 
                    onClick={() => { setTempNameInput(customName || ''); setIsEditingName(true); }}
                    className="text-[10px] text-indigo-500 hover:text-indigo-600 font-bold ml-1 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full"
                  >
                    Edit Name
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-6 shadow-inner text-sm font-bold">
        <button
          onClick={() => setMainTab('minigames')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${mainTab === 'minigames' ? 'bg-white dark:bg-[#131722] text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Gamepad2 size={16} /> Solo
        </button>
        <button
          onClick={() => setMainTab('battles')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${mainTab === 'battles' ? 'bg-white dark:bg-[#131722] text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Swords size={16} /> Battle
        </button>
        <button
          onClick={() => setMainTab('leaderboards')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${mainTab === 'leaderboards' ? 'bg-white dark:bg-[#131722] text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Trophy size={16} /> Ranks
        </button>
      </div>

      {/* Mini Games Content */}
      {mainTab === 'minigames' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Math Rush Card */}
          <div 
            onClick={() => setActiveGame('mathRush')}
            className="group relative overflow-hidden bg-white dark:bg-[#131722] rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer hover:-translate-y-1 active:translate-y-0"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-full blur-2xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-4 mb-3 relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white group-hover:scale-110 transition-transform">
                <Brain size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight">Math Rush</h3>
                <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-500">Brain Training</span>
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium relative">Solve basic math equations before the time runs out. Get faster!</p>
          </div>
          
          {/* Memory Match Card */}
          <div 
            onClick={() => setActiveGame('memory_v3')}
            className="group relative overflow-hidden bg-white dark:bg-[#131722] rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer hover:-translate-y-1 active:translate-y-0"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 rounded-full blur-2xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-4 mb-3 relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white group-hover:scale-110 transition-transform">
                <Gamepad2 size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight">Memory Match</h3>
                <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-500">Focus Game</span>
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium relative">Flip cards and find matching pairs. Complete in fewest moves!</p>
          </div>

          {/* Color Confusion Card */}
          <div 
            onClick={() => setActiveGame('colorConfusion_v2')}
            className="group relative overflow-hidden bg-white dark:bg-[#131722] rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-800 transition-all cursor-pointer hover:-translate-y-1 active:translate-y-0"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-500/10 to-orange-500/10 dark:from-rose-500/20 dark:to-orange-500/20 rounded-full blur-2xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-4 mb-3 relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/30 text-white group-hover:scale-110 transition-transform">
                <Zap size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight">Color Clash</h3>
                <span className="text-[10px] font-bold tracking-wider uppercase text-rose-500">Reflexes</span>
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium relative">Does the text match the color? Think fast before time is up!</p>
          </div>
        </div>
      )}

      {/* Battles Content */}
      {mainTab === 'battles' && (
        <Lobby 
          currentUser={currentUser} 
          playerName={playerName} 
          onJoinGame={(type, sessionId, oppName, isPlayer1) => {
            setActiveBattle({ type, sessionId, opponentName: oppName, isPlayer1 });
          }} 
        />
      )}

      {/* Leaderboards Content */}
      {mainTab === 'leaderboards' && (
        <div className="bg-white dark:bg-[#131722] rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-slate-800">
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-amber-500" />
                <h2 className="font-bold text-slate-900 dark:text-white text-base">Hostel Rankboard</h2>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Synced</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
                <button onClick={() => setTimeframe('lifetime')} className={`flex-1 py-1.5 rounded-xl transition-all text-center flex items-center justify-center gap-1 ${timeframe === 'lifetime' ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}><Flame size={12} /><span>Lifetime</span></button>
                <button onClick={() => setTimeframe('weekly')} className={`flex-1 py-1.5 rounded-xl transition-all text-center flex items-center justify-center gap-1 ${timeframe === 'weekly' ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}><Calendar size={12} /><span>Weekly</span></button>
              </div>
              <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                <button onClick={() => setLeaderboardTab('mathRush')} className={`flex-1 py-1.5 rounded-xl transition-all text-center ${leaderboardTab === 'mathRush' ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}>Math</button>
                <button onClick={() => setLeaderboardTab('colorConfusion_v2')} className={`flex-1 py-1.5 rounded-xl transition-all text-center ${leaderboardTab === 'colorConfusion_v2' ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}>Colors</button>
                <button onClick={() => setLeaderboardTab('memory_v3')} className={`flex-1 py-1.5 rounded-xl transition-all text-center ${leaderboardTab === 'memory_v3' ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}>Memory</button>
              </div>
            </div>
            {timeframe === 'weekly' && (
              <div className="flex items-center justify-center gap-1.5 pt-1.5 pb-1 text-[11px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                <Timer size={12} /><span>Week ends in {weekEndString}</span>
              </div>
            )}
          </div>

          {loadingLeaderboard ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />)}
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
                  <div key={item.id || index} className={`flex items-center justify-between p-3 rounded-2xl transition-all ${isCurrentUser ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/80 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs">
                        {rank === 1 ? <span className="text-amber-500 text-base">🥇</span> : rank === 2 ? <span className="text-slate-400 text-base">🥈</span> : rank === 3 ? <span className="text-amber-700 text-base">🥉</span> : <span className="text-slate-400 font-bold text-xs">#{rank}</span>}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{item.playerName}</span>
                          {isCurrentUser && <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-indigo-600 text-white">YOU</span>}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">{item.date}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900 dark:text-white block">
                        {leaderboardTab === 'mathRush' || leaderboardTab === 'colorConfusion_v2' ? `${(item.score || 0).toLocaleString()} pts` : `${item.moves || item.score || 0} moves`}
                      </span>
                      {leaderboardTab === 'mathRush' && item.level && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block">Level {item.level}</span>}
                      {leaderboardTab === 'memory_v3' && item.timeTaken !== undefined && <span className="text-[10px] text-rose-500 font-bold flex items-center gap-0.5 justify-end mt-0.5"><Clock size={10} />{Math.floor(item.timeTaken / 60)}:{(item.timeTaken % 60).toString().padStart(2, '0')}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
