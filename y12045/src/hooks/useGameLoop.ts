import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';

export function useGameLoop() {
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const lastPackageTimeRef = useRef<number>(0);
  
  const { status, tick, time, config } = useGameStore();

  useEffect(() => {
    if (status !== 'playing') {
      return;
    }

    const loop = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }
      
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      tick(deltaTime);

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      lastTimeRef.current = 0;
    };
  }, [status, tick]);

  useEffect(() => {
    if (status !== 'playing') {
      lastPackageTimeRef.current = 0;
      return;
    }

    if (lastPackageTimeRef.current === 0) {
      lastPackageTimeRef.current = time;
      useGameStore.getState().generatePackage();
    }

    const [minInterval, maxInterval] = config.packageInterval;
    const elapsed = time - lastPackageTimeRef.current;
    const targetInterval = minInterval + Math.random() * (maxInterval - minInterval);

    if (elapsed >= targetInterval) {
      useGameStore.getState().generatePackage();
      lastPackageTimeRef.current = time;
    }
  }, [time, status, config.packageInterval]);

  return null;
}
