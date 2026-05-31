import { useGameStore } from '@/store/useGameStore';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CountdownTimer = () => {
  const { timeLeft, totalTime, status } = useGameStore();

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = (timeLeft / totalTime) * 100;
  const isUrgent = timeLeft <= 10 && status === 'playing';

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-slate-700"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(
              'transition-all duration-1000',
              isUrgent ? 'text-red-500' : 'text-purple-500'
            )}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Clock
            size={16}
            className={cn(isUrgent ? 'text-red-500' : 'text-slate-400')}
          />
        </div>
      </div>
      
      <div className="text-center">
        <div
          className={cn(
            'text-3xl font-bold font-mono tracking-wider',
            isUrgent && 'text-red-500 animate-pulse'
          )}
        >
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <div className="text-xs text-slate-400">剩余时间</div>
      </div>
    </div>
  );
};
