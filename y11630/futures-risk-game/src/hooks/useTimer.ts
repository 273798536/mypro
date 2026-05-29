import { useEffect, useRef, useCallback } from 'react';
import { useGame } from './useGame';

export const useTimer = () => {
  const { state, dispatch } = useGame();
  const timerRef = useRef<number | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    
    timerRef.current = window.setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 1000);
  }, [dispatch]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (state.status === 'playing') {
      startTimer();
    } else {
      stopTimer();
    }

    return () => {
      stopTimer();
    };
  }, [state.status, startTimer, stopTimer]);

  useEffect(() => {
    if (state.timeRemaining <= 0 && state.status === 'playing') {
      dispatch({ type: 'NEXT_ROUND' });
    }
  }, [state.timeRemaining, state.status, dispatch]);

  return {
    timeRemaining: state.timeRemaining,
    isRunning: state.status === 'playing',
  };
};
