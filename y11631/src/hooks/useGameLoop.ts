import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';

export function useGameLoop() {
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();
  const { gameState, updateGame, isReplayMode, replaySpeed, stepReplay } = useGameStore();

  useEffect(() => {
    if (gameState.status !== 'playing' || isReplayMode) {
      return;
    }

    const gameLoop = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      updateGame(deltaTime);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      lastTimeRef.current = 0;
    };
  }, [gameState.status, isReplayMode, updateGame]);

  useEffect(() => {
    if (!isReplayMode) return;

    const replayInterval = setInterval(() => {
      stepReplay();
    }, 100 / replaySpeed);

    return () => clearInterval(replayInterval);
  }, [isReplayMode, replaySpeed, stepReplay]);
}
