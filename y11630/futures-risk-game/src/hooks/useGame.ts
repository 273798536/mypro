import { useContext } from 'react';
import { GameContext } from '../store/gameContextTypes';
import type { GameContextType } from '../store/gameContextTypes';

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
