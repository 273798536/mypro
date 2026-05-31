import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';

export function useTimer() {
  const status = useGameStore(state => state.status);
  const updateElapsedTime = useGameStore(state => state.updateElapsedTime);
  const elapsedTime = useGameStore(state => state.elapsedTime);

  const intervalRef = useRef<number | null>(null);

  const startTimer = useCallback(() => {
    if (intervalRef.current) return;

    intervalRef.current = window.setInterval(() => {
      updateElapsedTime(elapsedTime + 1);
    }, 1000);
  }, [elapsedTime, updateElapsedTime]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    stopTimer();
    updateElapsedTime(0);
  }, [stopTimer, updateElapsedTime]);

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
    if (status === 'idle') {
      resetTimer();
    }
  }, [status, resetTimer]);

  return {
    elapsedTime,
    startTimer,
    stopTimer,
    resetTimer,
  };
}
