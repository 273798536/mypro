import { useEffect, useRef } from 'react';

interface UseGameLoopOptions {
  onTick: (deltaTime: number) => void;
  isActive: boolean;
  tickRate?: number;
}

export function useGameLoop({ onTick, isActive, tickRate = 60 }: UseGameLoopOptions) {
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();
  const accumulatorRef = useRef<number>(0);
  const tickInterval = 1000 / tickRate;

  useEffect(() => {
    if (!isActive) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      return;
    }

    lastTimeRef.current = performance.now();
    accumulatorRef.current = 0;

    const loop = (currentTime: number) => {
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      accumulatorRef.current += deltaTime;

      while (accumulatorRef.current >= tickInterval) {
        onTick(tickInterval / 1000);
        accumulatorRef.current -= tickInterval;
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onTick, isActive, tickInterval]);
}

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => {
      savedCallback.current?.();
    }, delay);

    return () => clearInterval(id);
  }, [delay]);
}
