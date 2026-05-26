import { useGameStore } from '@/store/gameStore';
import { Trophy, Clock, Users, AlertCircle } from 'lucide-react';

export function ScorePanel() {
  const score = useGameStore(state => state.score);
  const timeRemaining = useGameStore(state => state.timeRemaining);
  const passengers = useGameStore(state => state.passengers);
  const congestionZones = useGameStore(state => state.congestionZones);

  const exitedCount = passengers.filter(p => p.status === 'exited').length;
  const stuckCount = passengers.filter(p => p.status === 'stuck').length;
  const waitingCount = passengers.filter(p => p.status === 'waiting').length;
  const movingCount = passengers.filter(p => p.status === 'moving').length;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-300 text-sm mb-1">
          <Trophy className="w-4 h-4" />
          <span>当前得分</span>
        </div>
        <div className="text-4xl font-bold text-white font-mono">
          {score}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
          <Clock className="w-4 h-4" />
          <span>剩余时间</span>
        </div>
        <div className={`text-3xl font-bold font-mono ${
          timeRemaining < 30 ? 'text-red-400 animate-pulse' : 'text-white'
        }`}>
          {formatTime(timeRemaining)}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
          <Users className="w-4 h-4" />
          <span>乘客状态</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-green-900/30 rounded p-2">
            <div className="text-xs text-green-400">已疏散</div>
            <div className="text-xl font-bold text-green-300 font-mono">{exitedCount}</div>
          </div>
          <div className="bg-blue-900/30 rounded p-2">
            <div className="text-xs text-blue-400">移动中</div>
            <div className="text-xl font-bold text-blue-300 font-mono">{movingCount}</div>
          </div>
          <div className="bg-yellow-900/30 rounded p-2">
            <div className="text-xs text-yellow-400">等待中</div>
            <div className="text-xl font-bold text-yellow-300 font-mono">{waitingCount}</div>
          </div>
          <div className="bg-red-900/30 rounded p-2">
            <div className="text-xs text-red-400">拥堵</div>
            <div className="text-xl font-bold text-red-300 font-mono">{stuckCount}</div>
          </div>
        </div>
      </div>

      {congestionZones.length > 0 && (
        <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
            <AlertCircle className="w-4 h-4" />
            <span>拥堵区域</span>
          </div>
          <div className="text-red-300 text-sm">
            检测到 {congestionZones.length} 个拥堵区域
          </div>
        </div>
      )}
    </div>
  );
}
