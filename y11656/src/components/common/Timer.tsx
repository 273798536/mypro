import { useEffect, useState } from 'react';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
}

export function Timer({ timeRemaining, totalTime }: TimerProps) {
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    setIsWarning(timeRemaining <= 10);
  }, [timeRemaining]);

  const progress = (timeRemaining / totalTime) * 100;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-48 h-3 bg-amber-200 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-linear rounded-full ${
            isWarning ? 'bg-red-500' : 'bg-amber-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div
        className={`text-3xl font-bold tabular-nums transition-colors ${
          isWarning ? 'text-red-600 animate-pulse' : 'text-amber-900'
        }`}
      >
        {minutes > 0 && `${minutes}:`}
        {seconds.toString().padStart(2, '0')}
      </div>
      <div className="text-sm text-amber-700">剩余时间</div>
    </div>
  );
}
