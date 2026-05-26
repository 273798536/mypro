import type { GameState, GameAction } from '../types';
import { GAME_CONFIG } from '../constants/gameConfig';
import { createInitialState } from './initialState';
import {
  updatePositionPrices,
  calculateRiskLevel,
  calculateTotalMarginRequired,
  calculateTotalUnrealizedPnL,
  calculateEquity,
  canAddMargin,
} from '../utils/marginCalculator';
import {
  getAccountStatus,
  sortForceCloseQueue,
  evaluateOperation,
} from '../utils/riskAssessor';
import {
  generateInitialAccounts,
  generateMarketEvent,
  getExtremeDirection,
} from '../utils/dataGenerator';
import { v4 as uuidv4 } from 'uuid';

const generateId = (): string => uuidv4();

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'START_GAME': {
      const accounts = generateInitialAccounts(GAME_CONFIG.INITIAL_ACCOUNTS);
      return {
        ...createInitialState(),
        status: 'playing',
        currentRound: 1,
        accounts,
        timeRemaining: GAME_CONFIG.TIME_PER_ROUND,
      };
    }

    case 'PAUSE_GAME': {
      if (state.status !== 'playing') return state;
      return { ...state, status: 'paused' };
    }

    case 'RESUME_GAME': {
      if (state.status !== 'paused') return state;
      return { ...state, status: 'playing' };
    }

    case 'RESTART_GAME': {
      const accounts = generateInitialAccounts(GAME_CONFIG.INITIAL_ACCOUNTS);
      return {
        ...createInitialState(),
        status: 'playing',
        currentRound: 1,
        accounts,
        timeRemaining: GAME_CONFIG.TIME_PER_ROUND,
      };
    }

    case 'SETTLE_GAME': {
      return { ...state, status: 'settled' };
    }

    case 'TICK': {
      if (state.status !== 'playing') return state;
      if (state.timeRemaining <= 1) {
        return processTimeout(state);
      }
      return { ...state, timeRemaining: state.timeRemaining - 1 };
    }

    case 'NEXT_ROUND': {
      if (state.currentRound >= state.totalRounds) {
        return { ...state, status: 'settled' };
      }

      const nextRound = state.currentRound + 1;
      
      const marketEvent = generateMarketEvent(
        nextRound,
        state.extremeConsecutiveCount,
        state.lastExtremeDirection
      );

      let updatedAccounts = state.accounts.map(account => {
        if (account.status === 'liquidated') return account;
        
        const updatedPositions = updatePositionPrices(
          account.positions,
          marketEvent.contractCode,
          account.positions.find(p => p.contractCode === marketEvent.contractCode)
            ? account.positions.find(p => p.contractCode === marketEvent.contractCode)!.currentPrice * (1 + marketEvent.priceChangePercent / 100)
            : account.positions[0]?.currentPrice || 0
        );
        
        const unrealizedPnL = calculateTotalUnrealizedPnL(updatedPositions);
        const marginBalance = calculateTotalMarginRequired(updatedPositions);
        const equity = calculateEquity({ ...account, unrealizedPnL });
        const riskLevel = calculateRiskLevel({ ...account, positions: updatedPositions, unrealizedPnL, equity });
        const status = getAccountStatus(riskLevel);

        return {
          ...account,
          positions: updatedPositions,
          unrealizedPnL,
          marginBalance,
          equity,
          riskLevel,
          status,
        };
      });

      const extremeDirection = getExtremeDirection(marketEvent.eventType);
      const newExtremeCount = marketEvent.isExtreme
        ? state.extremeConsecutiveCount + 1
        : 0;

      const forceCloseQueue = sortForceCloseQueue(updatedAccounts);

      let totalScore = state.totalScore;
      const survivingAccounts = updatedAccounts.filter(a => a.status !== 'liquidated');
      if (survivingAccounts.length > 0) {
        totalScore += GAME_CONFIG.SCORE_PER_ROUND_SURVIVE;
      }

      return {
        ...state,
        currentRound: nextRound,
        timeRemaining: GAME_CONFIG.TIME_PER_ROUND,
        accounts: updatedAccounts,
        marketEvents: [...state.marketEvents, marketEvent],
        forceCloseQueue,
        totalScore,
        extremeConsecutiveCount: newExtremeCount,
        lastExtremeDirection: extremeDirection,
        selectedAccountId: null,
      };
    }

    case 'SELECT_ACCOUNT': {
      return { ...state, selectedAccountId: action.payload };
    }

    case 'ADD_MARGIN': {
      const { accountId, amount } = action.payload;
      const account = state.accounts.find(a => a.id === accountId);
      
      if (!account || account.status === 'liquidated') {
        return state;
      }

      if (!canAddMargin(account, amount)) {
        const log = {
          id: generateId(),
          roundNumber: state.currentRound,
          type: 'add_margin' as const,
          accountId,
          accountName: account.name,
          amount,
          operator: 'player' as const,
          reason: '资金不足，操作失败',
          result: 'failed' as const,
          scoreChange: 0,
          timestamp: Date.now(),
        };
        return {
          ...state,
          operationLogs: [...state.operationLogs, log],
        };
      }

      const evaluation = evaluateOperation(account, 'add_margin', amount);

      const updatedAccounts = state.accounts.map(acc => {
        if (acc.id !== accountId) return acc;
        
        const newTotalCapital = acc.totalCapital + amount;
        const newAvailableCapital = acc.availableCapital - amount;
        const newEquity = acc.equity + amount;
        const newRiskLevel = calculateRiskLevel({
          ...acc, totalCapital: newTotalCapital, equity: newEquity });
        const newStatus = getAccountStatus(newRiskLevel);

        return {
          ...acc,
          totalCapital: newTotalCapital,
          availableCapital: newAvailableCapital,
          equity: newEquity,
          riskLevel: newRiskLevel,
          status: newStatus,
        };
      });

      const log = {
        id: generateId(),
        roundNumber: state.currentRound,
        type: 'add_margin' as const,
        accountId,
        accountName: account.name,
        amount,
        operator: 'player' as const,
        reason: evaluation.reason,
        result: 'success' as const,
        scoreChange: evaluation.scoreChange,
        timestamp: Date.now(),
      };

      const forceCloseQueue = sortForceCloseQueue(updatedAccounts);

      return {
        ...state,
        accounts: updatedAccounts,
        operationLogs: [...state.operationLogs, log],
        totalScore: state.totalScore + evaluation.scoreChange,
        forceCloseQueue,
        selectedAccountId: null,
      };
    }

    case 'PARTIAL_CLOSE': {
      const { accountId, volume } = action.payload;
      const account = state.accounts.find(a => a.id === accountId);
      
      if (!account || account.status === 'liquidated' || account.positions.length === 0) {
        return state;
      }

      const evaluation = evaluateOperation(account, 'partial_close');

      const positionToClose = account.positions[0];
      const closeVolume = Math.min(volume, positionToClose.volume);
      const realizedPnL = positionToClose.unrealizedPnL * (closeVolume / positionToClose.volume);

      const updatedAccounts = state.accounts.map(acc => {
        if (acc.id !== accountId) return acc;

        const newPositions = acc.positions.map(pos => {
          if (pos.id !== positionToClose.id) return pos;
          const newVolume = pos.volume - closeVolume;
          if (newVolume <= 0) return null;
          return { ...pos, volume: newVolume };
        }).filter(Boolean) as any[];

        const newTotalCapital = acc.totalCapital + realizedPnL;
        const newAvailableCapital = acc.availableCapital + realizedPnL + (positionToClose.marginRequired * (closeVolume / positionToClose.volume));
        const unrealizedPnL = calculateTotalUnrealizedPnL(newPositions);
        const marginBalance = calculateTotalMarginRequired(newPositions);
        const equity = calculateEquity({ ...acc, totalCapital: newTotalCapital, unrealizedPnL });
        const riskLevel = calculateRiskLevel({ ...acc, positions: newPositions, totalCapital: newTotalCapital, unrealizedPnL, equity });
        const status = getAccountStatus(riskLevel);

        return {
          ...acc,
          positions: newPositions,
          totalCapital: newTotalCapital,
          availableCapital: newAvailableCapital,
          unrealizedPnL,
          marginBalance,
          equity,
          riskLevel,
          status,
        };
      });

      const log = {
        id: generateId(),
        roundNumber: state.currentRound,
        type: 'partial_close' as const,
        accountId,
        accountName: account.name,
        amount: closeVolume,
        operator: 'player' as const,
        reason: evaluation.reason,
        result: 'success' as const,
        scoreChange: evaluation.scoreChange,
        timestamp: Date.now(),
      };

      const forceCloseQueue = sortForceCloseQueue(updatedAccounts);

      return {
        ...state,
        accounts: updatedAccounts,
        operationLogs: [...state.operationLogs, log],
        totalScore: state.totalScore + evaluation.scoreChange,
        forceCloseQueue,
        selectedAccountId: null,
      };
    }

    case 'FULL_CLOSE': {
      const { accountId } = action.payload;
      const account = state.accounts.find(a => a.id === accountId);
      
      if (!account || account.status === 'liquidated') {
        return state;
      }

      const evaluation = evaluateOperation(account, 'full_close');
      const totalPnL = account.unrealizedPnL;

      const updatedAccounts = state.accounts.map(acc => {
        if (acc.id !== accountId) return acc;

        const newTotalCapital = acc.totalCapital + totalPnL;
        const newAvailableCapital = acc.availableCapital + acc.marginBalance + totalPnL;

        return {
          ...acc,
          positions: [],
          totalCapital: newTotalCapital,
          availableCapital: newAvailableCapital,
          unrealizedPnL: 0,
          marginBalance: 0,
          equity: newTotalCapital,
          riskLevel: 0,
          status: 'normal' as const,
        };
      });

      const log = {
        id: generateId(),
        roundNumber: state.currentRound,
        type: 'full_close' as const,
        accountId,
        accountName: account.name,
        operator: 'player' as const,
        reason: evaluation.reason,
        result: 'success' as const,
        scoreChange: evaluation.scoreChange,
        timestamp: Date.now(),
      };

      const forceCloseQueue = sortForceCloseQueue(updatedAccounts);

      return {
        ...state,
        accounts: updatedAccounts,
        operationLogs: [...state.operationLogs, log],
        totalScore: state.totalScore + evaluation.scoreChange,
        forceCloseQueue,
        selectedAccountId: null,
      };
    }

    case 'SKIP_OPERATION': {
      const evaluation = evaluateOperation(
        state.accounts[0],
        'skip'
      );

      const log = {
        id: generateId(),
        roundNumber: state.currentRound,
        type: 'skip' as const,
        accountId: '',
        accountName: '',
        operator: 'player' as const,
        reason: evaluation.reason,
        result: 'success' as const,
        scoreChange: evaluation.scoreChange,
        timestamp: Date.now(),
      };

      return {
        ...state,
        operationLogs: [...state.operationLogs, log],
        totalScore: state.totalScore + evaluation.scoreChange,
        selectedAccountId: null,
      };
    }

    case 'SYSTEM_AUTO_PROCESS': {
      return processTimeout(state);
    }

    default:
      return state;
  }
};

