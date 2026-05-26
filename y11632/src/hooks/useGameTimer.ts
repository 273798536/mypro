import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';

export function useGameTimer() {
  const phase = useGameStore(state => state.phase);
  const timeRemaining = useGameStore(state => state.timeRemaining);
  const tickTime = useGameStore(state => state.tickTime);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      tickTime();
    }, 1000);
  }, [tickTime]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (phase === 'playing') {
      startTimer();
    } else {
      stopTimer();
    }

    return () => {
      stopTimer();
    };
  }, [phase, startTimer, stopTimer]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    isRunning: phase === 'playing',
  };
}
