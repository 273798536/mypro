import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';

export const Timer: React.FC = () => {
  const { gameStatus, endGame, updateBaggagePositions, spawnBaggage, currentLevel } = useGameStore();
  const lastUpdateRef = useRef<number>(Date.now());
  const lastSpawnRef = useRef<number>(Date.now());

  useEffect(() => {
    if (gameStatus !== 'playing') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const deltaTime = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      useGameStore.setState(state => {
        const newTime = state.timeRemaining - 1;
        if (newTime <= 0) {
          endGame();
          return state;
        }
        return { timeRemaining: newTime };
      });

      updateBaggagePositions(deltaTime);

      if (currentLevel && now - lastSpawnRef.current >= currentLevel.spawnInterval) {
        spawnBaggage();
        lastSpawnRef.current = now;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStatus, currentLevel, endGame, updateBaggagePositions, spawnBaggage]);

  return null;
};
