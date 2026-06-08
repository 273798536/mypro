import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';

export function useGameEngine() {
  const status = useGameStore((s) => s.status);
  const playSpeed = useGameStore((s) => s.playSpeed);
  const advanceFrame = useGameStore((s) => s.advanceFrame);
  const timerRef = useRef<number | null>(null);

  const startLoop = useCallback(() => {
    if (timerRef.current) return;
    const interval = Math.max(100, 800 / playSpeed);
    timerRef.current = window.setInterval(() => {
      advanceFrame();
    }, interval);
  }, [advanceFrame, playSpeed]);

  const stopLoop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (status === 'playing') {
      startLoop();
    } else {
      stopLoop();
    }
    return stopLoop;
  }, [status, startLoop, stopLoop]);

  useEffect(() => {
    if (status === 'playing') {
      stopLoop();
      startLoop();
    }
  }, [playSpeed, status, startLoop, stopLoop]);

  return { startLoop, stopLoop };
}
