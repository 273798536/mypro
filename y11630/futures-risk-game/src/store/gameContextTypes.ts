import { createContext } from 'react';
import type { GameState, GameAction } from '../types';

export interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);
