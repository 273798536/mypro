import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

export const useGameEngine = () => {
  const { 
    status, 
    tick, 
    addRequest, 
    config,
    speed,
  } = useGameStore();
  
  const lastTickRef = useRef<number>(0);
  const lastRequestRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  const gameLoop = useCallback((timestamp: number) => {
    if (status !== 'playing') {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const delta = lastTickRef.current ? timestamp - lastTickRef.current : 16;
    lastTickRef.current = timestamp;

    tick(delta);

    const requestInterval = config.requestInterval / speed;
    if (timestamp - lastRequestRef.current > requestInterval) {
      addRequest();
      lastRequestRef.current = timestamp;
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [status, tick, addRequest, config.requestInterval, speed]);

  useEffect(() => {
    if (status === 'playing') {
      lastTickRef.current = 0;
      lastRequestRef.current = performance.now();
    }
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [status, gameLoop]);

  return null;
};
