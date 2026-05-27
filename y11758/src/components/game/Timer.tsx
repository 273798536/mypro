import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { formatTime } from '@/utils/scoringEngine';
import { cn } from '@/lib/utils';

interface TimerProps {
  timeLeft: number;
  totalTime: number;
}

export const Timer: React.FC<TimerProps> = ({ timeLeft, totalTime }) => {
  const percentage = (timeLeft / totalTime) * 100;
  const isLow = timeLeft < 30;
  const isCritical = timeLeft < 10;

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xl font-bold',
          isCritical
            ? 'bg-red-100 text-red-700 animate-pulse'
            : isLow
            ? 'bg-amber-100 text-amber-700'
            : 'bg-emerald-100 text-emerald-700'
        )}
      >
        <Clock className="w-5 h-5" />
        <span>{formatTime(timeLeft)}</span>
      </div>
      <div className="w-32 h-3 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000',
            isCritical ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isCritical && <AlertCircle className="w-5 h-5 text-red-500 animate-bounce" />}
    </div>
  );
};
