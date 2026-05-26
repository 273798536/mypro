import type { GameState } from '../types';
import { GAME_CONFIG } from '../constants/gameConfig';

export const createInitialState = (): GameState => ({
  status: 'idle',
  currentRound: 0,
  totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
  timePerRound: GAME_CONFIG.TIME_PER_ROUND,
  timeRemaining: GAME_CONFIG.TIME_PER_ROUND,
  accounts: [],
  marketEvents: [],
  operationLogs: [],
  liquidationRecords: [],
  forceCloseQueue: [],
  totalScore: 0,
  extremeConsecutiveCount: 0,
  selectedAccountId: null,
  lastExtremeDirection: null,
});
