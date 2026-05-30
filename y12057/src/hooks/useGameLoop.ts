import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';

export function useGameLoop() {
  const tick = useGameStore(state => state.tick);
  const status = useGameStore(state => state.state?.status);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const gameLoop = useCallback((currentTime: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = currentTime;
    }

    const deltaTime = (currentTime - lastTimeRef.current) / 1000;
    lastTimeRef.current = currentTime;

    if (deltaTime > 0 && deltaTime < 1) {
      tick(deltaTime);
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [tick]);

  useEffect(() => {
    if (status === 'running') {
      lastTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [status, gameLoop]);

  return { isRunning: status === 'running' };
}
