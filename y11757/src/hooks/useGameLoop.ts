import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../game/engine';

export const useGameLoop = () => {
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);

  const update = useGameStore(state => state.update);
  const gameState = useGameStore(state => state.gameState);

  const gameLoop = useCallback((timestamp: number) => {
    if (!isRunningRef.current) return;

    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
    }

    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = timestamp;

    update(dt);

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [update]);

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    lastTimeRef.current = 0;
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    if (gameState === 'running') {
      start();
    } else {
      stop();
    }

    return () => {
      stop();
    };
  }, [gameState, start, stop]);

  return { start, stop };
};
