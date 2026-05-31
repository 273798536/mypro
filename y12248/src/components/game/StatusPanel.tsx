import { Trophy, Clock, Users, TrendingUp, AlertTriangle, Zap } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useEffect, useState } from 'react';
import { GAME_DURATION } from '../../types/game';

export function StatusPanel() {
  const { score, stats, status, startTime, totalPauseTime } = useGameStore();
  const [now, setNow] = useState(performance.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(performance.now());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const getGameTime = () => {
    if (!startTime || status === 'idle') return 0;
    const elapsed = now - startTime - totalPauseTime;
    return Math.min(elapsed, GAME_DURATION);
  };

  const gameTime = getGameTime();
  const remainingTime = Math.max(0, GAME_DURATION - gameTime);
  const timePercentage = (gameTime / GAME_DURATION) * 100;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getScoreColor = () => {
    if (score >= 500) return 'text-[#81C784]';
    if (score >= 200) return 'text-[#FFD54F]';
    if (score >= 0) return 'text-white';
    return 'text-[#D32F2F]';
  };

  const hasProblems = stats.cacheBreakdowns > 0 || stats.dirtySpreads > 0 || stats.expiredMisreads > 0;

  return (
    <div className="h-16 bg-[#1D1A17] border-t-2 border-[#5D554D] px-6 flex items-center gap-8">
      <div className="flex items-center gap-3">
        <Trophy className="w-6 h-6 text-[#FFD54F]" />
        <div>
          <div className="text-xs text-gray-500">当前分数</div>
          <div className={`text-2xl font-bold ${getScoreColor()}`} style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
            {score}
          </div>
        </div>
      </div>

      <div className="h-10 w-px bg-[#5D554D]" />

      <div className="flex items-center gap-3">
        <Clock className="w-5 h-5 text-gray-400" />
        <div className="w-48">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">剩余时间</span>
            <span className={`font-mono ${
              remainingTime < 10000 ? 'text-[#D32F2F]' : 'text-gray-300'
            }`}>
              {formatTime(remainingTime)} / {formatTime(GAME_DURATION)}
            </span>
          </div>
          <div className="h-2 bg-[#3D3833] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                remainingTime < 10000 ? 'bg-[#D32F2F]' : 'bg-[#FF7A18]'
              }`}
              style={{ width: `${100 - timePercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="h-10 w-px bg-[#5D554D]" />

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <div className="text-sm">
            <span className="text-[#81C784] font-bold">{stats.completedOrders}</span>
            <span className="text-gray-500">/{stats.totalOrders}</span>
            <span className="text-xs text-gray-500 ml-1">完成</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#81C784]" />
          <div className="text-sm">
            <span className="text-[#81C784] font-bold">{stats.cacheHits}</span>
            <span className="text-gray-500"> 命中</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#1565C0]" />
          <div className="text-sm">
            <span className="text-[#1565C0] font-bold">{stats.concurrentSource}</span>
            <span className="text-gray-500"> 回源</span>
          </div>
        </div>

        {hasProblems && (
          <div className="flex items-center gap-2 ml-2">
            <AlertTriangle className="w-4 h-4 text-[#D32F2F] animate-pulse" />
            <div className="text-sm flex gap-3">
              {stats.cacheBreakdowns > 0 && (
                <span className="text-[#D32F2F]">击穿:{stats.cacheBreakdowns}</span>
              )}
              {stats.dirtySpreads > 0 && (
                <span className="text-[#FFD54F]">脏数据:{stats.dirtySpreads}</span>
              )}
              {stats.expiredMisreads > 0 && (
                <span className="text-[#FF9800]">误读:{stats.expiredMisreads}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
