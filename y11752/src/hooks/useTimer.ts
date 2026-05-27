import { useEffect, useRef, useCallback } from 'react';

interface UseTimerOptions {
  initialTime: number;
  onTick?: (time: number) => void;
  onComplete?: () => void;
  autoStart?: boolean;
}

export const useTimer = ({
  initialTime,
  onTick,
  onComplete,
  autoStart = false
}: UseTimerOptions) => {
  const timeRef = useRef(initialTime);
  const intervalRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);

  const tick = useCallback(() => {
    timeRef.current -= 1;
    onTick?.(timeRef.current);
    
    if (timeRef.current <= 0) {
      stop();
      onComplete?.();
    }
  }, [onTick, onComplete]);

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    intervalRef.current = window.setInterval(tick, 1000);
  }, [tick]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback((newTime?: number) => {
    stop();
    timeRef.current = newTime ?? initialTime;
    onTick?.(timeRef.current);
  }, [initialTime, onTick, stop]);

  const pause = useCallback(() => {
    stop();
  }, [stop]);

  const resume = useCallback(() => {
    if (timeRef.current > 0) {
      start();
    }
  }, [start]);

  useEffect(() => {
    if (autoStart) {
      start();
    }
    return () => stop();
  }, [autoStart, start, stop]);

  return {
    start,
    stop,
    reset,
    pause,
    resume,
    getTime: () => timeRef.current
  };
};
