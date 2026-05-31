import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';

export const useGameTimer = () => {
  const status = useGameStore((state) => state.status);
  const tick = useGameStore((state) => state.tick);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === 'playing') {
      intervalRef.current = setInterval(() => {
        tick();
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [status, tick]);

  return null;
};
