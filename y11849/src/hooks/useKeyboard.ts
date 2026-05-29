import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export const useKeyboard = () => {
  const { setKeyboard, gameState } = useGameStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.status !== 'playing') return;

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          setKeyboard('up', true);
          break;
        case 's':
        case 'arrowdown':
          setKeyboard('down', true);
          break;
        case 'a':
        case 'arrowleft':
          setKeyboard('left', true);
          break;
        case 'd':
        case 'arrowright':
          setKeyboard('right', true);
          break;
        case ' ':
          e.preventDefault();
          setKeyboard('space', true);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          setKeyboard('up', false);
          break;
        case 's':
        case 'arrowdown':
          setKeyboard('down', false);
          break;
        case 'a':
        case 'arrowleft':
          setKeyboard('left', false);
          break;
        case 'd':
        case 'arrowright':
          setKeyboard('right', false);
          break;
        case ' ':
          setKeyboard('space', false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setKeyboard, gameState.status]);
};
