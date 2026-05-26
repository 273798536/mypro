import React, { useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  remainingTime: number;
  isRunning: boolean;
  onTick: () => number;
  className?: string;
}

export const Timer: React.FC<TimerProps> = ({ remainingTime, isRunning, onTick, className = '' }) => {
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning && remainingTime > 0) {
      intervalRef.current = window.setInterval(() => {
        onTick();
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, remainingTime, onTick]);

  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;
  const isLow = remainingTime <= 30;

  return (
    <div className={`flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-xl font-bold ${
      isLow ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-700'
    } ${className}`}>
      <Clock size={24} className={isLow ? 'text-red-500' : 'text-gray-500'} />
      <span>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
};
