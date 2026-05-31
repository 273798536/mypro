import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';

export const useGameTimer = () => {
  const { status, tick, finishGame, timeLeft } = useGameStore();
  const intervalRef = useRef<number | null>(null);

  const startTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = window.setInterval(() => {
      tick();
    }, 1000);
  }, [tick]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (status === 'playing') {
      startTimer();
    } else {
      stopTimer();
    }

    return () => {
      stopTimer();
    };
  }, [status, startTimer, stopTimer]);

  useEffect(() => {
    if (timeLeft <= 0 && status === 'playing') {
      finishGame();
      stopTimer();
    }
  }, [timeLeft, status, finishGame, stopTimer]);

  return {
    startTimer,
    stopTimer
  };
};
