import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';

export function useTimer() {
  const { phase, timeLeft, updateTime, submitAudit } = useGameStore();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase === 'playing' && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        const newTime = useGameStore.getState().timeLeft - 1;
        updateTime(newTime);
        if (newTime <= 0) {
          submitAudit();
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, updateTime, submitAudit]);

  return timeLeft;
}
