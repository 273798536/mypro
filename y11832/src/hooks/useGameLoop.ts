import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

export const useGameLoop = () => {
  const status = useGameStore((state) => state.status);
  const gameTick = useGameStore((state) => state.gameTick);
  const animationRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    if (status !== 'playing') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const tickInterval = 1000;

    const gameLoop = (timestamp: number) => {
      if (timestamp - lastTickRef.current >= tickInterval) {
        gameTick();
        lastTickRef.current = timestamp;
      }
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [status, gameTick]);
};
