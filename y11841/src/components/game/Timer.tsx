import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { formatTime } from '../../utils/temperatureEngine';
import { cn } from '@/lib/utils';

const Timer: React.FC = () => {
  const { remainingTime, status } = useGameStore();

  const isOvertime = remainingTime < 0;
  const isWarning = remainingTime >= 0 && remainingTime <= 60;

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-lg border-2',
      isOvertime
        ? 'bg-cold-chain-danger/20 border-cold-chain-danger animate-pulse-slow'
        : isWarning
          ? 'bg-cold-chain-warning/20 border-cold-chain-warning'
          : 'bg-cold-chain-panel border-cold-chain-border'
    )}>
      {isOvertime ? (
        <AlertTriangle className={cn(
          'w-6 h-6',
          isOvertime ? 'text-cold-chain-danger' : 'text-cold-chain-warning'
        )} />
      ) : (
        <Clock className="w-6 h-6 text-cold-chain-primary" />
      )}
      <div>
        <div className={cn(
          'font-mono text-2xl font-bold tabular-nums',
          isOvertime
            ? 'text-cold-chain-danger'
            : isWarning
              ? 'text-cold-chain-warning'
              : 'text-white'
        )}>
          {formatTime(remainingTime)}
        </div>
        <div className="text-xs text-gray-400 font-mono">
          {isOvertime ? '已超时，温度正在上升！' : '剩余时间'}
        </div>
      </div>
    </div>
  );
};

export default Timer;