const processTimeout = (state: GameState): GameState => {
  if (state.forceCloseQueue.length === 0) {
    const log = {
      id: generateId(),
      roundNumber: state.currentRound,
      type: 'skip' as const,
      accountId: '',
      accountName: '',
      operator: 'system' as const,
      reason: '操作超时',
      result: 'success' as const,
      scoreChange: GAME_CONFIG.SCORE_TIMEOUT,
      timestamp: Date.now(),
    };

    return {
      ...state,
      operationLogs: [...state.operationLogs, log],
      totalScore: state.totalScore + GAME_CONFIG.SCORE_TIMEOUT,
    };
  }

  const accountToLiquidate = state.forceCloseQueue[0];
  const totalPnL = accountToLiquidate.unrealizedPnL;

  const updatedAccounts = state.accounts.map(acc => {
    if (acc.id !== accountToLiquidate.id) return acc;

    const newTotalCapital = acc.totalCapital + totalPnL;
    const newAvailableCapital = Math.max(0, acc.availableCapital + acc.marginBalance + totalPnL);

    return {
      ...acc,
      positions: [],
      totalCapital: newTotalCapital,
      availableCapital: newAvailableCapital,
      unrealizedPnL: 0,
      marginBalance: 0,
      equity: newTotalCapital,
      riskLevel: 0,
      status: 'liquidated' as const,
    };
  });

  const liquidationRecord = {
    id: generateId(),
    accountId: accountToLiquidate.id,
    accountName: accountToLiquidate.name,
    roundNumber: state.currentRound,
    reason: '操作超时，系统自动强平',
    lossAmount: Math.abs(totalPnL),
    positionsClosed: [...accountToLiquidate.positions],
    timestamp: Date.now(),
  };

  const log = {
    id: generateId(),
    roundNumber: state.currentRound,
    type: 'auto_liquidate' as const,
    accountId: accountToLiquidate.id,
    accountName: accountToLiquidate.name,
    operator: 'system' as const,
    reason: '操作超时，系统自动强平',
    result: 'success' as const,
    scoreChange: GAME_CONFIG.SCORE_TIMEOUT,
    timestamp: Date.now(),
  };

  const forceCloseQueue = sortForceCloseQueue(updatedAccounts);
  const allLiquidated = updatedAccounts.every(a => a.status === 'liquidated');

  return {
    ...state,
    accounts: updatedAccounts,
    operationLogs: [...state.operationLogs, log],
    liquidationRecords: [...state.liquidationRecords, liquidationRecord],
    forceCloseQueue,
    totalScore: state.totalScore + GAME_CONFIG.SCORE_TIMEOUT,
    status: allLiquidated ? 'settled' : state.status,
  };
};
