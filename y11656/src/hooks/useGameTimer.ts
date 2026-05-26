import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';

export function useGameTimer() {
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const { updateTime, status, timeRemaining, completeGame, items, processedItems } = useGameStore();

  const startTimer = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  useEffect(() => {
    if (isRunning && status === 'playing') {
      intervalRef.current = window.setInterval(() => {
        const currentTime = useGameStore.getState().timeRemaining;
        const currentProcessed = useGameStore.getState().processedItems;
        const currentItems = useGameStore.getState().items;

        if (currentTime <= 1 || currentProcessed.size >= currentItems.length) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsRunning(false);
          completeGame();
        } else {
          updateTime(currentTime - 1);
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, status, updateTime, completeGame]);

  useEffect(() => {
    if (processedItems.size >= items.length && items.length > 0 && status === 'playing') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRunning(false);
      completeGame();
    }
  }, [processedItems, items.length, status, completeGame]);

  return {
    isRunning,
    startTimer,
    pauseTimer,
    timeRemaining,
  };
}
