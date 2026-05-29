import React, { useReducer } from 'react';
import type { ReactNode } from 'react';
import { GameContext } from './gameContextTypes';
import { gameReducer } from './gameReducer';
import { createInitialState } from './initialState';

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, createInitialState());

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};
