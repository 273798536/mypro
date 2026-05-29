import { useGameStore } from '../../store/gameStore';
import { X, Clock, Music, AlertTriangle, Zap } from 'lucide-react';
import type { GameEvent } from '../../types/game';

interface ReplayPanelProps {
  onClose: () => void;
}

export const ReplayPanel = ({ onClose }: ReplayPanelProps) => {
  const { gameResult } = useGameStore();

  if (!gameResult) return null;

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'sample_collect':
        return <Music className="w-4 h-4 text-space-green" />;
      case 'sample_place':
        return <Zap className="w-4 h-4 text-space-cyan" />;
      case 'sample_conflict':
        return <AlertTriangle className="w-4 h-4 text-space-orange" />;
      case 'rhythm_mismatch':
        return <AlertTriangle className="w-4 h-4 text-space-red" />;
      case 'storm_hit':
        return <Zap className="w-4 h-4 text-space-orange" />;
      case 'fuel_low':
        return <AlertTriangle className="w-4 h-4 text-space-yellow" />;
      case 'fuel_empty':
        return <AlertTriangle className="w-4 h-4 text-space-red" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'sample_collect':
        return '收集采样';
      case 'sample_place':
        return '放置采样';
      case 'sample_conflict':
        return '采样冲突';
      case 'rhythm_mismatch':
        return '节奏错位';
      case 'storm_hit':
        return '风暴命中';
      case 'fuel_low':
        return '燃料不足';
      case 'fuel_empty':
        return '燃料耗尽';
      default:
        return type;
    }
  };

  const getEventDescription = (event: GameEvent) => {
    switch (event.type) {
      case 'sample_collect':
        return `收集了 ${event.data.soundType || '未知'} 类型采样`;
      case 'sample_place':
        return `放置采样到第 ${((event.data.beatIndex as number) || 0) + 1} 拍`;
      case 'sample_conflict':
        return `在第 ${((event.data.beatIndex as number) || 0) + 1} 拍发生冲突`;
      case 'rhythm_mismatch':
        return `偏移 ${Math.round((event.data.offset as number) || 0)}ms`;
      case 'storm_hit':
        return `强度: ${Math.round(((event.data.intensity as number) || 0) * 100)}%`;
      default:
        return '';
    }
  };

  const formatTime = (timestamp: number) => {
    const firstTime = gameResult.events[0]?.timestamp || timestamp;
    const diff = Math.floor((timestamp - firstTime) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const totalPositive = gameResult.scoreBreakdown
    .filter(s => s.points > 0)
    .reduce((sum, s) => sum + s.points, 0);
  const totalNegative = gameResult.scoreBreakdown
    .filter(s => s.points < 0)
    .reduce((sum, s) => sum + s.points, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90">
      <div className="glass rounded-2xl p-6 max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto neon-border-pink">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-neon-pink font-orbitron">游戏复盘</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="mb-8">
          <h4 className="text-sm font-bold text-gray-300 mb-4">分数分析</h4>
          <div className="glass rounded-lg p-4 neon-border-cyan">
            <div className="flex items-end gap-4 h-40">
              {gameResult.scoreBreakdown.slice().reverse().map((item, index) => (
                <div key={item.id} className="flex flex-col items-center flex-1">
                  <div className="text-xs text-gray-400 mb-1">
                    {item.points > 0 ? '+' : ''}{item.points}
                  </div>
                  <div
                    className={`w-full rounded-t transition-all duration-500 ${
                      item.points > 0 ? 'bg-space-green' : 'bg-space-red'
                    }`}
                    style={{
                      height: `${Math.min(Math.abs(item.points) / 5, 100)}%`,
                    }}
                  />
                  <div className="text-xs text-gray-500 mt-2 text-center truncate w-full">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 pt-4 border-t border-gray-700">
              <div>
                <span className="text-sm text-gray-400">加分: </span>
                <span className="text-space-green font-bold">+{totalPositive}</span>
              </div>
              <div>
                <span className="text-sm text-gray-400">扣分: </span>
                <span className="text-space-red font-bold">{totalNegative}</span>
              </div>
              <div>
                <span className="text-sm text-gray-400">总分: </span>
                <span className="text-neon-pink font-bold">{gameResult.score}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-300 mb-4">事件时间线</h4>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-space-cyan/30" />
            
            {gameResult.events.map((event, index) => (
              <div key={event.id} className="relative pl-10 pb-4">
                <div
                  className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                    event.type.includes('mismatch') || event.type.includes('conflict') || event.type.includes('empty')
                      ? 'bg-space-red/20'
                      : event.type.includes('collect') || event.type.includes('place')
                      ? 'bg-space-green/20'
                      : 'bg-space-cyan/20'
                  }`}
                >
                  {getEventIcon(event.type)}
                </div>
                <div className="glass rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">
                      {getEventLabel(event.type)}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(event.timestamp)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {getEventDescription(event)}
                  </div>
                  {event.data.x !== undefined && event.data.y !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      位置: ({Math.round(event.data.x as number)}, {Math.round(event.data.y as number)})
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <h4 className="text-sm font-bold text-gray-300 mb-3">结果说明</h4>
          <div className="space-y-2 text-sm text-gray-400">
            <p>
              <span className="text-space-green">● 可直接用</span>: 节奏错位 ≤ 2 次，采样冲突 ≤ 2 次，采样放置 ≥ 4 个
            </p>
            <p>
              <span className="text-space-orange">● 需要独立开发者确认</span>: 采样放置不足或风暴命中过多
            </p>
            <p>
              <span className="text-space-red">● 因为节奏错位暂时不能算</span>: 节奏错位超过 2 次
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
